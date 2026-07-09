import type { Database } from "../db/index.js";

export type TrpcContext = {
  db: Database | null;
  vaultPath: string;
};

export function createContext(db: Database | null, vaultPath: string): TrpcContext {
  return { db, vaultPath };
}
