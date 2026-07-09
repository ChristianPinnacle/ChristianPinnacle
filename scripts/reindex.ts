import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDb } from "../server/db/index.js";
import { reindexVault } from "../server/vault/reindex.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const vaultPath = process.env.VAULT_PATH ?? path.join(rootDir, "vault");

const db = await connectDb();
if (!db) {
  console.error("[reindex] DATABASE_URL is required. Copy .env.example to .env and set MySQL connection.");
  process.exit(1);
}

const result = await reindexVault(db, vaultPath);
console.log(
  `[reindex] Done — ${result.noteCount} notes, ${result.linkCount} wiki links indexed` +
    (result.unresolvedLinks > 0 ? ` (${result.unresolvedLinks} unresolved wikilinks skipped)` : ""),
);
