import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, profissionaisTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/profissionais", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const lista = await db
    .select()
    .from(profissionaisTable)
    .where(eq(profissionaisTable.empresa_id, usuario.empresa_id));

  res.json(lista.map((p) => ({
    id: p.id,
    nome: p.nome,
    telefone: p.telefone ?? null,
    email: p.email ?? null,
    especialidade: p.especialidade ?? null,
    ativo: p.ativo,
    comissao_percentual: Number(p.comissao_percentual ?? 0),
  })));
});

router.post("/profissionais", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { nome, telefone, email, especialidade } = req.body as {
    nome?: string;
    telefone?: string;
    email?: string;
    especialidade?: string;
  };

  if (!nome || !nome.trim()) {
    res.status(400).json({ error: "Nome é obrigatório." });
    return;
  }

  const usuario = (req as any).usuario;
  const [novo] = await db
    .insert(profissionaisTable)
    .values({
      empresa_id: usuario.empresa_id,
      nome: nome.trim(),
      telefone: telefone?.trim() || null,
      email: email?.trim() || null,
      especialidade: especialidade?.trim() || null,
      ativo: true,
    })
    .returning();

  res.status(201).json({
    id: novo.id,
    nome: novo.nome,
    telefone: novo.telefone ?? null,
    email: novo.email ?? null,
    especialidade: novo.especialidade ?? null,
    ativo: novo.ativo,
    comissao_percentual: Number(novo.comissao_percentual ?? 0),
  });
});

router.put("/profissionais/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const { nome, telefone, email, especialidade, ativo, comissao_percentual } = req.body as {
    nome?: string;
    telefone?: string;
    email?: string;
    especialidade?: string;
    ativo?: boolean;
    comissao_percentual?: number;
  };

  const admin = (req as any).usuario;
  const fields: Partial<typeof profissionaisTable.$inferInsert> = {};
  if (nome !== undefined) fields.nome = nome.trim();
  if (telefone !== undefined) fields.telefone = telefone?.trim() || null;
  if (email !== undefined) fields.email = email?.trim() || null;
  if (especialidade !== undefined) fields.especialidade = especialidade?.trim() || null;
  if (ativo !== undefined) fields.ativo = ativo;
  if (comissao_percentual !== undefined) {
    const pct = Number(comissao_percentual);
    if (!isNaN(pct) && pct >= 0 && pct <= 100) fields.comissao_percentual = String(pct);
  }

  const [updated] = await db
    .update(profissionaisTable)
    .set(fields)
    .where(and(eq(profissionaisTable.id, id), eq(profissionaisTable.empresa_id, admin.empresa_id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Profissional não encontrado" }); return; }

  res.json({
    id: updated.id,
    nome: updated.nome,
    telefone: updated.telefone ?? null,
    email: updated.email ?? null,
    especialidade: updated.especialidade ?? null,
    ativo: updated.ativo,
    comissao_percentual: Number(updated.comissao_percentual ?? 0),
  });
});

router.delete("/profissionais/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const admin = (req as any).usuario;
  await db
    .delete(profissionaisTable)
    .where(and(eq(profissionaisTable.id, id), eq(profissionaisTable.empresa_id, admin.empresa_id)));

  res.sendStatus(204);
});

export default router;
