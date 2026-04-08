import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, empresasTable, assinaturasTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const VALOR_PLANO = 50.0;
const CARENCIA_MESES = 3;

function webhookUrl(): string {
  const domain = process.env.REPLIT_DOMAINS || "";
  return `https://${domain}/api/assinatura/webhook`;
}

async function mpFetch(path: string, options?: RequestInit) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  return fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/* ─────────────────────────────────────────────
   GET /api/assinatura — status atual
───────────────────────────────────────────── */
router.get("/assinatura", requireAuth, async (req, res) => {
  try {
    const empresa_id: number = (req as any).usuario.empresa_id;

    const [empresa] = await db
      .select({
        plano_status: empresasTable.plano_status,
        plano_expira_em: empresasTable.plano_expira_em,
        plano_inicio_em: empresasTable.plano_inicio_em,
        termos_aceitos_em: empresasTable.termos_aceitos_em,
      })
      .from(empresasTable)
      .where(eq(empresasTable.id, empresa_id));

    const [ultima] = await db
      .select()
      .from(assinaturasTable)
      .where(eq(assinaturasTable.empresa_id, empresa_id))
      .orderBy(desc(assinaturasTable.createdAt))
      .limit(1);

    const plano_inicio_em = empresa?.plano_inicio_em ?? null;
    const carencia_fim = plano_inicio_em
      ? addMonths(plano_inicio_em, CARENCIA_MESES)
      : null;
    const em_carencia = carencia_fim ? new Date() < carencia_fim : false;

    return res.json({
      plano_status: empresa?.plano_status ?? "trial",
      plano_expira_em: empresa?.plano_expira_em ?? null,
      plano_inicio_em,
      termos_aceitos_em: empresa?.termos_aceitos_em ?? null,
      carencia_fim,
      em_carencia,
      ultima_assinatura: ultima ?? null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Erro interno" });
  }
});

/* ─────────────────────────────────────────────
   POST /api/assinatura/aceitar-termos
───────────────────────────────────────────── */
router.post("/assinatura/aceitar-termos", requireAuth, async (req, res) => {
  try {
    const empresa_id: number = (req as any).usuario.empresa_id;
    await db
      .update(empresasTable)
      .set({ termos_aceitos_em: new Date() })
      .where(eq(empresasTable.id, empresa_id));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Erro interno" });
  }
});

/* ─────────────────────────────────────────────
   POST /api/assinatura/cancelar — cancela plano
───────────────────────────────────────────── */
router.post("/assinatura/cancelar", requireAuth, async (req, res) => {
  try {
    const empresa_id: number = (req as any).usuario.empresa_id;

    const [empresa] = await db
      .select({ plano_inicio_em: empresasTable.plano_inicio_em, plano_status: empresasTable.plano_status })
      .from(empresasTable)
      .where(eq(empresasTable.id, empresa_id));

    if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

    if (empresa.plano_status === "vitalicio") {
      return res.status(400).json({ error: "Planos vitalícios não podem ser cancelados." });
    }

    if (empresa.plano_inicio_em) {
      const carencia_fim = addMonths(empresa.plano_inicio_em, CARENCIA_MESES);
      if (new Date() < carencia_fim) {
        return res.status(400).json({
          error: "Dentro do período de carência",
          carencia_fim,
          mensagem: `Seu plano está em período de carência de ${CARENCIA_MESES} meses. O cancelamento só é possível após ${carencia_fim.toLocaleDateString("pt-BR")}.`,
        });
      }
    }

    await db
      .update(empresasTable)
      .set({ plano_status: "inativo", plano_expira_em: new Date() })
      .where(eq(empresasTable.id, empresa_id));

    return res.json({ ok: true, mensagem: "Assinatura cancelada com sucesso." });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Erro interno" });
  }
});

/* ─────────────────────────────────────────────
   POST /api/assinatura/criar-pix — gera cobrança
───────────────────────────────────────────── */
router.post("/assinatura/criar-pix", requireAuth, async (req, res) => {
  try {
    const empresa_id: number = (req as any).usuario.empresa_id;
    const usuario_email: string = (req as any).usuario.email ?? "assinante@vendlysys.com";

    const [empresa] = await db
      .select({ nome: empresasTable.nome, termos_aceitos_em: empresasTable.termos_aceitos_em })
      .from(empresasTable)
      .where(eq(empresasTable.id, empresa_id));

    if (!empresa?.termos_aceitos_em) {
      return res.status(403).json({ error: "Você precisa aceitar os Termos de Uso antes de assinar." });
    }

    const agora = new Date();
    const competencia = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;

    const [assinatura] = await db
      .insert(assinaturasTable)
      .values({
        empresa_id,
        valor: String(VALOR_PLANO),
        status: "pending",
        competencia,
      })
      .returning();

    const idempotencyKey = `assinatura-${empresa_id}-${assinatura.id}-${Date.now()}`;

    const body = {
      transaction_amount: VALOR_PLANO,
      description: `VendlySys — Assinatura Mensal (${competencia})`,
      payment_method_id: "pix",
      payer: { email: usuario_email },
      external_reference: `assinatura:${empresa_id}:${assinatura.id}`,
      notification_url: webhookUrl(),
    };

    const mpRes = await mpFetch("/v1/payments", {
      method: "POST",
      headers: { "X-Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    });

    const mpData: any = await mpRes.json();

    if (!mpRes.ok) {
      await db
        .update(assinaturasTable)
        .set({ status: "error" })
        .where(eq(assinaturasTable.id, assinatura.id));
      return res.status(502).json({ error: "Erro ao criar PIX no Mercado Pago", details: mpData });
    }

    const paymentId = String(mpData.id);
    const qrCodeText: string =
      mpData.point_of_interaction?.transaction_data?.qr_code ?? "";
    const qrCodeBase64: string =
      mpData.point_of_interaction?.transaction_data?.qr_code_base64 ?? "";

    await db
      .update(assinaturasTable)
      .set({
        payment_id: paymentId,
        qr_code: qrCodeBase64,
        qr_code_text: qrCodeText,
        status: "pending",
      })
      .where(eq(assinaturasTable.id, assinatura.id));

    return res.json({
      assinatura_id: assinatura.id,
      payment_id: paymentId,
      qr_code: qrCodeText,
      qr_code_base64: qrCodeBase64,
      valor: VALOR_PLANO,
      status: mpData.status,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Erro interno" });
  }
});

/* ─────────────────────────────────────────────
   GET /api/assinatura/verificar/:payment_id — consulta status
───────────────────────────────────────────── */
router.get("/assinatura/verificar/:payment_id", requireAuth, async (req, res) => {
  try {
    const empresa_id: number = (req as any).usuario.empresa_id;
    const { payment_id } = req.params;

    const mpRes = await mpFetch(`/v1/payments/${payment_id}`);
    const mpData: any = await mpRes.json();

    if (!mpRes.ok) {
      return res.status(502).json({ error: "Erro ao consultar pagamento" });
    }

    if (mpData.status === "approved") {
      const [assinatura] = await db
        .select()
        .from(assinaturasTable)
        .where(eq(assinaturasTable.payment_id, payment_id))
        .limit(1);

      if (assinatura && assinatura.status !== "paid") {
        await db
          .update(assinaturasTable)
          .set({ status: "paid", pago_em: new Date() })
          .where(eq(assinaturasTable.id, assinatura.id));

        const expira = new Date();
        expira.setDate(expira.getDate() + 30);

        const [emp] = await db.select({ plano_inicio_em: empresasTable.plano_inicio_em }).from(empresasTable).where(eq(empresasTable.id, empresa_id));
        const updates: any = { plano_status: "ativo", plano_expira_em: expira };
        if (!emp?.plano_inicio_em) updates.plano_inicio_em = new Date();

        await db
          .update(empresasTable)
          .set(updates)
          .where(eq(empresasTable.id, empresa_id));
      }
    }

    return res.json({ status: mpData.status });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Erro interno" });
  }
});

/* ─────────────────────────────────────────────
   POST /api/assinatura/webhook — confirmação MP
───────────────────────────────────────────── */
router.post("/assinatura/webhook", async (req, res) => {
  try {
    const { type, data } = req.body as { type?: string; data?: { id?: string } };

    if (type !== "payment" || !data?.id) {
      return res.sendStatus(200);
    }

    const mpRes = await mpFetch(`/v1/payments/${data.id}`);
    const mpData: any = await mpRes.json();

    if (mpData.status !== "approved") {
      return res.sendStatus(200);
    }

    const ref: string = mpData.external_reference ?? "";
    if (!ref.startsWith("assinatura:")) {
      return res.sendStatus(200);
    }

    const parts = ref.split(":");
    const empresaId = Number(parts[1]);
    const assinaturaId = Number(parts[2]);

    if (!empresaId || !assinaturaId) return res.sendStatus(200);

    const [assinatura] = await db
      .select()
      .from(assinaturasTable)
      .where(eq(assinaturasTable.id, assinaturaId))
      .limit(1);

    if (!assinatura || assinatura.status === "paid") {
      return res.sendStatus(200);
    }

    await db
      .update(assinaturasTable)
      .set({ status: "paid", pago_em: new Date() })
      .where(eq(assinaturasTable.id, assinaturaId));

    const expira = new Date();
    expira.setDate(expira.getDate() + 30);

    const [emp] = await db.select({ plano_inicio_em: empresasTable.plano_inicio_em }).from(empresasTable).where(eq(empresasTable.id, empresaId));
    const updates: any = { plano_status: "ativo", plano_expira_em: expira };
    if (!emp?.plano_inicio_em) updates.plano_inicio_em = new Date();

    await db
      .update(empresasTable)
      .set(updates)
      .where(eq(empresasTable.id, empresaId));

    return res.sendStatus(200);
  } catch {
    return res.sendStatus(200);
  }
});

/* ─────────────────────────────────────────────
   POST /api/assinatura/admin/set-vitalicio
   Protegido por X-Admin-Secret header
───────────────────────────────────────────── */
router.post("/assinatura/admin/set-vitalicio", async (req, res) => {
  try {
    const secret = process.env.VENDLYSYS_ADMIN_SECRET;
    if (!secret || req.headers["x-admin-secret"] !== secret) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { empresa_id } = req.body as { empresa_id?: number };
    if (!empresa_id || typeof empresa_id !== "number") {
      return res.status(400).json({ error: "empresa_id obrigatório" });
    }

    const [empresa] = await db
      .update(empresasTable)
      .set({ plano_status: "vitalicio", plano_expira_em: null })
      .where(eq(empresasTable.id, empresa_id))
      .returning({ id: empresasTable.id, nome: empresasTable.nome, plano_status: empresasTable.plano_status });

    if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

    return res.json({ ok: true, empresa });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Erro interno" });
  }
});

export default router;
