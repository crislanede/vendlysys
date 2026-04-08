import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { empresasTable } from "./empresas";
import { usuariosTable } from "./usuarios";

export const pushTokensTable = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  empresa_id: integer("empresa_id").notNull().references(() => empresasTable.id, { onDelete: "cascade" }),
  usuario_id: integer("usuario_id").references(() => usuariosTable.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 512 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});
