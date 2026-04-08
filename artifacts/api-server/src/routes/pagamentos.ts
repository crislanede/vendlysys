import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, agendamentosTable, clientesTable, empresasTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function webhookUrl(): string {
  const domain = process.env.REPLIT_DOMAINS || "";
  return `https://${domain}/api/pagamentos/webhook`;
}

async function mpFetch(path: string, options?: RequestInit, customToken?: string | null) {
  const token = customToken || process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Token do Mercado Pago não configurado. Acesse Configurações e informe seu token MP.");
  return fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
}

async function getMpToken(empresa_id: number): Promise<string | null> {
  const [emp] = await db
    .select({ mp_access_token: empresasTable.mp_access_token })
    .from(empresasTable)
    .where(eq(empresasTable.id, empresa_id));
  return emp?.mp_access_token || process.env.MERCADOPAGO_ACCESS_TOKEN || null;
}

async function marcarAgendamentoPago(agendamentoId: number, forma: string) {
  await db
    .update(agendamentosTable)
    .set({ pago: true, forma_pagamento: forma, status: "concluido" })
    .where(eq(agendamentosTable.id, agendamentoId));
}

/* ─────────────────────────────────────────────
   PIX — Cria pagamento PIX no Mercado Pago
───────────────────────────────────────────── */
router.post("/pagamentos/criar-pix", requireAuth, async (req, res) => {
  try {
    const { agendamento_id } = req.body as { agendamento_id?: number };
    const empresa_id: number = (req as any).usuario.empresa_id;

    if (!agendamento_id) {
      return res.status(400).json({ error: "agendamento_id obrigatório" });
    }

    const [ag] = await db
      .select()
      .from(agendamentosTable)
      .where(eq(agendamentosTable.id, agendamento_id));

    if (!ag || ag.empresa_id !== empresa_id) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    const valorBody = req.body.valor ? Number(req.body.valor) : null;
    const valor = valorBody && valorBody > 0 ? valorBody : Number(ag.valor);
    if (!valor || valor <= 0) {
      return res.status(400).json({ error: "Informe o valor do atendimento antes de cobrar" });
    }

    if (valorBody && valorBody > 0 && valorBody !== Number(ag.valor)) {
      await db.update(agendamentosTable).set({ valor: String(valorBody) }).where(eq(agendamentosTable.id, agendamento_id));
    }

    const [empresa] = await db
      .select({ nome: empresasTable.nome })
      .from(empresasTable)
      .where(eq(empresasTable.id, empresa_id));

    let payerEmail = "cliente@vendlysys.com";
    if (ag.cliente_id) {
      const [cli] = await db
        .select({ email: clientesTable.email })
        .from(clientesTable)
        .where(eq(clientesTable.id, ag.cliente_id));
      if (cli?.email) payerEmail = cli.email;
    }

    const mpToken = await getMpToken(empresa_id);
    if (!mpToken) {
      return res.status(400).json({ error: "Token do Mercado Pago não configurado. Acesse Configurações e informe seu Token MP." });
    }

    const idempotencyKey = `pix-ag-${agendamento_id}-${Date.now()}`;
    const body = {
      transaction_amount: valor,
      description: `${ag.servico} — ${empresa?.nome ?? "Estabelecimento"}`,
      payment_method_id: "pix",
      payer: { email: payerEmail },
      external_reference: String(agendamento_id),
      notification_url: webhookUrl(),
    };

    const mpRes = await mpFetch("/v1/payments", {
      method: "POST",
      headers: { "X-Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    }, mpToken);

    const mpData: any = await mpRes.json();

    if (!mpRes.ok) {
      return res.status(502).json({ error: "Erro ao criar pagamento no Mercado Pago", details: mpData });
    }

    const paymentId = String(mpData.id);
    const qrCode: string = mpData.point_of_interaction?.transaction_data?.qr_code ?? "";
    const qrCodeBase64: string = mpData.point_of_interaction?.transaction_data?.qr_code_base64 ?? "";

    await db
      .update(agendamentosTable)
      .set({ mp_payment_id: paymentId })
      .where(eq(agendamentosTable.id, agendamento_id));

    return res.json({
      payment_id: paymentId,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      status: mpData.status,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Erro interno" });
  }
});

/* ─────────────────────────────────────────────
   CARTÃO — Cria preferência Checkout Pro
───────────────────────────────────────────── */
router.post("/pagamentos/criar-cartao", requireAuth, async (req, res) => {
  try {
    const { agendamento_id, tipo } = req.body as { agendamento_id?: number; tipo?: string };
    const empresa_id: number = (req as any).usuario.empresa_id;

    if (!agendamento_id) {
      return res.status(400).json({ error: "agendamento_id obrigatório" });
    }

    const [ag] = await db
      .select()
      .from(agendamentosTable)
      .where(eq(agendamentosTable.id, agendamento_id));

    if (!ag || ag.empresa_id !== empresa_id) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    const valorBody = req.body.valor ? Number(req.body.valor) : null;
    const valor = valorBody && valorBody > 0 ? valorBody : Number(ag.valor);
    if (!valor || valor <= 0) {
      return res.status(400).json({ error: "Informe o valor do atendimento antes de cobrar" });
    }

    if (valorBody && valorBody > 0 && valorBody !== Number(ag.valor)) {
      await db.update(agendamentosTable).set({ valor: String(valorBody) }).where(eq(agendamentosTable.id, agendamento_id));
    }

    const [empresa] = await db
      .select({ nome: empresasTable.nome })
      .from(empresasTable)
      .where(eq(empresasTable.id, empresa_id));

    let payerEmail = "cliente@vendlysys.com";
    if (ag.cliente_id) {
      const [cli] = await db
        .select({ email: clientesTable.email })
        .from(clientesTable)
        .where(eq(clientesTable.id, ag.cliente_id));
      if (cli?.email) payerEmail = cli.email;
    }

    const isDebito = tipo === "cartao_debito";

    const paymentMethods: any = {
      excluded_payment_types: [
        { id: "ticket" },
        { id: "atm" },
        { id: "bank_transfer" },
      ],
    };

    if (isDebito) {
      paymentMethods.excluded_payment_types.push({ id: "credit_card" });
      paymentMethods.installments = 1;
    } else {
      paymentMethods.excluded_payment_types.push({ id: "debit_card" });
      paymentMethods.installments = 12;
      paymentMethods.default_installments = 1;
    }

    const domain = process.env.REPLIT_DOMAINS || "";
    const baseUrl = `https://${domain}`;

    const preferenceBody = {
      items: [
        {
          id: `ag-${agendamento_id}`,
          title: ag.servico,
          description: `${empresa?.nome ?? "Estabelecimento"} — ${ag.data}`,
          quantity: 1,
          unit_price: valor,
          currency_id: "BRL",
        },
      ],
      payer: { email: payerEmail },
      payment_methods: paymentMethods,
      external_reference: String(agendamento_id),
      notification_url: webhookUrl(),
      back_urls: {
        success: `${baseUrl}/agendamentos`,
        failure: `${baseUrl}/agendamentos`,
        pending: `${baseUrl}/agendamentos`,
      },
      auto_return: "approved",
    };

    const mpToken = await getMpToken(empresa_id);
    if (!mpToken) {
      return res.status(400).json({ error: "Token do Mercado Pago não configurado. Acesse Configurações e informe seu Token MP." });
    }

    const mpRes = await mpFetch("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify(preferenceBody),
    }, mpToken);

    const mpData: any = await mpRes.json();

    if (!mpRes.ok) {
      return res.status(502).json({ error: "Erro ao criar preferência no Mercado Pago", details: mpData });
    }

    const preferenceId: string = mpData.id;
    const checkoutUrl: string = mpData.init_point;

    await db
      .update(agendamentosTable)
      .set({ mp_preference_id: preferenceId })
      .where(eq(agendamentosTable.id, agendamento_id));

    return res.json({
      preference_id: preferenceId,
      checkout_url: checkoutUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Erro interno" });
  }
});

/* ─────────────────────────────────────────────
   STATUS PIX — Consulta pagamento pelo payment_id
───────────────────────────────────────────── */
router.get("/pagamentos/status/:payment_id", requireAuth, async (req, res) => {
  try {
    const { payment_id } = req.params;
    const empresa_id: number = (req as any).usuario.empresa_id;

    const [ag] = await db
      .select({ id: agendamentosTable.id, pago: agendamentosTable.pago })
      .from(agendamentosTable)
      .where(eq(agendamentosTable.mp_payment_id, payment_id));

    if (ag?.pago) {
      return res.json({ status: "approved", payment_id });
    }

    const mpToken = await getMpToken(empresa_id);
    const mpRes = await mpFetch(`/v1/payments/${payment_id}`, undefined, mpToken);
    const mpData: any = await mpRes.json();

    if (!mpRes.ok) {
      return res.status(502).json({ error: "Erro ao consultar pagamento", details: mpData });
    }

    if (mpData.status === "approved" && ag) {
      await marcarAgendamentoPago(ag.id, "pix");
    }

    return res.json({ status: mpData.status, payment_id });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Erro interno" });
  }
});

/* ─────────────────────────────────────────────
   STATUS CARTÃO — Consulta por agendamento_id
   (busca pagamentos via external_reference)
───────────────────────────────────────────── */
router.get("/pagamentos/status-cartao/:agendamento_id", requireAuth, async (req, res) => {
  try {
    const agendamento_id = Number(req.params.agendamento_id);
    const empresa_id: number = (req as any).usuario.empresa_id;

    const [ag] = await db
      .select({ id: agendamentosTable.id, pago: agendamentosTable.pago })
      .from(agendamentosTable)
      .where(eq(agendamentosTable.id, agendamento_id));

    if (!ag || ag.pago) {
      return res.json({ status: ag?.pago ? "approved" : "not_found" });
    }

    const mpToken = await getMpToken(empresa_id);
    const mpRes = await mpFetch(
      `/v1/payments/search?external_reference=${agendamento_id}&status=approved&limit=1`,
      undefined,
      mpToken
    );
    const mpData: any = await mpRes.json();

    if (!mpRes.ok) {
      return res.status(502).json({ error: "Erro ao consultar pagamento", details: mpData });
    }

    const payments: any[] = mpData.results ?? [];
    if (payments.length > 0 && payments[0].status === "approved") {
      const forma = payments[0].payment_type_id === "debit_card" ? "cartao_debito" : "cartao_credito";
      await marcarAgendamentoPago(agendamento_id, forma);
      return res.json({ status: "approved" });
    }

    return res.json({ status: "pending" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Erro interno" });
  }
});

/* ─────────────────────────────────────────────
   WEBHOOK — Recebe notificações do Mercado Pago
───────────────────────────────────────────── */
router.post("/pagamentos/webhook", async (req, res) => {
  try {
    const body = req.body as any;
    const type: string = body?.type ?? body?.action ?? "";
    const paymentId: string = body?.data?.id ? String(body.data.id) : "";

    if (type !== "payment" || !paymentId) {
      return res.status(200).json({ received: true });
    }

    // Lookup agendamento to find empresa_id and get correct token
    const [agByPaymentId] = await db
      .select({ id: agendamentosTable.id, empresa_id: agendamentosTable.empresa_id })
      .from(agendamentosTable)
      .where(eq(agendamentosTable.mp_payment_id, paymentId));

    const webhookToken = agByPaymentId
      ? await getMpToken(agByPaymentId.empresa_id)
      : process.env.MERCADOPAGO_ACCESS_TOKEN;

    const mpRes = await mpFetch(`/v1/payments/${paymentId}`, undefined, webhookToken);
    if (!mpRes.ok) return res.status(200).json({ received: true });

    const mpData: any = await mpRes.json();

    if (mpData.status === "approved") {
      const externalRef = mpData.external_reference ? Number(mpData.external_reference) : null;

      if (mpData.payment_method_id === "pix") {
        await db
          .update(agendamentosTable)
          .set({ pago: true, forma_pagamento: "pix", status: "concluido" })
          .where(eq(agendamentosTable.mp_payment_id, paymentId));
      } else if (externalRef) {
        const forma = mpData.payment_type_id === "debit_card" ? "cartao_debito" : "cartao_credito";
        await marcarAgendamentoPago(externalRef, forma);
      }
    }

    return res.status(200).json({ received: true });
  } catch {
    return res.status(200).json({ received: true });
  }
});

export default router;
