import { Router, type IRouter } from "express";
import { eq, and, gte, lt, sql } from "drizzle-orm";

function nextDayStr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}
import { db, agendamentosTable, despesasTable, clientesTable } from "@workspace/db";
import { GetDashboardResumoQueryParams, GetDashboardGraficosQueryParams } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

router.get("/dashboard/resumo", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const q = req.query as Record<string, string | undefined>;
  const now = new Date();

  let data_inicio: string;
  let data_fim_exclusive: string;
  let mes: number;
  let ano: number;

  if (q.data_inicio && q.data_fim) {
    data_inicio = q.data_inicio;
    data_fim_exclusive = nextDayStr(q.data_fim);
    const parsedStart = new Date(data_inicio);
    mes = parsedStart.getUTCMonth() + 1;
    ano = parsedStart.getUTCFullYear();
  } else {
    const queryParams = GetDashboardResumoQueryParams.safeParse(q);
    mes = queryParams.success && queryParams.data.mes ? queryParams.data.mes : now.getMonth() + 1;
    ano = queryParams.success && queryParams.data.ano ? queryParams.data.ano : now.getFullYear();
    const mesStr = String(mes).padStart(2, "0");
    data_inicio = `${ano}-${mesStr}-01`;
    const lastDay = new Date(ano, mes, 0).getDate();
    data_fim_exclusive = nextDayStr(`${ano}-${mesStr}-${String(lastDay).padStart(2, "0")}`);
  }

  const agendamentos = await db
    .select()
    .from(agendamentosTable)
    .where(
      and(
        eq(agendamentosTable.empresa_id, usuario.empresa_id),
        gte(agendamentosTable.data, data_inicio),
        lt(agendamentosTable.data, data_fim_exclusive)
      )
    );

  const despesas = await db
    .select()
    .from(despesasTable)
    .where(
      and(
        eq(despesasTable.empresa_id, usuario.empresa_id),
        gte(despesasTable.data, data_inicio),
        lt(despesasTable.data, data_fim_exclusive)
      )
    );

  const validos = agendamentos.filter((ag) => ag.status !== "cancelado");
  const concluidos = agendamentos.filter((ag) => ag.status === "concluido");
  const cancelados = agendamentos.filter((ag) => ag.status === "cancelado");

  const receita_total = validos.reduce((sum, ag) => sum + Number(ag.valor ?? 0), 0);
  const receita_recebida = validos.filter((ag) => ag.pago).reduce((sum, ag) => sum + Number(ag.valor ?? 0), 0);
  const receita_pendente = receita_total - receita_recebida;
  const despesas_total = despesas.reduce((sum, d) => sum + Number(d.valor ?? 0), 0);
  const lucro_liquido = receita_recebida - despesas_total;
  const ticket_medio = concluidos.length > 0 ? receita_total / concluidos.length : 0;

  const novos_clientes_res = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clientesTable)
    .where(
      and(
        eq(clientesTable.empresa_id, usuario.empresa_id),
        gte(clientesTable.createdAt, new Date(data_inicio)),
        lt(clientesTable.createdAt, new Date(data_fim_exclusive))
      )
    );

  res.json({
    mes,
    ano,
    total_agendamentos: validos.length,
    agendamentos_concluidos: concluidos.length,
    agendamentos_cancelados: cancelados.length,
    receita_total,
    receita_recebida,
    receita_pendente,
    despesas_total,
    lucro_liquido,
    novos_clientes: novos_clientes_res[0]?.count ?? 0,
    ticket_medio,
  });
});

router.get("/dashboard/graficos", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const queryParams = GetDashboardGraficosQueryParams.safeParse(req.query);
  const usuario = (req as any).usuario;
  const ano = queryParams.success && queryParams.data.ano ? queryParams.data.ano : new Date().getFullYear();

  const data_inicio = `${ano}-01-01`;
  const data_fim_exclusive = `${ano + 1}-01-01`;

  const agendamentos = await db
    .select()
    .from(agendamentosTable)
    .where(
      and(
        eq(agendamentosTable.empresa_id, usuario.empresa_id),
        gte(agendamentosTable.data, data_inicio),
        lt(agendamentosTable.data, data_fim_exclusive)
      )
    );

  const despesas = await db
    .select()
    .from(despesasTable)
    .where(
      and(
        eq(despesasTable.empresa_id, usuario.empresa_id),
        gte(despesasTable.data, data_inicio),
        lt(despesasTable.data, data_fim_exclusive)
      )
    );

  const receita_por_mes = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const mesStr = String(mes).padStart(2, "0");
    const ags = agendamentos.filter((ag) => ag.data.startsWith(`${ano}-${mesStr}`) && ag.status !== "cancelado");
    const desps = despesas.filter((d) => d.data.startsWith(`${ano}-${mesStr}`));
    const receita = ags.reduce((sum, ag) => sum + Number(ag.valor ?? 0), 0);
    const despTotal = desps.reduce((sum, d) => sum + Number(d.valor ?? 0), 0);
    return {
      mes,
      mes_nome: MESES[i],
      receita,
      despesas: despTotal,
      lucro: receita - despTotal,
    };
  });

  const agendamentos_por_mes = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const mesStr = String(mes).padStart(2, "0");
    const ags = agendamentos.filter((ag) => ag.data.startsWith(`${ano}-${mesStr}`));
    const concluidos = ags.filter((ag) => ag.status === "concluido");
    return {
      mes,
      mes_nome: MESES[i],
      total: ags.length,
      concluidos: concluidos.length,
    };
  });

  const servicoMap: Record<string, { quantidade: number; receita: number }> = {};
  for (const ag of agendamentos.filter((ag) => ag.status !== "cancelado")) {
    if (!servicoMap[ag.servico]) servicoMap[ag.servico] = { quantidade: 0, receita: 0 };
    servicoMap[ag.servico].quantidade += 1;
    servicoMap[ag.servico].receita += Number(ag.valor ?? 0);
  }
  const top_servicos = Object.entries(servicoMap)
    .map(([servico, data]) => ({ servico, ...data }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  const profMap: Record<number, { nome: string; atendimentos: number; receita: number }> = {};
  for (const ag of agendamentos.filter((ag) => ag.status !== "cancelado" && ag.profissional_id)) {
    const pid = ag.profissional_id!;
    if (!profMap[pid]) profMap[pid] = { nome: `Profissional ${pid}`, atendimentos: 0, receita: 0 };
    profMap[pid].atendimentos += 1;
    profMap[pid].receita += Number(ag.valor ?? 0);
  }
  const top_profissionais = Object.values(profMap)
    .sort((a, b) => b.atendimentos - a.atendimentos)
    .slice(0, 5);

  res.json({
    ano,
    receita_por_mes,
    agendamentos_por_mes,
    top_servicos,
    top_profissionais,
  });
});

export default router;
