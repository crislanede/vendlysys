import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { empresasTable } from "./empresas";

export const profissionaisTable = pgTable("profissionais", {
  id: serial("id").primaryKey(),
  empresa_id: integer("empresa_id").notNull().references(() => empresasTable.id),
  nome: text("nome").notNull(),
  telefone: text("telefone"),
  email: text("email"),
  especialidade: text("especialidade"),
  ativo: boolean("ativo").notNull().default(true),
  comissao_percentual: numeric("comissao_percentual", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Profissional = typeof profissionaisTable.$inferSelect;
