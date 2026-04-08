const INSTANCE_ID = process.env["ZAPI_INSTANCE_ID"] || "";
const INSTANCE_TOKEN = process.env["ZAPI_INSTANCE_TOKEN"] || "";
const CLIENT_TOKEN = process.env["ZAPI_CLIENT_TOKEN"] || ""; // opcional

const BASE = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}`;

export function zapiConfigurado(): boolean {
  return !!(INSTANCE_ID && INSTANCE_TOKEN);
}

function normalizarTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export async function enviarMensagem(telefone: string, mensagem: string): Promise<boolean> {
  if (!zapiConfigurado()) {
    console.warn("[WhatsApp] Z-API não configurado — ZAPI_INSTANCE_ID e ZAPI_INSTANCE_TOKEN ausentes.");
    return false;
  }

  const phone = normalizarTelefone(telefone);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (CLIENT_TOKEN) headers["Client-Token"] = CLIENT_TOKEN;

    const res = await fetch(`${BASE}/send-text`, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone, message: mensagem }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[WhatsApp] Erro ao enviar para ${phone}: ${res.status} ${body}`);
      return false;
    }

    console.info(`[WhatsApp] Mensagem enviada para ${phone}`);
    return true;
  } catch (err) {
    console.error(`[WhatsApp] Falha na requisição para ${phone}:`, err);
    return false;
  }
}

export function mensagemLembrete(params: {
  clienteNome: string;
  empresaNome: string;
  servico: string;
  data: string;
  hora: string;
  portalUrl: string;
}): string {
  const primeiroNome = params.clienteNome.split(" ")[0];
  return (
    `Olá, ${primeiroNome}! 😊\n\n` +
    `Lembramos que você tem um agendamento em *${params.empresaNome}*:\n\n` +
    `📅 *${params.data}* às *${params.hora}*\n` +
    `✂️ Serviço: *${params.servico}*\n\n` +
    `Precisa reagendar ou cancelar? Acesse:\n${params.portalUrl}\n\n` +
    `Até logo! 🌟`
  );
}

export function mensagemAniversario(params: {
  clienteNome: string;
  empresaNome: string;
}): string {
  const primeiroNome = params.clienteNome.split(" ")[0];
  return (
    `Feliz aniversário, ${primeiroNome}! 🎂🎉\n\n` +
    `Toda a equipe da *${params.empresaNome}* deseja um dia incrível para você!\n\n` +
    `Que tal se presentear com um mimo especial? Agende seu horário conosco! 💅✨`
  );
}
