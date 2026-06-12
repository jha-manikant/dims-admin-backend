/**
 * Drift guard: the permission catalog lives in two hand-maintained places —
 * the TypeScript constant (`src/constants/permissions.ts`, the compile-time
 * source of truth the code gates against) and the raw-SQL seed
 * (`src/db/migrations/*.sql`, which creates the `DIMSAdminPermissions` rows
 * that roles get assigned). A key present in one but not the other is a latent
 * bug: a TS-only key always denies at runtime; a SQL-only row can't be gated.
 *
 * This script compares the two key sets statically (no DB connection) and exits
 * non-zero on any mismatch. Wire it into CI alongside lint/typecheck.
 */
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_PERMISSION_KEYS } from '../src/constants/permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = resolve(__dirname, '..', 'src', 'db', 'migrations');

/**
 * Extract every permission key seeded into `DIMSAdminPermissions` across the
 * migration files. We isolate each `INSERT INTO DIMSAdminPermissions … GO`
 * region (so we don't pick up keys referenced in role-grant statements), then
 * grab the first single-quoted literal of each value tuple — i.e. the
 * `PermissionKey` column.
 */
async function collectSeededKeys(): Promise<Set<string>> {
  const entries = await readdir(MIGRATIONS_DIR);
  const files = entries.filter((name) => name.endsWith('.sql')).sort();
  const keys = new Set<string>();

  for (const file of files) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
    // Each region runs from an INSERT into the permissions table to the next GO.
    const regionRe = /INSERT\s+INTO\s+DIMSAdminPermissions\b[\s\S]*?(?:\n\s*GO\b|$)/gi;
    for (const region of sql.match(regionRe) ?? []) {
      // First quoted token after an opening paren = the PermissionKey column.
      // `(SELECT …` and `AS v(PermissionKey, …` don't start with a quote, so the
      // WHERE-NOT-EXISTS subquery and the column alias list are skipped.
      const keyRe = /\(\s*'([^']+)'/g;
      let m: RegExpExecArray | null;
      while ((m = keyRe.exec(region)) !== null) {
        const key = m[1];
        if (key !== undefined) keys.add(key);
      }
    }
  }
  return keys;
}

function diff(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((x) => !b.has(x)).sort();
}

async function main(): Promise<void> {
  const tsKeys = new Set<string>(ALL_PERMISSION_KEYS);
  const sqlKeys = await collectSeededKeys();

  if (sqlKeys.size === 0) {
    console.error('No permission keys found in migration seeds — check the parser/paths.');
    process.exit(1);
  }

  const missingInSql = diff(tsKeys, sqlKeys);
  const orphanInSql = diff(sqlKeys, tsKeys);

  if (missingInSql.length === 0 && orphanInSql.length === 0) {
    console.log(`Permission catalog in sync ✔  (${String(tsKeys.size)} keys)`);
    return;
  }

  console.error('Permission catalog drift detected:\n');
  if (missingInSql.length > 0) {
    console.error('  In src/constants/permissions.ts but NOT seeded in SQL (would always deny):');
    for (const k of missingInSql) console.error(`    - ${k}`);
    console.error('');
  }
  if (orphanInSql.length > 0) {
    console.error('  Seeded in SQL but NOT in src/constants/permissions.ts (cannot be gated):');
    for (const k of orphanInSql) console.error(`    - ${k}`);
    console.error('');
  }
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
