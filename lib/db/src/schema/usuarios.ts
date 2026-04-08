import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { empresasTable } from "./empresas";

export const usuariosTable = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  empresa_id: integer("empresa_id").notNull().references(() => empresasTable.id),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  telefone: text("telefone"),
  senha_hash: text("senha_hash").notNull(),
  perfil: text("perfil").notNull().default("agenda"),
  ativo: boolean("ativo").notNull().default(true),
  push_token: text("push_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUsuarioSchema = createInsertSchema(usuariosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type Usuario = typeof usuariosTable.$inferSelect;
