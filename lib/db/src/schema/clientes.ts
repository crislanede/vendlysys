import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { empresasTable } from "./empresas";

export const clientesTable = pgTable("clientes", {
  id: serial("id").primaryKey(),
  empresa_id: integer("empresa_id").notNull().references(() => empresasTable.id),
  nome: text("nome").notNull(),
  telefone: text("telefone"),
  email: text("email"),
  data_nascimento: text("data_nascimento"),
  endereco: text("endereco"),
  cep: text("cep"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  estado: text("estado"),
  observacoes: text("observacoes"),
  pontos: integer("pontos").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClienteSchema = createInsertSchema(clientesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Cliente = typeof clientesTable.$inferSelect;
