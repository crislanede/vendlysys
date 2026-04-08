import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { empresasTable } from "./empresas";

export const despesasTable = pgTable("despesas", {
  id: serial("id").primaryKey(),
  empresa_id: integer("empresa_id").notNull().references(() => empresasTable.id),
  descricao: text("descricao").notNull(),
  categoria: text("categoria").notNull().default("outros"),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  data: text("data").notNull(),
  pago: boolean("pago").notNull().default(false),
  forma_pagamento: text("forma_pagamento"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDespesaSchema = createInsertSchema(despesasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDespesa = z.infer<typeof insertDespesaSchema>;
export type Despesa = typeof despesasTable.$inferSelect;
