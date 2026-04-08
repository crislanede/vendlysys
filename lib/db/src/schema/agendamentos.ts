import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { empresasTable } from "./empresas";
import { clientesTable } from "./clientes";

export const agendamentosTable = pgTable("agendamentos", {
  id: serial("id").primaryKey(),
  empresa_id: integer("empresa_id").notNull().references(() => empresasTable.id),
  cliente_id: integer("cliente_id").references(() => clientesTable.id),
  profissional_id: integer("profissional_id"),
  servico: text("servico").notNull(),
  data: text("data").notNull(),
  hora_inicio: text("hora_inicio").notNull(),
  hora_fim: text("hora_fim"),
  valor: numeric("valor", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("agendado"),
  forma_pagamento: text("forma_pagamento"),
  pago: boolean("pago").notNull().default(false),
  observacoes: text("observacoes"),
  mp_payment_id: text("mp_payment_id"),
  mp_preference_id: text("mp_preference_id"),
  sinal_pago: text("sinal_pago").default("nao"),
  sinal_valor: numeric("sinal_valor", { precision: 10, scale: 2 }),
  sinal_mp_payment_id: text("sinal_mp_payment_id"),
  sinal_pix_code: text("sinal_pix_code"),
  sinal_expira_em: text("sinal_expira_em"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAgendamentoSchema = createInsertSchema(agendamentosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAgendamento = z.infer<typeof insertAgendamentoSchema>;
export type Agendamento = typeof agendamentosTable.$inferSelect;
