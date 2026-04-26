import { pgTable, text, serial, timestamp, varchar, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const usersTable = pgTable("users", {
  username: varchar("username", { length: 50 }).primaryKey(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roomsTable = pgTable("rooms", {
  key: varchar("key", { length: 150 }).primaryKey(),
  userA: varchar("user_a", { length: 50 }).notNull().references(() => usersTable.username),
  userB: varchar("user_b", { length: 50 }).notNull().references(() => usersTable.username),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messagesTable = pgTable("messages", {
  id: varchar("id", { length: 50 }).primaryKey(),
  roomKey: varchar("room_key", { length: 150 }).notNull().references(() => roomsTable.key),
  senderUsername: varchar("sender_username", { length: 50 }).notNull().references(() => usersTable.username),
  type: varchar("type", { length: 20 }).notNull(), // text, image, video, voice, like
  content: text("content").notNull(),
  replyToId: varchar("reply_to_id", { length: 50 }),
  voiceMeta: jsonb("voice_meta"), // { duration, peaks }
  isUnsent: boolean("is_unsent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reactionsTable = pgTable("reactions", {
  id: serial("id").primaryKey(),
  messageId: varchar("message_id", { length: 50 }).notNull().references(() => messagesTable.id),
  userId: varchar("user_id", { length: 50 }).notNull().references(() => usersTable.username),
  emoji: varchar("emoji", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type Room = typeof roomsTable.$inferSelect;
export type MessageRow = typeof messagesTable.$inferSelect;
export type ReactionRow = typeof reactionsTable.$inferSelect;