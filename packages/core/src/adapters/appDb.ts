import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import path from "node:path";

let _db: DatabaseSync | null = null;

function resolveDbPath(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../data/app.db");
}

const READ_PRAGMAS = `
  PRAGMA cache_size   = -32768;
  PRAGMA mmap_size    = 268435456;
  PRAGMA temp_store   = MEMORY;
  PRAGMA busy_timeout = 5000;
`;

export function getAppDb(): DatabaseSync {
  if (_db === null) {
    _db = new DatabaseSync(resolveDbPath(), { readOnly: true });
    _db.exec(READ_PRAGMAS);
  }
  return _db;
}
