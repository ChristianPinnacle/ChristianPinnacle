import { eq } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import type { VaultIndex } from './types';

type Db = MySql2Database<typeof schema>;

export async function writeVaultIndex(db: Db, index: VaultIndex): Promise<void> {
  await db.delete(schema.links).where(eq(schema.links.type, 'wiki'));
  await db.delete(schema.notesIndex);

  if (index.notes.length > 0) {
    await db.insert(schema.notesIndex).values(
      index.notes.map((note) => ({
        path: note.path,
        title: note.title,
        folder: note.folder,
        updated: note.updated,
        wordCount: note.wordCount,
        plScore: note.plScore,
      })),
    );
  }

  if (index.links.length > 0) {
    await db.insert(schema.links).values(
      index.links.map((link) => ({
        sourcePath: link.sourcePath,
        targetPath: link.targetPath,
        type: link.type,
        confidence: null,
        accepted: null,
      })),
    );
  }
}

export async function readVaultIndexFromDb(db: Db): Promise<VaultIndex> {
  const notes = await db.select().from(schema.notesIndex);
  const wikiLinks = await db
    .select()
    .from(schema.links)
    .where(eq(schema.links.type, 'wiki'));

  return {
    notes: notes.map((note) => ({
      path: note.path,
      title: note.title,
      folder: note.folder,
      updated: note.updated,
      wordCount: note.wordCount,
      plScore: note.plScore,
    })),
    links: wikiLinks.map((link) => ({
      sourcePath: link.sourcePath,
      targetPath: link.targetPath,
      type: 'wiki' as const,
    })),
    unresolvedLinks: [],
  };
}
