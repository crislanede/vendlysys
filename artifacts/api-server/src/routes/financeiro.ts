import { Router, type IRouter } from "express";
import { eq, and, gte, lt, sql, inArray } from "drizzle-orm";

function nextDayStr(d: string): string {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().split("T")[0];
}
import { db, agendamentosTable, despesasTable, clientesTable, profissionaisTable } from "@workspace/db";
import {
  ListLancamentosQueryParams,
  UpdateLancamentoParams,
  UpdateLancamentoBody,
  MarcarPagoParams,
  MarcarPagoBody,
  GetFechamentoCaixaQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/financeiro", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const queryParams = ListLancamentosQueryParams.safeParse(req.query);
  const usuario = (req as any).usuario;

  let conditions: any[] = [eq(agendamentosTable.empresa_id, usuario.empresa_id)];

  if (queryParams.success) {
    const q = queryParams.data;
    if (q.data_inicio) conditions.push(gte(agendamentosTable.data, q.data_inicio));
    if (q.data_fim) conditions.push(lt(agendamentosTable.data, nextDayStr(q.data_fim)));
    if (q.status_pagamento === "pago") conditions.push(eq(agendamentosTable.pago, true));
    if (q.status_pagamento === "pendente") conditions.push(eq(agendamentosTable.pago, false));
    if (q.forma_pagamento) conditions.push(eq(agendamentosTable.forma_pagamento, q.forma_pagamento));
    if (q.profissional_id) conditions.push(eq(agendamentosTable.profissional_id, q.profissional_id));
  }

  const agendamentos = await db
    .select()
    .from(agendamentosTable)
    .where(and(...conditions))
    .orderBy(agendamentosTable.data);

  const lancamentos = await Promise.all(
    agendamentos.map(async (ag) => {
      let cliente_nome = "";
      let profissional_nome = "";

      if (ag.cliente_id) {
        const [c] = await db.select({ nome: clientesTable.nome }).from(clientesTable).where(eq(clientesTable.id, ag.cliente_id));
        cliente_nome = c?.nome ?? "";
      }
      if (ag.profissional_id) {
        const [p] = await db.select({ nome: profissionaisTable.nome }).from(profissionaisTable).where(eq(profissionaisTable.id, ag.profissional_id));
        profissional_nome = p?.nome ?? "";
      }

      const valor = Number(ag.valor ?? 0);
      return {
        id: ag.id,
        empresa_id: ag.empresa_id,
        agendamento_id: ag.id,
        cliente_nome,
        profissional_nome,
        servico: ag.servico,
        data: ag.data,
        valor,
        valor_pago: ag.pago ? valor : 0,
        desconto: 0,
        status_pagamento: ag.pago ? "pago" : ag.status === "cancelado" ? "cancelado" : "pendente",
        forma_pagamento: ag.forma_pagamento ?? null,
        tipo: "receita" as const,
        observacoes: ag.observacoes ?? null,
      };
    })
  );

  res.json(lancamentos);
});

router.put("/financeiro/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateLancamentoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = UpdateLancamentoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const usuario = (req as any).usuario;
  const updateData: any = {};
  if (parsed.data.forma_pagamento) updateData.forma_pagamento = parsed.data.forma_pagamento;
  if (parsed.data.observacoes !== undefined) updateData.observacoes = parsed.data.observacoes;

  const [ag] = await db
    .update(agendamentosTable)
    .set(updateData)
    .where(and(eq(agendamentosTable.id, params.data.id), eq(agendamentosTable.empresa_id, usuario.empresa_id)))
    .returning();

  if (!ag) {
    res.status(404).json({ error: "Lançamento não encontrado" });
    return;
  }

  const valor = Number(ag.valor ?? 0);
  res.json({
    id: ag.id,
    empresa_id: ag.empresa_id,
    agendamento_id: ag.id,
    cliente_nome: "",
    profissional_nome: "",
    servico: ag.servico,
    data: ag.data,
    valor,
    valor_pago: ag.pago ? valor : 0,
    desconto: 0,
    status_pagamento: ag.pago ? "pago" : "pendente",
    forma_pagamento: ag.forma_pagamento ?? null,
    tipo: "receita" as const,
    observacoes: ag.observacoes ?? null,
  });
});

router.post("/financeiro/:id/pagar", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = MarcarPagoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = MarcarPagoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const usuario = (req as any).usuario;
  const [ag] = await db
    .update(agendamentosTable)
    .set({
      pago: true,
      forma_pagamento: parsed.data.forma_pagamento,
      status: "concluido",
      observacoes: parsed.data.observacoes ?? undefined,
    })
    .where(and(eq(agendamentosTable.id, params.data.id), eq(agendamentosTable.empresa_id, usuario.empresa_id)))
    .returning();

  if (!ag) {
    res.status(404).json({ error: "Lançamento não encontrado" });
    return;
  }

  const valor = Number(ag.valor ?? 0);
  const valor_pago = parsed.data.valor_pago ?? valor;

  res.json({
    id: ag.id,
    empresa_id: ag.empresa_id,
    agendamento_id: ag.id,
    cliente_nome: "",
    profissional_nome: "",
    servico: ag.servico,
    data: ag.data,
    valor,
    valor_pago,
    desconto: valor - valor_pago,
    status_pagamento: "pago",
    forma_pagamento: ag.forma_pagamento,
    tipo: "receita" as const,
    observacoes: ag.observacoes ?? null,
  });
});

router.get("/caixa/fechamento", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const queryParams = GetFechamentoCaixaQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: "Parâmetros inválidos" });
    return;
  }

  const usuario = (req as any).usuario;
  const { data_inicio, data_fim } = queryParams.data;

  const agendamentos = await db
    .select()
    .from(agendamentosTable)
    .where(
      and(
        eq(agendamentosTable.empresa_id, usuario.empresa_id),
        gte(agendamentosTable.data, data_inicio),
        lt(agendamentosTable.data, nextDayStr(data_fim)),
        sql`${agendamentosTable.status} != 'cancelado'`
      )
    );

  const despesas = await db
    .select()
    .from(despesasTable)
    .where(
      and(
        eq(despesasTable.empresa_id, usuario.empresa_id),
        gte(despesasTable.data, data_inicio),
        lt(despesasTable.data, nextDayStr(data_fim))
      )
    );

  const total_receitas = agendamentos.reduce((sum, ag) => sum + Number(ag.valor ?? 0), 0);
  const total_recebido = agendamentos.filter((ag) => ag.pago).reduce((sum, ag) => sum + Number(ag.valor ?? 0), 0);
  const total_pendente = total_receitas - total_recebido;
  const total_despesas = despesas.reduce((sum, d) => sum + Number(d.valor ?? 0), 0);
  const saldo_periodo = total_recebido - total_despesas;
  const qtd_atendimentos = agendamentos.length;
  const ticket_medio = qtd_atendimentos > 0 ? total_receitas / qtd_atendimentos : 0;

  const formas: Record<string, { total: number; quantidade: number }> = {};
  for (const ag of agendamentos.filter((ag) => ag.pago && ag.forma_pagamento)) {
    const f = ag.forma_pagamento!;
    if (!formas[f]) formas[f] = { total: 0, quantidade: 0 };
    formas[f].total += Number(ag.valor ?? 0);
    formas[f].quantidade += 1;
  }

  const por_forma_pagamento = Object.entries(formas).map(([forma, data]) => ({
    forma,
    total: data.total,
    quantidade: data.quantidade,
  }));

  res.json({
    data_inicio,
    data_fim,
    total_receitas,
    total_despesas,
    total_recebido,
    total_pendente,
    saldo_periodo,
    qtd_atendimentos,
    ticket_medio,
    por_forma_pagamento,
  });
});

router.get("/financeiro/comissoes", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const { data_inicio, data_fim } = req.query as { data_inicio?: string; data_fim?: string };

  if (!data_inicio || !data_fim) {
    res.status(400).json({ error: "data_inicio e data_fim são obrigatórios" });
    return;
  }

  const agendamentos = await db
    .select({
      profissional_id: agendamentosTable.profissional_id,
      valor: agendamentosTable.valor,
      pago: agendamentosTable.pago,
      status: agendamentosTable.status,
    })
    .from(agendamentosTable)
    .where(
      and(
        eq(agendamentosTable.empresa_id, usuario.empresa_id),
        gte(agendamentosTable.data, data_inicio),
        lt(agendamentosTable.data, nextDayStr(data_fim)),
        sql`${agendamentosTable.status} != 'cancelado'`
      )
    );

  const profissionalIds = [...new Set(agendamentos.map((a) => a.profissional_id).filter((id): id is number => id != null))];

  const profissionais = profissionalIds.length > 0
    ? await db
        .select({ id: profissionaisTable.id, nome: profissionaisTable.nome, comissao_percentual: profissionaisTable.comissao_percentual })
        .from(profissionaisTable)
        .where(inArray(profissionaisTable.id, profissionalIds))
    : [];

  const profMap = new Map(profissionais.map((p) => [p.id, p]));

  const comissoesPorProfissional = profissionalIds.map((pid) => {
    const prof = profMap.get(pid);
    const ags = agendamentos.filter((a) => a.profissional_id === pid);
    const total_servicos = ags.reduce((s, a) => s + Number(a.valor ?? 0), 0);
    const total_recebido = ags.filter((a) => a.pago).reduce((s, a) => s + Number(a.valor ?? 0), 0);
    const pct = Number(prof?.comissao_percentual ?? 0);
    const valor_comissao = (total_recebido * pct) / 100;
    return {
      profissional_id: pid,
      profissional_nome: prof?.nome ?? "Desconhecido",
      comissao_percentual: pct,
      total_servicos,
      total_recebido,
      valor_comissao,
      qtd_atendimentos: ags.length,
    };
  });

  const sem_profissional = agendamentos.filter((a) => !a.profissional_id);
  if (sem_profissional.length > 0) {
    const total_servicos = sem_profissional.reduce((s, a) => s + Number(a.valor ?? 0), 0);
    const total_recebido = sem_profissional.filter((a) => a.pago).reduce((s, a) => s + Number(a.valor ?? 0), 0);
    comissoesPorProfissional.push({
      profissional_id: 0,
      profissional_nome: "Sem profissional",
      comissao_percentual: 0,
      total_servicos,
      total_recebido,
      valor_comissao: 0,
      qtd_atendimentos: sem_profissional.length,
    });
  }

  const total_comissoes = comissoesPorProfissional.reduce((s, c) => s + c.valor_comissao, 0);

  res.json({ comissoes: comissoesPorProfissional, total_comissoes });
});

router.get("/financeiro/relatorios", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const { data_inicio, data_fim } = req.query as { data_inicio?: string; data_fim?: string };

  if (!data_inicio || !data_fim) {
    res.status(400).json({ error: "data_inicio e data_fim são obrigatórios" });
    return;
  }

  const ags = await db
    .select({
      id: agendamentosTable.id,
      servico: agendamentosTable.servico,
      valor: agendamentosTable.valor,
      pago: agendamentosTable.pago,
      status: agendamentosTable.status,
      forma_pagamento: agendamentosTable.forma_pagamento,
      cliente_id: agendamentosTable.cliente_id,
      profissional_id: agendamentosTable.profissional_id,
    })
    .from(agendamentosTable)
    .where(
      and(
        eq(agendamentosTable.empresa_id, usuario.empresa_id),
        gte(agendamentosTable.data, data_inicio),
        lt(agendamentosTable.data, nextDayStr(data_fim)),
      )
    );

  const naoCancelados = ags.filter((a) => a.status !== "cancelado");
  const concluidos = ags.filter((a) => a.status === "concluido");
  const pagos = naoCancelados.filter((a) => a.pago);

  const total_agendamentos = naoCancelados.length;
  const agendamentos_concluidos = concluidos.length;
  const total_receita = naoCancelados.reduce((s, a) => s + Number(a.valor ?? 0), 0);
  const total_recebido = pagos.reduce((s, a) => s + Number(a.valor ?? 0), 0);
  const ticket_medio = pagos.length > 0 ? total_recebido / pagos.length : 0;
  const taxa_conclusao = total_agendamentos > 0 ? Math.round((agendamentos_concluidos / total_agendamentos) * 100) : 0;

  const resumo = { total_agendamentos, agendamentos_concluidos, total_receita, total_recebido, ticket_medio, taxa_conclusao };

  const servicoMap = new Map<string, { servico: string; qtd: number; total: number; total_recebido: number }>();
  for (const a of naoCancelados) {
    const key = a.servico;
    if (!servicoMap.has(key)) servicoMap.set(key, { servico: key, qtd: 0, total: 0, total_recebido: 0 });
    const e = servicoMap.get(key)!;
    e.qtd += 1;
    e.total += Number(a.valor ?? 0);
    if (a.pago) e.total_recebido += Number(a.valor ?? 0);
  }
  const ranking_servicos = [...servicoMap.values()].sort((a, b) => b.qtd - a.qtd).slice(0, 15);

  const profMap = new Map<number, { qtd: number; total: number; recebido: number }>();
  for (const a of naoCancelados) {
    if (!a.profissional_id) continue;
    if (!profMap.has(a.profissional_id)) profMap.set(a.profissional_id, { qtd: 0, total: 0, recebido: 0 });
    const e = profMap.get(a.profissional_id)!;
    e.qtd += 1;
    e.total += Number(a.valor ?? 0);
    if (a.pago) e.recebido += Number(a.valor ?? 0);
  }
  const profIds = [...profMap.keys()];
  const profRows = profIds.length > 0
    ? await db.select({ id: profissionaisTable.id, nome: profissionaisTable.nome }).from(profissionaisTable).where(inArray(profissionaisTable.id, profIds))
    : [];
  const profNomeMap = new Map(profRows.map((p) => [p.id, p.nome]));
  const por_profissional = profIds
    .map((pid) => ({ profissional_id: pid, nome: profNomeMap.get(pid) ?? "Desconhecido", ...profMap.get(pid)! }))
    .sort((a, b) => b.total - a.total);

  const fpMap = new Map<string, { forma_pagamento: string; qtd: number; total: number }>();
  for (const a of pagos) {
    const key = a.forma_pagamento ?? "Não informado";
    if (!fpMap.has(key)) fpMap.set(key, { forma_pagamento: key, qtd: 0, total: 0 });
    const e = fpMap.get(key)!;
    e.qtd += 1;
    e.total += Number(a.valor ?? 0);
  }
  const por_forma_pagamento = [...fpMap.values()].sort((a, b) => b.total - a.total);

  const cliMap = new Map<number, { qtd: number; total: number }>();
  for (const a of naoCancelados) {
    if (!a.cliente_id) continue;
    if (!cliMap.has(a.cliente_id)) cliMap.set(a.cliente_id, { qtd: 0, total: 0 });
    const e = cliMap.get(a.cliente_id)!;
    e.qtd += 1;
    e.total += Number(a.valor ?? 0);
  }
  const cliIds = [...cliMap.keys()];
  const cliRows = cliIds.length > 0
    ? await db.select({ id: clientesTable.id, nome: clientesTable.nome }).from(clientesTable).where(inArray(clientesTable.id, cliIds))
    : [];
  const cliNomeMap = new Map(cliRows.map((c) => [c.id, c.nome]));
  const top_clientes = cliIds
    .map((cid) => ({ cliente_id: cid, nome: cliNomeMap.get(cid) ?? "Desconhecido", ...cliMap.get(cid)! }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  res.json({ resumo, ranking_servicos, por_profissional, por_forma_pagamento, top_clientes });
});

export default router;
