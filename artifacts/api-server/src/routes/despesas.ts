import { Router, type IRouter } from "express";
import { eq, and, gte, lt } from "drizzle-orm";

function nextDayStr(d: string): string {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().split("T")[0];
}
import { db, despesasTable } from "@workspace/db";
import {
  CreateDespesaBody,
  ListDespesasQueryParams,
  UpdateDespesaParams,
  UpdateDespesaBody,
  DeleteDespesaParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/despesas", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const queryParams = ListDespesasQueryParams.safeParse(req.query);
  const usuario = (req as any).usuario;

  let conditions: any[] = [eq(despesasTable.empresa_id, usuario.empresa_id)];

  if (queryParams.success) {
    const q = queryParams.data;
    if (q.data_inicio) conditions.push(gte(despesasTable.data, q.data_inicio));
    if (q.data_fim) conditions.push(lt(despesasTable.data, nextDayStr(q.data_fim)));
    if (q.categoria) conditions.push(eq(despesasTable.categoria, q.categoria));
  }

  const despesas = await db
    .select()
    .from(despesasTable)
    .where(and(...conditions))
    .orderBy(despesasTable.data);

  res.json(
    despesas.map((d) => ({
      ...d,
      valor: Number(d.valor),
    }))
  );
});

router.post("/despesas", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateDespesaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const usuario = (req as any).usuario;
  const [despesa] = await db
    .insert(despesasTable)
    .values({
      ...parsed.data,
      valor: String(parsed.data.valor),
      empresa_id: usuario.empresa_id,
    })
    .returning();

  res.status(201).json({ ...despesa, valor: Number(despesa.valor) });
});

router.put("/despesas/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateDespesaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = UpdateDespesaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const usuario = (req as any).usuario;
  const updateData: any = { ...parsed.data };
  if (parsed.data.valor != null) {
    updateData.valor = String(parsed.data.valor);
  }

  const [despesa] = await db
    .update(despesasTable)
    .set(updateData)
    .where(and(eq(despesasTable.id, params.data.id), eq(despesasTable.empresa_id, usuario.empresa_id)))
    .returning();

  if (!despesa) {
    res.status(404).json({ error: "Despesa não encontrada" });
    return;
  }

  res.json({ ...despesa, valor: Number(despesa.valor) });
});

router.delete("/despesas/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteDespesaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const usuario = (req as any).usuario;
  await db
    .delete(despesasTable)
    .where(and(eq(despesasTable.id, params.data.id), eq(despesasTable.empresa_id, usuario.empresa_id)));

  res.sendStatus(204);
});

export default router;
