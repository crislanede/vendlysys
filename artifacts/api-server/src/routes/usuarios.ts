import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usuariosTable } from "@workspace/db";
import {
  CreateUsuarioBody,
  UpdateUsuarioBody,
  UpdateUsuarioParams,
  DeleteUsuarioParams,
  ResetSenhaUsuarioParams,
  ResetSenhaUsuarioBody,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { hashSenha } from "./auth";
import * as crypto from "crypto";

const router: IRouter = Router();

router.get("/usuarios", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const usuarios = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.empresa_id, usuario.empresa_id));

  res.json(
    usuarios.map((u) => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      telefone: u.telefone ?? null,
      perfil: u.perfil,
      empresa_id: u.empresa_id,
      ativo: u.ativo,
    }))
  );
});

router.post("/usuarios", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { nome, email, senha, perfil, telefone } = req.body as {
    nome?: string;
    email?: string;
    senha?: string;
    perfil?: string;
    telefone?: string;
  };

  if (!nome || !nome.trim()) {
    res.status(400).json({ error: "Nome é obrigatório." });
    return;
  }
  if (!email || !email.trim() || !email.includes("@")) {
    res.status(400).json({ error: "E-mail é obrigatório e deve ser válido." });
    return;
  }
  if (!senha || senha.length < 6) {
    res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres." });
    return;
  }
  if (!perfil || !["admin", "agenda"].includes(perfil)) {
    res.status(400).json({ error: "Perfil inválido." });
    return;
  }

  const emailNorm = email.trim().toLowerCase();
  const [emailExistente] = await db.select({ id: usuariosTable.id }).from(usuariosTable).where(eq(usuariosTable.email, emailNorm));
  if (emailExistente) {
    res.status(409).json({ error: "Este e-mail já está em uso." });
    return;
  }

  const usuario = (req as any).usuario;
  const senha_hash = hashSenha(senha);

  const [novoUsuario] = await db
    .insert(usuariosTable)
    .values({
      empresa_id: usuario.empresa_id,
      nome: nome.trim(),
      email: emailNorm,
      telefone: telefone?.trim() || null,
      senha_hash,
      perfil,
      ativo: true,
    })
    .returning();

  res.status(201).json({
    id: novoUsuario.id,
    nome: novoUsuario.nome,
    email: novoUsuario.email,
    telefone: novoUsuario.telefone ?? null,
    perfil: novoUsuario.perfil,
    empresa_id: novoUsuario.empresa_id,
    ativo: novoUsuario.ativo,
  });
});

router.put("/usuarios/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const { nome, perfil, ativo, telefone, senha } = req.body as {
    nome?: string;
    perfil?: string;
    ativo?: boolean;
    telefone?: string;
    senha?: string;
  };

  const admin = (req as any).usuario;
  const fields: Record<string, unknown> = {};

  if (nome !== undefined) fields.nome = nome.trim();
  if (perfil !== undefined && ["admin", "agenda"].includes(perfil)) fields.perfil = perfil;
  if (ativo !== undefined) fields.ativo = ativo;
  if (telefone !== undefined) fields.telefone = telefone?.trim() || null;
  if (senha && senha.length >= 6) fields.senha_hash = hashSenha(senha);

  const [updated] = await db
    .update(usuariosTable)
    .set(fields as any)
    .where(and(eq(usuariosTable.id, id), eq(usuariosTable.empresa_id, admin.empresa_id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  res.json({
    id: updated.id,
    nome: updated.nome,
    email: updated.email,
    telefone: updated.telefone ?? null,
    perfil: updated.perfil,
    empresa_id: updated.empresa_id,
    ativo: updated.ativo,
  });
});

router.delete("/usuarios/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteUsuarioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const admin = (req as any).usuario;
  await db
    .delete(usuariosTable)
    .where(and(eq(usuariosTable.id, params.data.id), eq(usuariosTable.empresa_id, admin.empresa_id)));

  res.sendStatus(204);
});

router.post("/usuarios/:id/reset-senha", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = ResetSenhaUsuarioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = ResetSenhaUsuarioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const admin = (req as any).usuario;
  const senha_hash = hashSenha(parsed.data.nova_senha);

  const [updated] = await db
    .update(usuariosTable)
    .set({ senha_hash })
    .where(and(eq(usuariosTable.id, params.data.id), eq(usuariosTable.empresa_id, admin.empresa_id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  res.json({ ok: true });
});

export default router;
