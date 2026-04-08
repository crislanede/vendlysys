import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usuariosTable, empresasTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "vendlysys-secret-2024";

function hashSenha(senha: string): string {
  return crypto.createHash("sha256").update(senha + "vendlysys").digest("hex");
}

export function signToken(payload: object): string {
  return (jwt as any).sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): any {
  try {
    return (jwt as any).verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export { hashSenha };

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }

  const { email, senha } = parsed.data;
  const hash = hashSenha(senha);

  const [usuario] = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.email, email));

  if (!usuario || usuario.senha_hash !== hash || !usuario.ativo) {
    res.status(401).json({ error: "Email ou senha inválidos" });
    return;
  }

  const [empresa] = await db
    .select()
    .from(empresasTable)
    .where(eq(empresasTable.id, usuario.empresa_id));

  const token = signToken({ id: usuario.id, empresa_id: usuario.empresa_id });

  res.json({
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      empresa_id: usuario.empresa_id,
      empresa: empresa ?? null,
    },
  });
});

router.post("/auth/registro", async (req, res): Promise<void> => {
  const { empresa_nome, nome, email, telefone, senha } = req.body ?? {};

  if (!empresa_nome?.trim()) { res.status(400).json({ error: "Nome da empresa é obrigatório." }); return; }
  if (!nome?.trim()) { res.status(400).json({ error: "Seu nome é obrigatório." }); return; }
  if (!email?.trim() || !String(email).includes("@")) { res.status(400).json({ error: "Informe um e-mail válido." }); return; }
  if (!senha || String(senha).length < 6) { res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres." }); return; }

  const emailNorm = String(email).trim().toLowerCase();

  const [emailExistente] = await db.select({ id: usuariosTable.id }).from(usuariosTable).where(eq(usuariosTable.email, emailNorm));
  if (emailExistente) { res.status(409).json({ error: "Este e-mail já está em uso." }); return; }

  const slug = String(empresa_nome)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "empresa";

  const slugFinal = `${slug}-${Date.now().toString(36)}`;

  const [existing] = await db.select({ id: empresasTable.id }).from(empresasTable).where(eq(empresasTable.slug, slugFinal));
  if (existing) { res.status(409).json({ error: "Já existe uma empresa com este nome. Tente outro nome." }); return; }

  const trialExpira = new Date();
  trialExpira.setDate(trialExpira.getDate() + 15);

  const [empresa] = await db.insert(empresasTable).values({
    nome: String(empresa_nome).trim(),
    slug: slugFinal,
    cor_primaria: "#b8956f",
    plano_status: "trial",
    plano_expira_em: trialExpira,
  }).returning();

  const hash = hashSenha(String(senha));
  const [usuario] = await db.insert(usuariosTable).values({
    empresa_id: empresa.id,
    nome: String(nome).trim(),
    email: emailNorm,
    telefone: telefone ? String(telefone).trim() : null,
    senha_hash: hash,
    perfil: "admin",
    ativo: true,
  }).returning();

  const token = signToken({ id: usuario.id, empresa_id: empresa.id });

  res.status(201).json({
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      empresa_id: empresa.id,
      empresa,
    },
  });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Token inválido" });
    return;
  }

  const [usuario] = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.id, payload.id));

  if (!usuario || !usuario.ativo) {
    res.status(401).json({ error: "Usuário não encontrado ou inativo" });
    return;
  }

  const [empresa] = await db
    .select()
    .from(empresasTable)
    .where(eq(empresasTable.id, usuario.empresa_id));

  res.json({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    empresa_id: usuario.empresa_id,
    empresa: empresa ?? null,
  });
});

export default router;
