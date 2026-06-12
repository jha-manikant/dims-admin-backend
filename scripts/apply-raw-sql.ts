/**
 * Applies .sql files under src/db/migrations to MS SQL Server, in order.
 *
 * With no arguments, applies every .sql file. Pass one or more filenames to
 * apply only those (e.g. `db:migrate:raw -- 002_permissions_view.sql`) — useful
 * for adding a single new migration without dropping the database. The order of
 * arguments is ignored; selected files are still applied in sorted order.
 *
 * Why this exists: Prisma's MS SQL Server provider can't express features we
 * rely on (filtered unique indexes, NEWSEQUENTIALID defaults), so the schema
 * lives in raw SQL and is applied here. `prisma generate` still runs against
 * `prisma/schema.prisma` to produce the typed client.
 *
 * Idempotency is NOT handled — re-running a migration that creates objects will
 * error on duplicates. For a full reset, drop the database and re-apply.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = resolve(__dirname, '..', 'src', 'db', 'migrations');

/**
 * Split a `.sql` file on `GO` batch separators (T-SQL convention; Prisma's
 * `$executeRawUnsafe` only supports one statement per call on SQL Server).
 */
function splitOnGo(sql: string): string[] {
  return sql
    .split(/^\s*GO\s*;?\s*$/gim)
    .map((batch) => batch.trim())
    .filter((batch) => batch.length > 0);
}

async function main(): Promise<void> {
  const entries = await readdir(MIGRATIONS_DIR);
  const available = entries.filter((name) => name.endsWith('.sql')).sort();

  // Optional CLI args select a subset of migrations to apply.
  const requested = process.argv.slice(2);
  let files = available;
  if (requested.length > 0) {
    const missing = requested.filter((name) => !available.includes(name));
    if (missing.length > 0) {
      console.error(`No such migration file(s) in ${MIGRATIONS_DIR}: ${missing.join(', ')}`);
      console.error(`Available: ${available.join(', ')}`);
      process.exit(1);
    }
    files = available.filter((name) => requested.includes(name));
  }

  if (files.length === 0) {
    console.error(`No .sql migration files found in ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    for (const file of files) {
      const fullPath = join(MIGRATIONS_DIR, file);
      const sql = await readFile(fullPath, 'utf-8');
      const batches = splitOnGo(sql);
      console.log(`Applying ${file} (${String(batches.length)} batch(es))…`);
      for (const [index, batch] of batches.entries()) {
        try {
          await prisma.$executeRawUnsafe(batch);
        } catch (err) {
          console.error(`Failed in ${file} batch #${String(index + 1)}:`);
          console.error(batch.slice(0, 400) + (batch.length > 400 ? '…' : ''));
          throw err;
        }
      }
    }
    console.log('All migrations applied successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
