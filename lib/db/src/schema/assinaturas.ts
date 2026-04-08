import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { empresasTable } from "./empresas";

export const assinaturasTable = pgTable("assinaturas", {
  id: serial("id").primaryKey(),
  empresa_id: integer("empresa_id").notNull().references(() => empresasTable.id),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull().default("50.00"),
  status: text("status").notNull().default("pending"),
  payment_id: text("payment_id"),
  qr_code: text("qr_code"),
  qr_code_text: text("qr_code_text"),
  competencia: text("competencia"),
  pago_em: timestamp("pago_em", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Assinatura = typeof assinaturasTable.$inferSelect;
