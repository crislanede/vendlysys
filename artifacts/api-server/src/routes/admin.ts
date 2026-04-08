import { Router } from "express";
import { db } from "@workspace/db";
import { empresasTable, usuariosTable, agendamentosTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

function verificarAdminKey(req: any, res: any, next: any) {
  const chave = req.headers["x-admin-key"];
  const chaveCorreta = process.env.ADMIN_KEY || "vendlysys-admin-2026";
  if (!chave || chave !== chaveCorreta) {
    return res.status(401).json({ error: "Chave de admin inválida" });
  }
  next();
}

router.get("/admin/empresas", verificarAdminKey, async (req, res) => {
  try {
    const lista = await db
      .select({
        id: empresasTable.id,
        nome: empresasTable.nome,
        slug: empresasTable.slug,
        plano_status: empresasTable.plano_status,
        plano_expira_em: empresasTable.plano_expira_em,
        criado_em: empresasTable.createdAt,
        total_usuarios: sql<number>`(SELECT COUNT(*) FROM usuarios WHERE empresa_id = ${empresasTable.id})`,
        total_agendamentos: sql<number>`(SELECT COUNT(*) FROM agendamentos WHERE empresa_id = ${empresasTable.id})`,
        agendamentos_mes: sql<number>`(SELECT COUNT(*) FROM agendamentos WHERE empresa_id = ${empresasTable.id} AND DATE_TRUNC('month', data::date) = DATE_TRUNC('month', NOW()))`,
      })
      .from(empresasTable)
      .orderBy(sql`${empresasTable.createdAt} DESC`);

    return res.json(lista);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/empresas/:id/plano", verificarAdminKey, async (req, res) => {
  const { id } = req.params;
  const { plano_status, dias } = req.body;
  try {
    const expira = dias
      ? new Date(Date.now() + Number(dias) * 86400000)
      : null;

    await db
      .update(empresasTable)
      .set({
        plano_status: plano_status,
        ...(expira ? { plano_expira_em: expira } : {}),
      })
      .where(eq(empresasTable.id, Number(id)));

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
