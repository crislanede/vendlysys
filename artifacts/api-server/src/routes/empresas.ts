import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, empresasTable } from "@workspace/db";
import { GetEmpresaParams, UpdateEmpresaBody, UpdateEmpresaParams } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function getPortalUrl(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? process.env.REPLIT_DEV_DOMAIN ?? "";
  if (!domain) return null;
  return `https://${domain}/vendlysys/portal/${slug}`;
}

function getDownloadUrl(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? process.env.REPLIT_DEV_DOMAIN ?? "";
  if (!domain) return null;
  return `https://${domain}/vendlysys/baixar/${slug}`;
}

router.get("/empresas/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetEmpresaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [empresa] = await db.select().from(empresasTable).where(eq(empresasTable.id, params.data.id));
  if (!empresa) {
    res.status(404).json({ error: "Empresa não encontrada" });
    return;
  }

  res.json({ ...empresa, portal_url: getPortalUrl(empresa.slug), download_url: getDownloadUrl(empresa.slug) });
});

router.put("/empresas/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateEmpresaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = UpdateEmpresaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const extraFields: any = {};
  if (typeof req.body.chave_pix === "string" || req.body.chave_pix === null) {
    extraFields.chave_pix = req.body.chave_pix ?? null;
  }
  if (typeof req.body.mensagem_lembrete === "string" || req.body.mensagem_lembrete === null) {
    extraFields.mensagem_lembrete = req.body.mensagem_lembrete || null;
  }
  if (typeof req.body.mp_access_token === "string" || req.body.mp_access_token === null) {
    extraFields.mp_access_token = req.body.mp_access_token || null;
  }
  if (req.body.percentual_sinal !== undefined) {
    const pct = req.body.percentual_sinal;
    extraFields.percentual_sinal = (pct !== null && pct !== "" && pct !== "0") ? (parseFloat(String(pct)) || null) : null;
  }
  if (typeof req.body.descricao === "string" || req.body.descricao === null) {
    extraFields.descricao = req.body.descricao || null;
  }
  if (typeof req.body.horario_funcionamento === "string" || req.body.horario_funcionamento === null) {
    extraFields.horario_funcionamento = req.body.horario_funcionamento || null;
  }
  if (typeof req.body.instagram === "string" || req.body.instagram === null) {
    extraFields.instagram = req.body.instagram || null;
  }
  if (typeof req.body.whatsapp === "string" || req.body.whatsapp === null) {
    extraFields.whatsapp = req.body.whatsapp || null;
  }
  if (req.body.pontos_por_real !== undefined) {
    extraFields.pontos_por_real = req.body.pontos_por_real != null ? (parseFloat(String(req.body.pontos_por_real)) || 0) : 0;
  }
  if (req.body.pontos_para_desconto !== undefined) {
    extraFields.pontos_para_desconto = req.body.pontos_para_desconto != null ? (parseInt(String(req.body.pontos_para_desconto)) || 100) : 100;
  }
  if (req.body.pontos_valor_desconto !== undefined) {
    extraFields.pontos_valor_desconto = req.body.pontos_valor_desconto != null ? (parseFloat(String(req.body.pontos_valor_desconto)) || 10) : 10;
  }

  const [empresa] = await db
    .update(empresasTable)
    .set({ ...parsed.data, ...extraFields })
    .where(eq(empresasTable.id, params.data.id))
    .returning();

  if (!empresa) {
    res.status(404).json({ error: "Empresa não encontrada" });
    return;
  }

  res.json({ ...empresa, portal_url: getPortalUrl(empresa.slug), download_url: getDownloadUrl(empresa.slug) });
});

export default router;
