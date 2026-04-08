import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, servicosTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/servicos", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const { ativo } = req.query;

  let rows = await db
    .select()
    .from(servicosTable)
    .where(eq(servicosTable.empresa_id, usuario.empresa_id));

  if (ativo === "true") rows = rows.filter((s) => s.ativo);
  if (ativo === "false") rows = rows.filter((s) => !s.ativo);

  res.json(
    rows.map((s) => ({
      ...s,
      valor: Number(s.valor),
      preco_promocional: s.preco_promocional != null ? Number(s.preco_promocional) : null,
    }))
  );
});

router.post("/servicos", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const { nome, categoria, descricao, duracao_minutos, valor, preco_promocional, preco_descricao, ativo } = req.body ?? {};

  if (!nome) {
    res.status(400).json({ error: "Nome é obrigatório." });
    return;
  }

  const valorNum = parseFloat(String(valor || "0").replace(",", "."));
  if (isNaN(valorNum) || valorNum < 0) {
    res.status(400).json({ error: "Valor inválido." });
    return;
  }

  const promoNum = preco_promocional ? parseFloat(String(preco_promocional).replace(",", ".")) : null;

  const [servico] = await db
    .insert(servicosTable)
    .values({
      empresa_id: usuario.empresa_id,
      nome: String(nome).trim(),
      categoria: categoria ? String(categoria).trim() : "Geral",
      descricao: descricao ? String(descricao).trim() : null,
      duracao_minutos: parseInt(duracao_minutos) || 60,
      valor: String(valorNum),
      preco_promocional: promoNum != null ? String(promoNum) : null,
      preco_descricao: preco_descricao ? String(preco_descricao).trim() : null,
      ativo: ativo !== false,
    })
    .returning();

  res.status(201).json({
    ...servico,
    valor: Number(servico.valor),
    preco_promocional: servico.preco_promocional != null ? Number(servico.preco_promocional) : null,
  });
});

router.put("/servicos/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const { nome, categoria, descricao, duracao_minutos, valor, preco_promocional, preco_descricao, ativo } = req.body ?? {};
  const updates: Record<string, any> = {};

  if (nome !== undefined) updates.nome = String(nome).trim();
  if (categoria !== undefined) updates.categoria = String(categoria).trim() || "Geral";
  if (descricao !== undefined) updates.descricao = descricao ? String(descricao).trim() : null;
  if (duracao_minutos !== undefined) updates.duracao_minutos = parseInt(duracao_minutos) || 60;
  if (valor !== undefined) {
    const v = parseFloat(String(valor).replace(",", "."));
    if (!isNaN(v)) updates.valor = String(v);
  }
  if (preco_promocional !== undefined) {
    const p = preco_promocional ? parseFloat(String(preco_promocional).replace(",", ".")) : null;
    updates.preco_promocional = p != null && !isNaN(p) ? String(p) : null;
  }
  if (preco_descricao !== undefined) updates.preco_descricao = preco_descricao ? String(preco_descricao).trim() : null;
  if (ativo !== undefined) updates.ativo = Boolean(ativo);

  const [servico] = await db
    .update(servicosTable)
    .set(updates)
    .where(and(eq(servicosTable.id, id), eq(servicosTable.empresa_id, usuario.empresa_id)))
    .returning();

  if (!servico) { res.status(404).json({ error: "Serviço não encontrado" }); return; }

  res.json({
    ...servico,
    valor: Number(servico.valor),
    preco_promocional: servico.preco_promocional != null ? Number(servico.preco_promocional) : null,
  });
});

router.post("/servicos/importar", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const { servicos } = req.body ?? {};

  if (!Array.isArray(servicos) || servicos.length === 0) {
    res.status(400).json({ error: "Nenhum serviço enviado." });
    return;
  }

  if (servicos.length > 500) {
    res.status(400).json({ error: "Máximo 500 serviços por importação." });
    return;
  }

  let criados = 0;
  const erros: string[] = [];

  for (let i = 0; i < servicos.length; i++) {
    const s = servicos[i];
    const linha = i + 2;

    const nome = String(s.nome ?? "").trim();
    if (!nome) { erros.push(`Linha ${linha}: nome é obrigatório.`); continue; }

    const valor = parseFloat(String(s.valor ?? "0").replace(",", "."));
    if (isNaN(valor) || valor < 0) { erros.push(`Linha ${linha}: valor inválido ("${s.valor}").`); continue; }

    const promo = s.preco_promocional ? parseFloat(String(s.preco_promocional).replace(",", ".")) : null;
    const duracaoRaw = s.duracao_minutos ?? s.duracao_padrao_minutos;
    const duracao = duracaoRaw ? parseInt(String(duracaoRaw)) : 60;

    try {
      await db.insert(servicosTable).values({
        empresa_id: usuario.empresa_id,
        nome,
        categoria: s.categoria ? String(s.categoria).trim() : "Geral",
        descricao: s.descricao ? String(s.descricao).trim() : null,
        duracao_minutos: isNaN(duracao) ? 60 : duracao,
        valor: String(valor),
        preco_promocional: promo != null && !isNaN(promo) ? String(promo) : null,
        preco_descricao: s.preco_descricao ? String(s.preco_descricao).trim() : null,
        ativo: String(s.ativo).toLowerCase() !== "false" && s.ativo !== false && s.ativo !== 0,
      });
      criados++;
    } catch (err: any) {
      erros.push(`Linha ${linha}: erro ao salvar (${err?.message ?? "desconhecido"}).`);
    }
  }

  res.json({ criados, erros: erros.length, detalhes: erros.slice(0, 20) });
});

router.delete("/servicos/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  await db.delete(servicosTable).where(and(eq(servicosTable.id, id), eq(servicosTable.empresa_id, usuario.empresa_id)));
  res.sendStatus(204);
});

export default router;
