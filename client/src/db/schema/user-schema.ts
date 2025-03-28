import { int, sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("users_table", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  username: text().unique().notNull(),
  avatar: text(),
  bio: text(),
  email: text().notNull().unique(),

  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export type UserSelect = typeof user.$inferSelect;
