import cron from "node-cron";
import { db, agendamentosTable, clientesTable, empresasTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { enviarMensagem, zapiConfigurado } from "../services/whatsapp.js";
import { gerarTokenAcao } from "../routes/portal.js";

export const DEFAULT_MENSAGEM_LEMBRETE =
  `Olá, {nome}! ✨\n\n` +
  `Estamos super animados para te receber! 🤩\n\n` +
  `Aqui está o resumo do seu atendimento no *{empresa}*:\n\n` +
  `📅 *{data}* às *{hora}*\n` +
  `✂️ Serviço: *{servico}*\n\n` +
  `Por favor, confirme sua presença para garantirmos tudo certinho para você:\n\n` +
  `✅ Confirmar presença:\n{link_confirmar}\n\n` +
  `📅 Precisa reagendar? Sem problema:\n{link_reagendar}\n\n` +
  `❌ Cancelar:\n{link_cancelar}\n\n` +
  `⚠️ *Atenção:* agendamentos não confirmados são cancelados automaticamente *24h antes* do horário marcado.\n\n` +
  `Te esperamos com muito carinho! 💛`;

function daquiNDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0]!;
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${parseInt(dia!)} de ${meses[parseInt(mes!) - 1]} de ${ano}`;
}

function baseUrl(): string {
  const domain = process.env["REPLIT_DOMAINS"] || process.env["APP_DOMAIN"] || "localhost";
  return `https://${domain}`;
}

function urlConfirmar(agendamentoId: number, empresaId: number): string {
  const token = gerarTokenAcao(agendamentoId, empresaId, "confirmar");
  return `${baseUrl()}/api/portal/acao?t=${token}`;
}

function urlCancelar(agendamentoId: number, empresaId: number): string {
  const token = gerarTokenAcao(agendamentoId, empresaId, "cancelar");
  return `${baseUrl()}/api/portal/acao?t=${token}`;
}

function urlReagendar(empresaSlug: string): string {
  return `${baseUrl()}/portal/${empresaSlug}`;
}

function montarMensagem(
  template: string,
  vars: {
    nome: string;
    empresa: string;
    data: string;
    hora: string;
    servico: string;
    link_confirmar: string;
    link_reagendar: string;
    link_cancelar: string;
  }
): string {
  return template
    .replace(/{nome}/g, vars.nome)
    .replace(/{empresa}/g, vars.empresa)
    .replace(/{data}/g, vars.data)
    .replace(/{hora}/g, vars.hora)
    .replace(/{servico}/g, vars.servico)
    .replace(/{link_confirmar}/g, vars.link_confirmar)
    .replace(/{link_reagendar}/g, vars.link_reagendar)
    .replace(/{link_cancelar}/g, vars.link_cancelar);
}

async function enviarLembretes(): Promise<void> {
  if (!zapiConfigurado()) {
    console.info("[Lembretes] Z-API não configurado, pulando envio.");
    return;
  }

  const dataAlvo = daquiNDias(2);
  console.info(`[Lembretes] Verificando agendamentos para ${dataAlvo}...`);

  const agendamentos = await db
    .select({
      id: agendamentosTable.id,
      empresa_id: agendamentosTable.empresa_id,
      servico: agendamentosTable.servico,
      hora_inicio: agendamentosTable.hora_inicio,
      cliente_nome: clientesTable.nome,
      cliente_telefone: clientesTable.telefone,
      empresa_nome: empresasTable.nome,
      empresa_slug: empresasTable.slug,
      mensagem_lembrete: empresasTable.mensagem_lembrete,
    })
    .from(agendamentosTable)
    .innerJoin(clientesTable, eq(agendamentosTable.cliente_id, clientesTable.id))
    .innerJoin(empresasTable, eq(agendamentosTable.empresa_id, empresasTable.id))
    .where(
      and(
        eq(agendamentosTable.data, dataAlvo),
        sql`${agendamentosTable.status} NOT IN ('cancelado', 'concluido')`
      )
    );

  console.info(`[Lembretes] ${agendamentos.length} agendamento(s) encontrado(s).`);

  for (const ag of agendamentos) {
    if (!ag.cliente_telefone) {
      console.info(`[Lembretes] Agendamento #${ag.id} sem telefone, ignorando.`);
      continue;
    }

    const template = ag.mensagem_lembrete?.trim() || DEFAULT_MENSAGEM_LEMBRETE;
    const primeiroNome = ag.cliente_nome.split(" ")[0]!;

    const mensagem = montarMensagem(template, {
      nome: primeiroNome,
      empresa: ag.empresa_nome,
      data: formatarData(dataAlvo),
      hora: ag.hora_inicio,
      servico: ag.servico,
      link_confirmar: urlConfirmar(ag.id, ag.empresa_id),
      link_reagendar: urlReagendar(ag.empresa_slug),
      link_cancelar: urlCancelar(ag.id, ag.empresa_id),
    });

    await enviarMensagem(ag.cliente_telefone, mensagem);
  }
}

async function cancelarNaoConfirmados(): Promise<void> {
  const amanha = daquiNDias(1);
  console.info(`[AutoCancel] Verificando agendamentos não confirmados para ${amanha}...`);

  const pendentes = await db
    .select({ id: agendamentosTable.id, cliente_nome: clientesTable.nome, empresa_nome: empresasTable.nome })
    .from(agendamentosTable)
    .innerJoin(clientesTable, eq(agendamentosTable.cliente_id, clientesTable.id))
    .innerJoin(empresasTable, eq(agendamentosTable.empresa_id, empresasTable.id))
    .where(
      and(
        eq(agendamentosTable.data, amanha),
        eq(agendamentosTable.status, "agendado")
      )
    );

  console.info(`[AutoCancel] ${pendentes.length} agendamento(s) sem confirmação.`);

  for (const ag of pendentes) {
    await db
      .update(agendamentosTable)
      .set({ status: "cancelado" })
      .where(eq(agendamentosTable.id, ag.id));
    console.info(`[AutoCancel] Agendamento #${ag.id} (${ag.cliente_nome} - ${ag.empresa_nome}) cancelado por falta de confirmação.`);
  }
}

export function iniciarJobLembretes(): void {
  cron.schedule("0 9 * * *", async () => {
    console.info("[Lembretes] Iniciando job de lembretes...");
    try {
      await enviarLembretes();
    } catch (err) {
      console.error("[Lembretes] Erro no job:", err);
    }
  });

  cron.schedule("0 10 * * *", async () => {
    console.info("[AutoCancel] Iniciando cancelamento automático...");
    try {
      await cancelarNaoConfirmados();
    } catch (err) {
      console.error("[AutoCancel] Erro no job:", err);
    }
  });

  console.info("[Lembretes] Jobs agendados: lembretes às 9h, cancelamento automático às 10h.");
}

export { enviarLembretes };
