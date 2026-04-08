import { db, agendamentosTable } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";

function toMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export async function temConflitoProfissional(opts: {
  empresa_id: number;
  profissional_id: number;
  data: string;
  hora_inicio: string;
  hora_fim: string | null | undefined;
  excluir_id?: number;
}): Promise<boolean> {
  const { empresa_id, profissional_id, data, hora_inicio, hora_fim, excluir_id } = opts;

  const inicioNovo = toMinutos(hora_inicio);
  const fimNovo = hora_fim ? toMinutos(hora_fim) : inicioNovo + 60;

  const conditions = [
    eq(agendamentosTable.empresa_id, empresa_id),
    eq(agendamentosTable.profissional_id, profissional_id),
    eq(agendamentosTable.data, data),
    ne(agendamentosTable.status, "cancelado"),
  ];

  if (excluir_id != null) {
    conditions.push(ne(agendamentosTable.id, excluir_id));
  }

  const agendamentos = await db
    .select({
      hora_inicio: agendamentosTable.hora_inicio,
      hora_fim: agendamentosTable.hora_fim,
    })
    .from(agendamentosTable)
    .where(and(...conditions));

  for (const ag of agendamentos) {
    if (!ag.hora_inicio) continue;
    const inicioEx = toMinutos(ag.hora_inicio);
    const fimEx = ag.hora_fim ? toMinutos(ag.hora_fim) : inicioEx + 60;
    if (inicioNovo < fimEx && fimNovo > inicioEx) {
      return true;
    }
  }

  return false;
}
