import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, bloqueiosAgendaTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/bloqueios", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const { mes, ano } = req.query;

  let condicoes: any[] = [eq(bloqueiosAgendaTable.empresa_id, usuario.empresa_id)];

  if (mes && ano) {
    const m = String(mes).padStart(2, "0");
    const a = String(ano);
    const inicio = `${a}-${m}-01`;
    const ultimoDia = new Date(Number(a), Number(mes), 0).getDate();
    const fim = `${a}-${m}-${String(ultimoDia).padStart(2, "0")}`;
    condicoes.push(gte(bloqueiosAgendaTable.data, inicio));
    condicoes.push(lte(bloqueiosAgendaTable.data, fim));
  }

  const bloqueios = await db
    .select()
    .from(bloqueiosAgendaTable)
    .where(and(...condicoes))
    .orderBy(bloqueiosAgendaTable.data);

  res.json(bloqueios);
});

router.post("/bloqueios", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;

  if (usuario.perfil !== "admin") {
    res.status(403).json({ error: "Sem permissão." });
    return;
  }

  const { data, hora_inicio, hora_fim, motivo } = req.body;

  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    res.status(400).json({ error: "Data inválida." });
    return;
  }

  if (hora_inicio && hora_fim && hora_inicio >= hora_fim) {
    res.status(400).json({ error: "Hora de início deve ser antes da hora de término." });
    return;
  }

  const [bloqueio] = await db
    .insert(bloqueiosAgendaTable)
    .values({
      empresa_id: usuario.empresa_id,
      data,
      hora_inicio: hora_inicio || null,
      hora_fim: hora_fim || null,
      motivo: motivo?.trim() || null,
    })
    .returning();

  res.status(201).json(bloqueio);
});

router.delete("/bloqueios/:id", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;

  if (usuario.perfil !== "admin") {
    res.status(403).json({ error: "Sem permissão." });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }

  await db
    .delete(bloqueiosAgendaTable)
    .where(and(
      eq(bloqueiosAgendaTable.id, id),
      eq(bloqueiosAgendaTable.empresa_id, usuario.empresa_id),
    ));

  res.sendStatus(204);
});

export default router;
