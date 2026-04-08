import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, clientesTable, agendamentosTable, empresasTable, servicosTable, usuariosTable, profissionaisTable } from "@workspace/db";
import { signToken, verifyToken } from "./auth";
import { temConflitoProfissional } from "../lib/conflito";
import jwt from "jsonwebtoken";

async function enviarPushParaEmpresa(empresa_id: number, titulo: string, corpo: string) {
  try {
    const usuarios = await db
      .select({ push_token: usuariosTable.push_token })
      .from(usuariosTable)
      .where(and(eq(usuariosTable.empresa_id, empresa_id), sql`${usuariosTable.push_token} IS NOT NULL`));
    const tokens = usuarios.map((u) => u.push_token).filter(Boolean) as string[];
    if (tokens.length === 0) return;
    const messages = tokens.map((t) => ({
      to: t,
      sound: "default",
      title: titulo,
      body: corpo,
    }));
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-Encoding": "gzip, deflate" },
      body: JSON.stringify(messages),
    });
  } catch {}
}

const JWT_SECRET = process.env.SESSION_SECRET ?? "vendlysys-secret-2024";

const router: IRouter = Router();

function requirePortalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload || payload.tipo !== "portal") {
    res.status(401).json({ error: "Token inválido" });
    return;
  }
  (req as any).portalCliente = payload;
  next();
}

router.get("/portal/empresa/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const [empresa] = await db
    .select({
      id: empresasTable.id,
      nome: empresasTable.nome,
      slug: empresasTable.slug,
      telefone: empresasTable.telefone,
      endereco: empresasTable.endereco,
      logo_url: empresasTable.logo_url,
      cor_primaria: empresasTable.cor_primaria,
      descricao: empresasTable.descricao,
      horario_funcionamento: empresasTable.horario_funcionamento,
      instagram: empresasTable.instagram,
      whatsapp: empresasTable.whatsapp,
      chave_pix: empresasTable.chave_pix,
      percentual_sinal: empresasTable.percentual_sinal,
      tem_mp: empresasTable.mp_access_token,
      pontos_por_real: empresasTable.pontos_por_real,
      pontos_para_desconto: empresasTable.pontos_para_desconto,
      pontos_valor_desconto: empresasTable.pontos_valor_desconto,
    })
    .from(empresasTable)
    .where(eq(empresasTable.slug, slug));

  if (!empresa) {
    res.status(404).json({ error: "Empresa não encontrada" });
    return;
  }
  res.json({
    ...empresa,
    percentual_sinal: empresa.percentual_sinal ? Number(empresa.percentual_sinal) : null,
    tem_mp: !!(empresa as any).tem_mp,
    pontos_por_real: empresa.pontos_por_real ? Number(empresa.pontos_por_real) : 0,
    pontos_para_desconto: empresa.pontos_para_desconto ?? 100,
    pontos_valor_desconto: empresa.pontos_valor_desconto ? Number(empresa.pontos_valor_desconto) : 10,
  });
});

router.get("/portal/servicos/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const [empresa] = await db
    .select({ id: empresasTable.id })
    .from(empresasTable)
    .where(eq(empresasTable.slug, slug));

  if (!empresa) {
    res.status(404).json({ error: "Empresa não encontrada" });
    return;
  }

  const servicos = await db
    .select()
    .from(servicosTable)
    .where(and(eq(servicosTable.empresa_id, empresa.id), eq(servicosTable.ativo, true)));

  res.json(servicos.map((s) => ({ ...s, valor: Number(s.valor) })));
});

router.get("/portal/profissionais/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const [empresa] = await db
    .select({ id: empresasTable.id })
    .from(empresasTable)
    .where(eq(empresasTable.slug, slug));

  if (!empresa) {
    res.status(404).json({ error: "Empresa não encontrada" });
    return;
  }

  const profs = await db
    .select({
      id: profissionaisTable.id,
      nome: profissionaisTable.nome,
      especialidade: profissionaisTable.especialidade,
    })
    .from(profissionaisTable)
    .where(and(eq(profissionaisTable.empresa_id, empresa.id), eq(profissionaisTable.ativo, true)));

  res.json(profs);
});

router.post("/portal/identificar", async (req, res): Promise<void> => {
  const { slug, telefone, nome, email, data_nascimento, cep, logradouro, numero, complemento, bairro, cidade, estado } = req.body ?? {};

  if (!slug || !telefone || String(telefone).trim().length < 8) {
    res.status(400).json({ error: "Dados inválidos. Informe o telefone." });
    return;
  }

  const [empresa] = await db
    .select()
    .from(empresasTable)
    .where(eq(empresasTable.slug, String(slug)));

  if (!empresa) {
    res.status(404).json({ error: "Empresa não encontrada" });
    return;
  }

  let [cliente] = await db
    .select()
    .from(clientesTable)
    .where(and(eq(clientesTable.empresa_id, empresa.id), eq(clientesTable.telefone, String(telefone).trim())));

  if (!cliente) {
    const nomeStr = nome ? String(nome).trim() : "";
    if (!nomeStr) {
      res.status(404).json({ error: "Telefone não encontrado. Informe seu nome para se cadastrar." });
      return;
    }
    [cliente] = await db
      .insert(clientesTable)
      .values({
        empresa_id: empresa.id,
        nome: nomeStr,
        telefone: String(telefone).trim(),
        email: email ? String(email).trim() : null,
        data_nascimento: data_nascimento ? String(data_nascimento).trim() : null,
        cep: cep ? String(cep).replace(/\D/g, "") : null,
        logradouro: logradouro ? String(logradouro).trim() : null,
        numero: numero ? String(numero).trim() : null,
        complemento: complemento ? String(complemento).trim() : null,
        bairro: bairro ? String(bairro).trim() : null,
        cidade: cidade ? String(cidade).trim() : null,
        estado: estado ? String(estado).trim() : null,
      })
      .returning();
  }

  const token = signToken({ tipo: "portal", cliente_id: cliente.id, empresa_id: empresa.id });

  res.json({
    token,
    cliente: {
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email,
      data_nascimento: cliente.data_nascimento,
      endereco: cliente.endereco,
      cep: cliente.cep,
      logradouro: cliente.logradouro,
      numero: cliente.numero,
      complemento: cliente.complemento,
      bairro: cliente.bairro,
      cidade: cliente.cidade,
      estado: cliente.estado,
      pontos: cliente.pontos ?? 0,
    },
    empresa: {
      id: empresa.id,
      nome: empresa.nome,
      logo_url: empresa.logo_url,
      cor_primaria: empresa.cor_primaria,
    },
  });
});

router.get("/portal/meus-agendamentos", requirePortalAuth, async (req, res): Promise<void> => {
  const { cliente_id, empresa_id } = (req as any).portalCliente;

  const hoje = new Date().toISOString().slice(0, 10);
  await db.update(agendamentosTable)
    .set({ sinal_pago: "expirado" })
    .where(and(
      eq(agendamentosTable.cliente_id, cliente_id),
      eq(agendamentosTable.empresa_id, empresa_id),
      eq(agendamentosTable.sinal_pago, "creditado"),
      sql`${agendamentosTable.sinal_expira_em} < ${hoje}`
    ));

  const agendamentos = await db
    .select({
      id: agendamentosTable.id,
      empresa_id: agendamentosTable.empresa_id,
      cliente_id: agendamentosTable.cliente_id,
      profissional_id: agendamentosTable.profissional_id,
      profissional_nome: profissionaisTable.nome,
      servico: agendamentosTable.servico,
      data: agendamentosTable.data,
      hora_inicio: agendamentosTable.hora_inicio,
      hora_fim: agendamentosTable.hora_fim,
      valor: agendamentosTable.valor,
      status: agendamentosTable.status,
      forma_pagamento: agendamentosTable.forma_pagamento,
      pago: agendamentosTable.pago,
      observacoes: agendamentosTable.observacoes,
      mp_payment_id: agendamentosTable.mp_payment_id,
      mp_preference_id: agendamentosTable.mp_preference_id,
      sinal_pago: agendamentosTable.sinal_pago,
      sinal_valor: agendamentosTable.sinal_valor,
      sinal_mp_payment_id: agendamentosTable.sinal_mp_payment_id,
      sinal_pix_code: agendamentosTable.sinal_pix_code,
      sinal_expira_em: agendamentosTable.sinal_expira_em,
      createdAt: agendamentosTable.createdAt,
    })
    .from(agendamentosTable)
    .leftJoin(profissionaisTable, eq(agendamentosTable.profissional_id, profissionaisTable.id))
    .where(and(eq(agendamentosTable.cliente_id, cliente_id), eq(agendamentosTable.empresa_id, empresa_id)))
    .orderBy(desc(agendamentosTable.data), agendamentosTable.hora_inicio);

  res.json(agendamentos);
});

router.post("/portal/agendar", requirePortalAuth, async (req, res): Promise<void> => {
  const { cliente_id, empresa_id } = (req as any).portalCliente;
  const { servico, data, hora_inicio, hora_fim, observacoes, servico_id, profissional_id } = req.body ?? {};

  if (!servico || !data || !hora_inicio) {
    res.status(400).json({ error: "Serviço, data e hora são obrigatórios." });
    return;
  }

  const [empresa] = await db.select({
    percentual_sinal: empresasTable.percentual_sinal,
    mp_access_token: empresasTable.mp_access_token,
    chave_pix: empresasTable.chave_pix,
    nome: empresasTable.nome,
  }).from(empresasTable).where(eq(empresasTable.id, empresa_id));

  const percentualSinal = empresa?.percentual_sinal ? Number(empresa.percentual_sinal) : 0;

  let valorSinal = 0;
  if (percentualSinal > 0 && servico_id) {
    const [svc] = await db.select({ valor: servicosTable.valor })
      .from(servicosTable)
      .where(eq(servicosTable.id, Number(servico_id)));
    if (svc?.valor) {
      valorSinal = Math.round(Number(svc.valor) * percentualSinal / 100 * 100) / 100;
    }
  }

  const temMetodoPagamento = !!(empresa?.mp_access_token || empresa?.chave_pix);
  const precisaSinal = valorSinal > 0 && temMetodoPagamento;

  let statusInicial = "agendado";
  if (precisaSinal) statusInicial = "aguardando_sinal";

  if (profissional_id) {
    const conflito = await temConflitoProfissional({
      empresa_id,
      profissional_id: Number(profissional_id),
      data: String(data),
      hora_inicio: String(hora_inicio),
      hora_fim: hora_fim ? String(hora_fim) : null,
    });
    if (conflito) {
      res.status(409).json({ error: "Esta profissional já possui um agendamento neste horário. Por favor, escolha outro horário." });
      return;
    }
  }

  const [cli] = await db.select({ nome: clientesTable.nome, email: clientesTable.email }).from(clientesTable).where(eq(clientesTable.id, cliente_id));

  const [agendamento] = await db
    .insert(agendamentosTable)
    .values({
      empresa_id,
      cliente_id,
      profissional_id: profissional_id ? Number(profissional_id) : null,
      servico: String(servico),
      data: String(data),
      hora_inicio: String(hora_inicio),
      hora_fim: hora_fim ? String(hora_fim) : null,
      status: statusInicial,
      observacoes: observacoes ? String(observacoes) : null,
      sinal_pago: precisaSinal ? "nao" : "nao",
      sinal_valor: precisaSinal ? String(valorSinal) : null,
    })
    .returning();

  let pixData: { qr_code?: string; qr_code_base64?: string; mp_payment_id?: string } = {};

  if (precisaSinal && empresa?.mp_access_token) {
    try {
      const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${empresa.mp_access_token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `sinal-${agendamento.id}-${Date.now()}`,
        },
        body: JSON.stringify({
          transaction_amount: valorSinal,
          description: `Sinal de agendamento - ${empresa.nome}`,
          payment_method_id: "pix",
          payer: {
            email: cli?.email ?? `cliente${cliente_id}@vendlysys.app`,
          },
        }),
      });
      const mpJson = await mpRes.json() as any;
      if (mpJson?.id) {
        pixData.mp_payment_id = String(mpJson.id);
        pixData.qr_code = mpJson?.point_of_interaction?.transaction_data?.qr_code;
        pixData.qr_code_base64 = mpJson?.point_of_interaction?.transaction_data?.qr_code_base64;
        await db.update(agendamentosTable)
          .set({ sinal_mp_payment_id: pixData.mp_payment_id, sinal_pix_code: pixData.qr_code ?? null })
          .where(eq(agendamentosTable.id, agendamento.id));
      }
    } catch (_) {}
  }

  const dataFmt = new Date(String(data).slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR");
  enviarPushParaEmpresa(
    empresa_id,
    "📅 Novo agendamento pelo portal",
    `${cli?.nome ?? "Cliente"} agendou ${String(servico)} para ${dataFmt} às ${String(hora_inicio)}`
  );

  res.status(201).json({
    ...agendamento,
    precisaSinal,
    valorSinal,
    percentualSinal,
    chave_pix: precisaSinal && !empresa?.mp_access_token ? empresa?.chave_pix : null,
    pix_qr_code: pixData.qr_code ?? null,
    pix_qr_code_base64: pixData.qr_code_base64 ?? null,
    mp_payment_id: pixData.mp_payment_id ?? null,
  });
});

router.get("/portal/agendamentos/:id/sinal-status", requirePortalAuth, async (req, res): Promise<void> => {
  const { cliente_id, empresa_id } = (req as any).portalCliente;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [ag] = await db.select().from(agendamentosTable)
    .where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.cliente_id, cliente_id), eq(agendamentosTable.empresa_id, empresa_id)));

  if (!ag) { res.status(404).json({ error: "Agendamento não encontrado" }); return; }

  if (ag.sinal_pago === "sim") {
    res.json({ sinal_pago: true, status: ag.status }); return;
  }

  if (ag.sinal_mp_payment_id) {
    const [empresa] = await db.select({ mp_access_token: empresasTable.mp_access_token })
      .from(empresasTable).where(eq(empresasTable.id, empresa_id));

    if (empresa?.mp_access_token) {
      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${ag.sinal_mp_payment_id}`, {
          headers: { "Authorization": `Bearer ${empresa.mp_access_token}` },
        });
        const mpJson = await mpRes.json() as any;
        if (mpJson?.status === "approved") {
          await db.update(agendamentosTable)
            .set({ sinal_pago: "sim", status: "agendado" })
            .where(eq(agendamentosTable.id, id));
          res.json({ sinal_pago: true, status: "agendado" }); return;
        }
      } catch (_) {}
    }
  }

  res.json({ sinal_pago: ag.sinal_pago === "sim", status: ag.status });
});

router.get("/portal/agendamentos/:id/sinal-info", requirePortalAuth, async (req, res): Promise<void> => {
  const { cliente_id, empresa_id } = (req as any).portalCliente;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [ag] = await db.select().from(agendamentosTable)
    .where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.cliente_id, cliente_id), eq(agendamentosTable.empresa_id, empresa_id)));
  if (!ag) { res.status(404).json({ error: "Agendamento não encontrado" }); return; }

  const [empresa] = await db.select({ chave_pix: empresasTable.chave_pix, mp_access_token: empresasTable.mp_access_token, nome: empresasTable.nome })
    .from(empresasTable).where(eq(empresasTable.id, empresa_id));

  let qr_code = ag.sinal_pix_code ?? null;
  let qr_code_base64 = null;

  if (!qr_code && ag.sinal_mp_payment_id && empresa?.mp_access_token) {
    try {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${ag.sinal_mp_payment_id}`, {
        headers: { "Authorization": `Bearer ${empresa.mp_access_token}` },
      });
      const mpJson = await mpRes.json() as any;
      if (mpJson?.point_of_interaction?.transaction_data?.qr_code) {
        qr_code = mpJson.point_of_interaction.transaction_data.qr_code;
        qr_code_base64 = mpJson.point_of_interaction.transaction_data.qr_code_base64 ?? null;
      }
    } catch (_) {}
  }

  if (!qr_code && empresa?.mp_access_token) {
    const valorSinal = ag.sinal_valor ? Number(ag.sinal_valor) : 0;
    if (valorSinal > 0) {
      try {
        const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${empresa.mp_access_token}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": `sinal-retry-${ag.id}-${Date.now()}`,
          },
          body: JSON.stringify({
            transaction_amount: valorSinal,
            description: `Sinal de agendamento - ${empresa.nome}`,
            payment_method_id: "pix",
            payer: { email: `cliente${cliente_id}@vendlysys.app` },
          }),
        });
        const mpJson = await mpRes.json() as any;
        if (mpJson?.id) {
          qr_code = mpJson?.point_of_interaction?.transaction_data?.qr_code ?? null;
          qr_code_base64 = mpJson?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;
          await db.update(agendamentosTable)
            .set({ sinal_mp_payment_id: String(mpJson.id), sinal_pix_code: qr_code })
            .where(eq(agendamentosTable.id, id));
        }
      } catch (_) {}
    }
  }

  res.json({
    valor: ag.sinal_valor ? Number(ag.sinal_valor) : 0,
    chave_pix: (!qr_code && empresa?.chave_pix) ? empresa.chave_pix : null,
    qr_code,
    qr_code_base64,
  });
});

router.put("/portal/agendamentos/:id/cancelar", requirePortalAuth, async (req, res): Promise<void> => {
  const { cliente_id, empresa_id } = (req as any).portalCliente;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [existing] = await db.select().from(agendamentosTable)
    .where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.cliente_id, cliente_id), eq(agendamentosTable.empresa_id, empresa_id)));

  if (!existing) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }

  const sinalFoiPago = existing.sinal_pago === "sim";
  const hoje = new Date();
  const expiraEm = new Date(hoje);
  expiraEm.setDate(expiraEm.getDate() + 30);
  const expiraEmStr = expiraEm.toISOString().slice(0, 10);

  const updates: Record<string, any> = { status: "cancelado" };
  if (sinalFoiPago) {
    updates.sinal_pago = "creditado";
    updates.sinal_expira_em = expiraEmStr;
  }

  const [agendamento] = await db
    .update(agendamentosTable)
    .set(updates)
    .where(eq(agendamentosTable.id, id))
    .returning();

  res.json({ ...agendamento, sinalCreditado: sinalFoiPago, sinalExpiraEm: sinalFoiPago ? expiraEmStr : null });
});

router.put("/portal/agendamentos/:id/confirmar", requirePortalAuth, async (req, res): Promise<void> => {
  const { cliente_id, empresa_id } = (req as any).portalCliente;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [ag] = await db.select().from(agendamentosTable)
    .where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.cliente_id, cliente_id), eq(agendamentosTable.empresa_id, empresa_id)));

  if (!ag) { res.status(404).json({ error: "Agendamento não encontrado" }); return; }
  if (ag.status !== "agendado") { res.status(400).json({ error: `Agendamento com status "${ag.status}" não pode ser confirmado` }); return; }

  const [updated] = await db.update(agendamentosTable)
    .set({ status: "confirmado" })
    .where(eq(agendamentosTable.id, id))
    .returning();

  res.json(updated);
});

router.get("/portal/horarios-disponiveis", async (req, res): Promise<void> => {
  const { slug, data, servico_id } = req.query as Record<string, string>;
  if (!slug || !data || !servico_id) { res.status(400).json({ error: "slug, data e servico_id são obrigatórios" }); return; }

  const [empresa] = await db.select({ id: empresasTable.id }).from(empresasTable).where(eq(empresasTable.slug, slug));
  if (!empresa) { res.status(404).json({ error: "Empresa não encontrada" }); return; }

  const [servico] = await db.select({ duracao_minutos: servicosTable.duracao_minutos })
    .from(servicosTable).where(eq(servicosTable.id, Number(servico_id)));
  if (!servico) { res.status(404).json({ error: "Serviço não encontrado" }); return; }

  const agendamentos = await db
    .select({ hora_inicio: agendamentosTable.hora_inicio, hora_fim: agendamentosTable.hora_fim })
    .from(agendamentosTable)
    .where(and(
      eq(agendamentosTable.empresa_id, empresa.id),
      eq(agendamentosTable.data, data),
      sql`${agendamentosTable.status} != 'cancelado'`
    ));

  function toMin(t: string): number { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

  const duracao = Number(servico.duracao_minutos) || 60;
  const slots: string[] = [];
  for (let h = 8; h < 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      const inicio = h * 60 + m;
      const fim = inicio + duracao;
      if (fim > 20 * 60) break;
      const conflito = agendamentos.some((ag) => {
        if (!ag.hora_inicio) return false;
        const ai = toMin(ag.hora_inicio);
        const af = ag.hora_fim ? toMin(ag.hora_fim) : ai + 60;
        return inicio < af && fim > ai;
      });
      if (!conflito) slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }

  res.json({ horarios: slots, duracao_minutos: duracao });
});

router.put("/portal/agendamentos/:id/reagendar", requirePortalAuth, async (req, res): Promise<void> => {
  const { cliente_id, empresa_id } = (req as any).portalCliente;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const { data, hora_inicio, hora_fim } = req.body ?? {};
  if (!data || !hora_inicio) {
    res.status(400).json({ error: "Data e hora são obrigatórios." });
    return;
  }

  const [existing] = await db.select().from(agendamentosTable)
    .where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.cliente_id, cliente_id), eq(agendamentosTable.empresa_id, empresa_id)));

  if (!existing) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const creditoValido = existing.sinal_pago === "creditado" && existing.sinal_expira_em && existing.sinal_expira_em >= hoje;

  if (existing.sinal_pago === "creditado" && !creditoValido) {
    res.status(400).json({ error: "O crédito do sinal expirou. Não é mais possível reagendar com este crédito." });
    return;
  }

  if (existing.profissional_id) {
    const conflito = await temConflitoProfissional({
      empresa_id,
      profissional_id: existing.profissional_id,
      data: String(data),
      hora_inicio: String(hora_inicio),
      hora_fim: hora_fim ? String(hora_fim) : null,
      excluir_id: id,
    });
    if (conflito) {
      res.status(409).json({ error: "Esta profissional já possui um agendamento neste horário. Por favor, escolha outro horário." });
      return;
    }
  }

  const updates: Record<string, any> = {
    data: String(data),
    hora_inicio: String(hora_inicio),
    hora_fim: hora_fim ? String(hora_fim) : null,
    status: "agendado",
  };

  if (creditoValido) {
    updates.sinal_pago = "sim";
    updates.sinal_expira_em = null;
  }

  const [agendamento] = await db
    .update(agendamentosTable)
    .set(updates)
    .where(eq(agendamentosTable.id, id))
    .returning();

  res.json({ ...agendamento, sinalAplicado: creditoValido });
});

router.put("/portal/meu-perfil", requirePortalAuth, async (req, res): Promise<void> => {
  const { cliente_id, empresa_id } = (req as any).portalCliente;
  const { nome, email, data_nascimento, endereco, cep, logradouro, numero, complemento, bairro, cidade, estado } = req.body ?? {};

  const updates: Record<string, any> = {};
  if (nome && String(nome).trim()) updates.nome = String(nome).trim();
  if (email && String(email).trim()) updates.email = String(email).trim();
  if (data_nascimento !== undefined) updates.data_nascimento = data_nascimento ? String(data_nascimento) : null;
  if (cep !== undefined) updates.cep = cep ? String(cep).replace(/\D/g, "") : null;
  if (logradouro !== undefined) updates.logradouro = logradouro ? String(logradouro).trim() : null;
  if (numero !== undefined) updates.numero = numero ? String(numero).trim() : null;
  if (complemento !== undefined) updates.complemento = complemento ? String(complemento).trim() : null;
  if (bairro !== undefined) updates.bairro = bairro ? String(bairro).trim() : null;
  if (cidade !== undefined) updates.cidade = cidade ? String(cidade).trim() : null;
  if (estado !== undefined) updates.estado = estado ? String(estado).trim() : null;

  // Rebuild the single endereco field from address parts when they are provided
  if (logradouro && numero && bairro && cidade) {
    const endParts = [
      logradouro ? String(logradouro).trim() : "",
      numero ? `nº ${String(numero).trim()}` : "",
      complemento ? String(complemento).trim() : "",
      bairro ? String(bairro).trim() : "",
      cidade ? String(cidade).trim() : "",
      estado ? String(estado).trim() : "",
    ].filter(Boolean);
    updates.endereco = endParts.join(", ");
  } else if (endereco !== undefined) {
    updates.endereco = endereco ? String(endereco) : null;
  }

  const [cliente] = await db
    .update(clientesTable)
    .set(updates)
    .where(and(eq(clientesTable.id, cliente_id), eq(clientesTable.empresa_id, empresa_id)))
    .returning();

  res.json({
    id: cliente.id,
    nome: cliente.nome,
    telefone: cliente.telefone,
    email: cliente.email,
    data_nascimento: cliente.data_nascimento,
    endereco: cliente.endereco,
    cep: cliente.cep,
    logradouro: cliente.logradouro,
    numero: cliente.numero,
    complemento: cliente.complemento,
    bairro: cliente.bairro,
    cidade: cliente.cidade,
    estado: cliente.estado,
    pontos: cliente.pontos ?? 0,
  });
});

// ─── Ações via link (confirmar / cancelar) ───────────────────────────────────

export function gerarTokenAcao(agendamento_id: number, empresa_id: number, acao: "confirmar" | "cancelar"): string {
  return (jwt as any).sign({ agendamento_id, empresa_id, acao }, JWT_SECRET, { expiresIn: "4d" });
}

router.get("/portal/acao", async (req, res): Promise<void> => {
  const { t } = req.query as Record<string, string>;
  if (!t) { res.status(400).send(paginaAcao("erro", "Link inválido.")); return; }

  let payload: any;
  try { payload = (jwt as any).verify(t, JWT_SECRET); }
  catch { res.status(400).send(paginaAcao("erro", "Link expirado ou inválido.")); return; }

  const { agendamento_id, empresa_id, acao } = payload;
  if (!agendamento_id || !acao) { res.status(400).send(paginaAcao("erro", "Dados inválidos.")); return; }

  const [ag] = await db.select().from(agendamentosTable).where(
    and(eq(agendamentosTable.id, agendamento_id), eq(agendamentosTable.empresa_id, empresa_id))
  );

  if (!ag) { res.status(404).send(paginaAcao("erro", "Agendamento não encontrado.")); return; }
  if (ag.status === "cancelado") { res.send(paginaAcao("info", "Este agendamento já está cancelado.")); return; }
  if (ag.status === "concluido") { res.send(paginaAcao("info", "Este agendamento já foi concluído.")); return; }

  const novoStatus = acao === "confirmar" ? "confirmado" : "cancelado";
  await db.update(agendamentosTable).set({ status: novoStatus }).where(eq(agendamentosTable.id, agendamento_id));

  const [empresa] = await db.select({ nome: empresasTable.nome }).from(empresasTable).where(eq(empresasTable.id, empresa_id));

  if (acao === "confirmar") {
    res.send(paginaAcao("sucesso", `✅ Presença confirmada! Até lá, te esperamos na <strong>${empresa?.nome ?? "empresa"}</strong>.`));
  } else {
    res.send(paginaAcao("cancelado", `Agendamento cancelado. Se quiser, entre em contato com <strong>${empresa?.nome ?? "a empresa"}</strong> para reagendar.`));
  }
});

function paginaAcao(tipo: "sucesso" | "cancelado" | "info" | "erro", mensagem: string): string {
  const cores: Record<string, { bg: string; cor: string; emoji: string }> = {
    sucesso:  { bg: "#f0fdf4", cor: "#15803d", emoji: "🎉" },
    cancelado:{ bg: "#fef2f2", cor: "#dc2626", emoji: "🙁" },
    info:     { bg: "#eff6ff", cor: "#1d4ed8", emoji: "ℹ️" },
    erro:     { bg: "#fff7ed", cor: "#c2410c", emoji: "⚠️" },
  };
  const c = cores[tipo] ?? cores.info;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VendlySys</title>
<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f3f2;}
.card{background:#fff;border-radius:20px;padding:40px 32px;max-width:400px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.1);}
.icon{font-size:52px;margin-bottom:16px;} h2{margin:0 0 12px;color:#111827;font-size:22px;}
p{margin:0;color:#57493f;font-size:15px;line-height:1.6;} .badge{display:inline-block;padding:6px 16px;border-radius:999px;font-size:13px;font-weight:700;margin-top:20px;background:${c.bg};color:${c.cor};}</style></head>
<body><div class="card"><div class="icon">${c.emoji}</div><h2>VendlySys</h2><p>${mensagem}</p><div class="badge">vendlysys.app</div></div></body></html>`;
}

export default router;
