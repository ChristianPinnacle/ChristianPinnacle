import { mysqlTable, varchar, int, float, boolean, json, mysqlEnum } from 'drizzle-orm/mysql-core';

export const notesIndex = mysqlTable('notes_index', {
  path: varchar('path', { length: 512 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  folder: varchar('folder', { length: 64 }).notNull(),
  updated: varchar('updated', { length: 10 }).notNull(),
  wordCount: int('word_count').notNull().default(0),
  plScore: int('pl_score').notNull().default(500),
});

export const links = mysqlTable('links', {
  sourcePath: varchar('source_path', { length: 512 }).notNull(),
  targetPath: varchar('target_path', { length: 512 }).notNull(),
  type: mysqlEnum('type', ['wiki', 'ai']).notNull(),
  confidence: float('confidence'),
  accepted: boolean('accepted'),
});

export const embeddings = mysqlTable('embeddings', {
  path: varchar('path', { length: 512 }).notNull(),
  chunkIdx: int('chunk_idx').notNull(),
  text: varchar('text', { length: 4096 }).notNull(),
  vector: json('vector').notNull(),
});
