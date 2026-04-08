import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { empresasTable } from "./empresas";

export const servicosTable = pgTable("servicos", {
  id: serial("id").primaryKey(),
  empresa_id: integer("empresa_id").notNull().references(() => empresasTable.id),
  nome: text("nome").notNull(),
  categoria: text("categoria").notNull().default("Geral"),
  descricao: text("descricao"),
  duracao_minutos: integer("duracao_minutos").notNull().default(60),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  preco_promocional: numeric("preco_promocional", { precision: 10, scale: 2 }),
  preco_descricao: text("preco_descricao"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertServicoSchema = createInsertSchema(servicosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertServico = z.infer<typeof insertServicoSchema>;
export type Servico = typeof servicosTable.$inferSelect;
