import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { empresasTable } from "./empresas";

export const bloqueiosAgendaTable = pgTable("bloqueios_agenda", {
  id: serial("id").primaryKey(),
  empresa_id: integer("empresa_id").notNull().references(() => empresasTable.id),
  data: text("data").notNull(),
  hora_inicio: text("hora_inicio"),
  hora_fim: text("hora_fim"),
  motivo: text("motivo"),
  criado_em: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type BloqueioAgenda = typeof bloqueiosAgendaTable.$inferSelect;
