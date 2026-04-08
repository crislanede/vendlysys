import { Router, type IRouter } from "express";
import { eq, and, gte, lt, ne } from "drizzle-orm";

function nextDayStr(d: string): string {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().split("T")[0];
}
import { db, agendamentosTable, clientesTable, profissionaisTable, empresasTable } from "@workspace/db";
import { sql as sqlFn } from "drizzle-orm";
import {
  CreateAgendamentoBody,
  ListAgendamentosQueryParams,
  GetAgendamentoParams,
  UpdateAgendamentoParams,
  UpdateAgendamentoBody,
  DeleteAgendamentoParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { enviarPushParaEmpresa } from "../lib/push";
import { temConflitoProfissional } from "../lib/conflito";

const router: IRouter = Router();

async function enrichAgendamento(ag: any) {
  let cliente_nome = "";
  let cliente_telefone = "";
  let profissional_nome = "";

  if (ag.cliente_id) {
    const [cliente] = await db
      .select({ nome: clientesTable.nome, telefone: clientesTable.telefone })
      .from(clientesTable)
      .where(eq(clientesTable.id, ag.cliente_id));
    cliente_nome = cliente?.nome ?? "";
    cliente_telefone = cliente?.telefone ?? "";
  }

  if (ag.profissional_id) {
    const [prof] = await db.select({ nome: profissionaisTable.nome }).from(profissionaisTable).where(eq(profissionaisTable.id, ag.profissional_id));
    profissional_nome = prof?.nome ?? "";
  }

  return {
    ...ag,
    valor: ag.valor != null ? Number(ag.valor) : null,
    cliente_nome,
    cliente_telefone,
    profissional_nome,
  };
}

router.get("/agendamentos", requireAuth, async (req, res): Promise<void> => {
  const queryParams = ListAgendamentosQueryParams.safeParse(req.query);
  const usuario = (req as any).usuario;

  let conditions: any[] = [eq(agendamentosTable.empresa_id, usuario.empresa_id)];

  if (queryParams.success) {
    const q = queryParams.data;
    if (q.data_inicio) conditions.push(gte(agendamentosTable.data, q.data_inicio));
    if (q.data_fim) conditions.push(lt(agendamentosTable.data, nextDayStr(q.data_fim)));
    if (q.status) conditions.push(eq(agendamentosTable.status, q.status));
    if (q.profissional_id) conditions.push(eq(agendamentosTable.profissional_id, q.profissional_id));
  }

  const agendamentos = await db
    .select()
    .from(agendamentosTable)
    .where(and(...conditions))
    .orderBy(agendamentosTable.data, agendamentosTable.hora_inicio);

  const result = await Promise.all(agendamentos.map(enrichAgendamento));
  res.json(result);
});

router.post("/agendamentos", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAgendamentoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const usuario = (req as any).usuario;

  if (parsed.data.profissional_id && parsed.data.data && parsed.data.hora_inicio) {
    const conflito = await temConflitoProfissional({
      empresa_id: usuario.empresa_id,
      profissional_id: parsed.data.profissional_id,
      data: parsed.data.data,
      hora_inicio: parsed.data.hora_inicio,
      hora_fim: parsed.data.hora_fim ?? null,
    });
    if (conflito) {
      res.status(409).json({ error: "Esta profissional já possui um agendamento neste horário." });
      return;
    }
  }

  const [ag] = await db
    .insert(agendamentosTable)
    .values({
      ...parsed.data,
      valor: parsed.data.valor != null ? String(parsed.data.valor) : undefined,
      empresa_id: usuario.empresa_id,
    })
    .returning();

  const enriched = await enrichAgendamento(ag);

  const dataHora = ag.data_hora_inicio
    ? new Date(ag.data_hora_inicio).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  enviarPushParaEmpresa(usuario.empresa_id, {
    title: "📅 Novo agendamento",
    body: enriched.cliente_nome
      ? `${enriched.cliente_nome}${dataHora ? ` — ${dataHora}` : ""}`
      : `Novo agendamento criado${dataHora ? ` para ${dataHora}` : ""}`,
    data: { agendamento_id: ag.id },
  }).catch(() => {});

  res.status(201).json(enriched);
});

router.get("/agendamentos/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetAgendamentoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const usuario = (req as any).usuario;
  const [ag] = await db
    .select()
    .from(agendamentosTable)
    .where(and(eq(agendamentosTable.id, params.data.id), eq(agendamentosTable.empresa_id, usuario.empresa_id)));

  if (!ag) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }

  const enriched = await enrichAgendamento(ag);
  res.json(enriched);
});

router.put("/agendamentos/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAgendamentoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = UpdateAgendamentoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const usuario = (req as any).usuario;
  const updateData: any = { ...parsed.data };
  if (parsed.data.valor != null) {
    updateData.valor = String(parsed.data.valor);
  }

  const [agAntes] = await db
    .select({ status: agendamentosTable.status, cliente_id: agendamentosTable.cliente_id, valor: agendamentosTable.valor, profissional_id: agendamentosTable.profissional_id, data: agendamentosTable.data, hora_inicio: agendamentosTable.hora_inicio, hora_fim: agendamentosTable.hora_fim })
    .from(agendamentosTable)
    .where(and(eq(agendamentosTable.id, params.data.id), eq(agendamentosTable.empresa_id, usuario.empresa_id)));

  const profId = parsed.data.profissional_id ?? agAntes?.profissional_id;
  const dataAg = parsed.data.data ?? agAntes?.data;
  const horaIni = parsed.data.hora_inicio ?? agAntes?.hora_inicio;
  const horaFim = "hora_fim" in parsed.data ? (parsed.data.hora_fim ?? null) : (agAntes?.hora_fim ?? null);

  if (profId && dataAg && horaIni) {
    const novoStatus = parsed.data.status ?? agAntes?.status;
    if (novoStatus !== "cancelado") {
      const conflito = await temConflitoProfissional({
        empresa_id: usuario.empresa_id,
        profissional_id: profId,
        data: dataAg,
        hora_inicio: horaIni,
        hora_fim: horaFim,
        excluir_id: params.data.id,
      });
      if (conflito) {
        res.status(409).json({ error: "Esta profissional já possui um agendamento neste horário." });
        return;
      }
    }
  }

  const [ag] = await db
    .update(agendamentosTable)
    .set(updateData)
    .where(and(eq(agendamentosTable.id, params.data.id), eq(agendamentosTable.empresa_id, usuario.empresa_id)))
    .returning();

  if (!ag) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }

  if (
    parsed.data.status === "concluido" &&
    agAntes?.status !== "concluido" &&
    ag.cliente_id
  ) {
    try {
      const [empresa] = await db
        .select({ pontos_por_real: empresasTable.pontos_por_real })
        .from(empresasTable)
        .where(eq(empresasTable.id, usuario.empresa_id));

      const pontosPorReal = empresa?.pontos_por_real ? Number(empresa.pontos_por_real) : 0;
      const valorAg = ag.valor ? Number(ag.valor) : 0;

      if (pontosPorReal > 0 && valorAg > 0) {
        const pontosGanhos = Math.floor(valorAg * pontosPorReal);
        if (pontosGanhos > 0) {
          await db
            .update(clientesTable)
            .set({ pontos: sqlFn`COALESCE(${clientesTable.pontos}, 0) + ${pontosGanhos}` })
            .where(eq(clientesTable.id, ag.cliente_id));
        }
      }
    } catch {}
  }

  const enriched = await enrichAgendamento(ag);
  res.json(enriched);
});

router.delete("/agendamentos/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAgendamentoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const usuario = (req as any).usuario;
  await db
    .delete(agendamentosTable)
    .where(and(eq(agendamentosTable.id, params.data.id), eq(agendamentosTable.empresa_id, usuario.empresa_id)));

  res.sendStatus(204);
});

router.get("/fechamento-dia", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const dataParam = typeof req.query.data === "string" ? req.query.data : new Date().toISOString().split("T")[0];

  const agendamentos = await db
    .select({
      profissional_id: agendamentosTable.profissional_id,
      valor: agendamentosTable.valor,
      status: agendamentosTable.status,
    })
    .from(agendamentosTable)
    .where(
      and(
        eq(agendamentosTable.empresa_id, usuario.empresa_id),
        eq(agendamentosTable.data, dataParam),
        ne(agendamentosTable.status, "cancelado"),
      )
    );

  const profMap = new Map<number | null, { profissional_id: number | null; total: number; count: number }>();

  for (const ag of agendamentos) {
    const key = ag.profissional_id ?? null;
    if (!profMap.has(key)) {
      profMap.set(key, { profissional_id: key, total: 0, count: 0 });
    }
    const entry = profMap.get(key)!;
    entry.total += ag.valor ? Number(ag.valor) : 0;
    entry.count += 1;
  }

  const result: { profissional_id: number | null; profissional_nome: string; total: number; count: number }[] = [];

  for (const [, entry] of profMap) {
    let profissional_nome = "Sem profissional";
    if (entry.profissional_id) {
      const [prof] = await db
        .select({ nome: profissionaisTable.nome })
        .from(profissionaisTable)
        .where(eq(profissionaisTable.id, entry.profissional_id));
      profissional_nome = prof?.nome ?? "Desconhecido";
    }
    result.push({ ...entry, profissional_nome });
  }

  result.sort((a, b) => b.total - a.total);

  res.json({ data: dataParam, resultado: result });
});

export default router;
