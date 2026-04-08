import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../routes/auth";
import { db, usuariosTable, empresasTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Rotas que funcionam mesmo com assinatura vencida
const ASSINATURA_EXEMPT = ["/api/auth", "/api/assinatura", "/api/portal", "/api/health", "/api/push-token"];

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    res.status(401).json({ error: "Usuário não encontrado" });
    return;
  }

  (req as any).usuario = usuario;

  // Verificar assinatura (exceto rotas isentas)
  const url = req.originalUrl.split("?")[0];
  const isExempt = ASSINATURA_EXEMPT.some(p => url.startsWith(p));

  if (!isExempt) {
    const [empresa] = await db
      .select({ plano_status: empresasTable.plano_status, plano_expira_em: empresasTable.plano_expira_em })
      .from(empresasTable)
      .where(eq(empresasTable.id, usuario.empresa_id));

    const status = empresa?.plano_status ?? "trial";
    const expira = empresa?.plano_expira_em ? new Date(empresa.plano_expira_em) : null;
    const expirado = status === "ativo" && expira !== null && expira < new Date();
    const inativo = status === "inativo";

    if (inativo || expirado) {
      res.status(402).json({
        error: "Assinatura vencida. Acesse a tela de Assinatura para renovar.",
        plano_status: status,
        plano_expira_em: empresa?.plano_expira_em ?? null,
      });
      return;
    }
  }

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const usuario = (req as any).usuario;
  if (!usuario || usuario.perfil !== "admin") {
    res.status(403).json({ error: "Acesso restrito a administradores" });
    return;
  }
  next();
}
