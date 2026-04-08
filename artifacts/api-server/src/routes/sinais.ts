import { Router, type IRouter } from "express";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { db, agendamentosTable, clientesTable, empresasTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/sinais", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const { status } = req.query as Record<string, string>;

  const conditions = [
    eq(agendamentosTable.empresa_id, usuario.empresa_id),
    isNotNull(agendamentosTable.sinal_valor),
  ];

  if (status && status !== "todos") {
    if (status === "pendente") {
      conditions.push(
        sql`${agendamentosTable.sinal_pago} IN ('nao')` as any,
        sql`${agendamentosTable.status} IN ('aguardando_sinal', 'agendado')` as any
      );
    } else {
      conditions.push(eq(agendamentosTable.sinal_pago, status) as any);
    }
  }

  const rows = await db
    .select({
      id: agendamentosTable.id,
      servico: agendamentosTable.servico,
      data: agendamentosTable.data,
      hora_inicio: agendamentosTable.hora_inicio,
      status: agendamentosTable.status,
      sinal_pago: agendamentosTable.sinal_pago,
      sinal_valor: agendamentosTable.sinal_valor,
      sinal_expira_em: agendamentosTable.sinal_expira_em,
      sinal_mp_payment_id: agendamentosTable.sinal_mp_payment_id,
      cliente_id: agendamentosTable.cliente_id,
      cliente_nome: clientesTable.nome,
      cliente_telefone: clientesTable.telefone,
    })
    .from(agendamentosTable)
    .leftJoin(clientesTable, eq(agendamentosTable.cliente_id, clientesTable.id))
    .where(and(...conditions))
    .orderBy(sql`${agendamentosTable.data} DESC`, agendamentosTable.hora_inicio);

  const hoje = new Date().toISOString().slice(0, 10);
  const result = rows.map((r) => ({
    ...r,
    sinal_valor: r.sinal_valor ? Number(r.sinal_valor) : 0,
    expirado_hoje: r.sinal_expira_em ? r.sinal_expira_em < hoje : false,
  }));

  res.json(result);
});

router.get("/sinais/stats", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;

  const rows = await db
    .select({
      sinal_pago: agendamentosTable.sinal_pago,
      sinal_valor: agendamentosTable.sinal_valor,
    })
    .from(agendamentosTable)
    .where(and(
      eq(agendamentosTable.empresa_id, usuario.empresa_id),
      isNotNull(agendamentosTable.sinal_valor)
    ));

  let totalRecebido = 0;
  let totalPendente = 0;
  let totalCreditado = 0;
  let totalExpirado = 0;
  let countPago = 0;
  let countPendente = 0;
  let countCreditado = 0;
  let countExpirado = 0;

  for (const r of rows) {
    const v = Number(r.sinal_valor ?? 0);
    if (r.sinal_pago === "sim") { totalRecebido += v; countPago++; }
    else if (r.sinal_pago === "nao") { totalPendente += v; countPendente++; }
    else if (r.sinal_pago === "creditado") { totalCreditado += v; countCreditado++; }
    else if (r.sinal_pago === "expirado") { totalExpirado += v; countExpirado++; }
  }

  res.json({
    totalRecebido, totalPendente, totalCreditado, totalExpirado,
    countPago, countPendente, countCreditado, countExpirado,
  });
});

router.patch("/sinais/:id/marcar-pago", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [ag] = await db
    .select({ id: agendamentosTable.id, empresa_id: agendamentosTable.empresa_id, status: agendamentosTable.status })
    .from(agendamentosTable)
    .where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.empresa_id, usuario.empresa_id)));

  if (!ag) { res.status(404).json({ error: "Agendamento não encontrado" }); return; }

  const novoStatus = ag.status === "aguardando_sinal" ? "agendado" : ag.status;

  const [updated] = await db
    .update(agendamentosTable)
    .set({ sinal_pago: "sim", status: novoStatus })
    .where(eq(agendamentosTable.id, id))
    .returning();

  res.json(updated);
});

export default router;
