import { db, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function enviarPushParaEmpresa(
  empresa_id: number,
  mensagem: PushMessage,
): Promise<void> {
  const usuarios = await db
    .select({ push_token: usuariosTable.push_token })
    .from(usuariosTable)
    .where(eq(usuariosTable.empresa_id, empresa_id));

  const tokens = usuarios
    .map((u) => u.push_token)
    .filter((t): t is string => !!t && t.startsWith("ExponentPushToken"));

  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({
    to,
    title: mensagem.title,
    body: mensagem.body,
    sound: "default",
    data: mensagem.data ?? {},
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
  } catch {
  }
}
