import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const empresasTable = pgTable("empresas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  slug: text("slug").notNull().unique(),
  cor_primaria: text("cor_primaria").default("#7C3AED"),
  cor_secundaria: text("cor_secundaria").default("#5B21B6"),
  logo_url: text("logo_url"),
  telefone: text("telefone"),
  endereco: text("endereco"),
  chave_pix: text("chave_pix"),
  descricao: text("descricao"),
  horario_funcionamento: text("horario_funcionamento"),
  instagram: text("instagram"),
  whatsapp: text("whatsapp"),
  mensagem_lembrete: text("mensagem_lembrete"),
  mp_access_token: text("mp_access_token"),
  percentual_sinal: numeric("percentual_sinal", { precision: 5, scale: 2 }),
  pontos_por_real: numeric("pontos_por_real", { precision: 5, scale: 2 }).default("0"),
  pontos_para_desconto: integer("pontos_para_desconto").default(100),
  pontos_valor_desconto: numeric("pontos_valor_desconto", { precision: 10, scale: 2 }).default("10"),
  plano_status: text("plano_status").default("trial"),
  plano_expira_em: timestamp("plano_expira_em", { withTimezone: true }),
  plano_inicio_em: timestamp("plano_inicio_em", { withTimezone: true }),
  termos_aceitos_em: timestamp("termos_aceitos_em", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEmpresaSchema = createInsertSchema(empresasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmpresa = z.infer<typeof insertEmpresaSchema>;
export type Empresa = typeof empresasTable.$inferSelect;
