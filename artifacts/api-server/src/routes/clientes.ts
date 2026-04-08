import { Router, type IRouter } from "express";
import { eq, and, sql, ne } from "drizzle-orm";
import { db, clientesTable, agendamentosTable, empresasTable } from "@workspace/db";
import {
  ListClientesQueryParams,
  GetClienteParams,
  UpdateClienteParams,
  DeleteClienteParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { zapiConfigurado, enviarMensagem } from "../services/whatsapp";

const router: IRouter = Router();

router.get("/clientes", requireAuth, async (req, res): Promise<void> => {
  const queryParams = ListClientesQueryParams.safeParse(req.query);
  const usuario = (req as any).usuario;

  const clientes = await db
    .select({
      id: clientesTable.id,
      nome: clientesTable.nome,
      telefone: clientesTable.telefone,
      email: clientesTable.email,
      empresa_id: clientesTable.empresa_id,
      data_nascimento: clientesTable.data_nascimento,
      endereco: clientesTable.endereco,
      cep: clientesTable.cep,
      logradouro: clientesTable.logradouro,
      numero: clientesTable.numero,
      complemento: clientesTable.complemento,
      bairro: clientesTable.bairro,
      cidade: clientesTable.cidade,
      estado: clientesTable.estado,
      observacoes: clientesTable.observacoes,
      pontos: clientesTable.pontos,
    })
    .from(clientesTable)
    .where(eq(clientesTable.empresa_id, usuario.empresa_id));

  const clientesComStats = await Promise.all(
    clientes.map(async (c) => {
      const [stats] = await db
        .select({
          total_agendamentos: sql<number>`count(*)::int`,
          total_gasto: sql<number>`coalesce(sum(${agendamentosTable.valor}::numeric), 0)`,
        })
        .from(agendamentosTable)
        .where(
          and(
            eq(agendamentosTable.cliente_id, c.id),
            eq(agendamentosTable.status, "concluido")
          )
        );
      return {
        ...c,
        total_agendamentos: stats?.total_agendamentos ?? 0,
        total_gasto: Number(stats?.total_gasto ?? 0),
      };
    })
  );

  const search = queryParams.success ? queryParams.data.search : undefined;
  const result = search
    ? clientesComStats.filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()))
    : clientesComStats;

  res.json(result);
});

function extrairCamposCliente(body: any) {
  const campos: Record<string, any> = {};
  const strings = ["nome", "telefone", "email", "data_nascimento", "endereco", "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "estado", "observacoes"];
  for (const campo of strings) {
    if (body[campo] !== undefined) {
      campos[campo] = body[campo] ? String(body[campo]).trim() : null;
    }
  }
  // Compor endereco legível a partir dos campos estruturados
  if ((campos.logradouro || campos.cep) && !campos.endereco) {
    const partes = [
      campos.logradouro,
      campos.numero && `nº ${campos.numero}`,
      campos.complemento,
      campos.bairro,
      campos.cidade && campos.estado ? `${campos.cidade}/${campos.estado}` : campos.cidade || campos.estado,
      campos.cep,
    ].filter(Boolean);
    if (partes.length > 0) campos.endereco = partes.join(", ");
  }
  return campos;
}

router.post("/clientes", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const campos = extrairCamposCliente(req.body);

  if (!campos.nome) {
    res.status(400).json({ error: "O nome é obrigatório." });
    return;
  }

  const [cliente] = await db
    .insert(clientesTable)
    .values({ ...campos, empresa_id: usuario.empresa_id })
    .returning();

  res.status(201).json({ ...cliente, total_agendamentos: 0, total_gasto: 0 });

  if (campos.telefone && zapiConfigurado()) {
    try {
      const [empresa] = await db
        .select({ nome: empresasTable.nome, slug: empresasTable.slug })
        .from(empresasTable)
        .where(eq(empresasTable.id, usuario.empresa_id));

      if (empresa) {
        const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? process.env.REPLIT_DEV_DOMAIN ?? "";
        const downloadUrl = domain
          ? `https://${domain}/vendlysys/baixar/${empresa.slug}`
          : "";

        const primeiroNome = String(campos.nome).split(" ")[0];
        let mensagem = `Ola, ${primeiroNome}! 👋\n\nSeja bem-vindo(a) ao ${empresa.nome}!\n\nVoce ja pode agendar horarios, consultar seu historico e muito mais:`;

        if (downloadUrl) {
          mensagem += `\n\n📲 Acesse aqui:\n${downloadUrl}`;
        }

        mensagem += `\n\nQualquer duvida, estamos a disposicao!`;

        enviarMensagem(campos.telefone, mensagem).catch(() => {});
      }
    } catch {
    }
  }
});

router.get("/clientes/aniversariantes", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const aniversariantes = await db
    .select({
      id: clientesTable.id,
      nome: clientesTable.nome,
      telefone: clientesTable.telefone,
      data_nascimento: clientesTable.data_nascimento,
    })
    .from(clientesTable)
    .where(
      and(
        eq(clientesTable.empresa_id, usuario.empresa_id),
        sql`data_nascimento IS NOT NULL AND data_nascimento != ''`,
        sql`EXTRACT(MONTH FROM data_nascimento::date) = EXTRACT(MONTH FROM CURRENT_DATE)`
      )
    )
    .orderBy(sql`EXTRACT(DAY FROM data_nascimento::date)`);

  res.json(aniversariantes);
});

router.get("/clientes/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetClienteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const usuario = (req as any).usuario;
  const [cliente] = await db
    .select()
    .from(clientesTable)
    .where(and(eq(clientesTable.id, params.data.id), eq(clientesTable.empresa_id, usuario.empresa_id)));

  if (!cliente) {
    res.status(404).json({ error: "Cliente não encontrado" });
    return;
  }

  const [stats] = await db
    .select({
      total_agendamentos: sql<number>`count(*)::int`,
      total_gasto: sql<number>`coalesce(sum(${agendamentosTable.valor}::numeric), 0)`,
    })
    .from(agendamentosTable)
    .where(and(eq(agendamentosTable.cliente_id, cliente.id), eq(agendamentosTable.status, "concluido")));

  res.json({
    ...cliente,
    total_agendamentos: stats?.total_agendamentos ?? 0,
    total_gasto: Number(stats?.total_gasto ?? 0),
  });
});

router.put("/clientes/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateClienteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const usuario = (req as any).usuario;
  const campos = extrairCamposCliente(req.body);

  if (Object.keys(campos).length === 0) {
    res.status(400).json({ error: "Nenhum campo para atualizar." });
    return;
  }

  const [cliente] = await db
    .update(clientesTable)
    .set(campos)
    .where(and(eq(clientesTable.id, params.data.id), eq(clientesTable.empresa_id, usuario.empresa_id)))
    .returning();

  if (!cliente) {
    res.status(404).json({ error: "Cliente não encontrado" });
    return;
  }

  res.json({ ...cliente, total_agendamentos: 0, total_gasto: 0 });
});

router.delete("/clientes/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteClienteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const usuario = (req as any).usuario;
  const forcar = req.query.force === "true" && usuario.perfil === "admin";

  // Contar agendamentos não-concluídos (serão removidos) e concluídos (serão preservados)
  const [countNaoConcluidos] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(agendamentosTable)
    .where(and(
      eq(agendamentosTable.cliente_id, params.data.id),
      eq(agendamentosTable.empresa_id, usuario.empresa_id),
      ne(agendamentosTable.status, "concluido"),
    ));

  const [countConcluidos] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(agendamentosTable)
    .where(and(
      eq(agendamentosTable.cliente_id, params.data.id),
      eq(agendamentosTable.empresa_id, usuario.empresa_id),
      eq(agendamentosTable.status, "concluido"),
    ));

  const totalNaoConcluidos = countNaoConcluidos?.total ?? 0;
  const totalConcluidos = countConcluidos?.total ?? 0;
  const totalGeral = totalNaoConcluidos + totalConcluidos;

  if (totalGeral > 0) {
    if (!forcar) {
      res.status(409).json({
        error: `Este cliente possui ${totalGeral} agendamento(s). Ao confirmar: ${totalNaoConcluidos} serão removidos e ${totalConcluidos} concluído(s) serão preservados no histórico.`,
        total_agendamentos: totalGeral,
        total_nao_concluidos: totalNaoConcluidos,
        total_concluidos: totalConcluidos,
      });
      return;
    }

    // Preservar concluídos: nulificar cliente_id para manter histórico financeiro
    if (totalConcluidos > 0) {
      await db
        .update(agendamentosTable)
        .set({ cliente_id: null })
        .where(and(
          eq(agendamentosTable.cliente_id, params.data.id),
          eq(agendamentosTable.empresa_id, usuario.empresa_id),
          eq(agendamentosTable.status, "concluido"),
        ));
    }

    // Remover agendamentos não-concluídos
    if (totalNaoConcluidos > 0) {
      await db
        .delete(agendamentosTable)
        .where(and(
          eq(agendamentosTable.cliente_id, params.data.id),
          eq(agendamentosTable.empresa_id, usuario.empresa_id),
          ne(agendamentosTable.status, "concluido"),
        ));
    }
  }

  await db
    .delete(clientesTable)
    .where(and(eq(clientesTable.id, params.data.id), eq(clientesTable.empresa_id, usuario.empresa_id)));

  res.sendStatus(204);
});

export default router;
