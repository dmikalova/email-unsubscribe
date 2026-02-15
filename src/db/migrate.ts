// Database migration framework

import { getConfig, getConnection } from './connection.ts';

interface Migration {
  id: string;
  name: string;
  up: string;
  down?: string;
}

// Load all migrations from the migrations directory
export async function loadMigrations(): Promise<Migration[]> {
  const migrations: Migration[] = [];
  const migrationsDir = new URL('./migrations', import.meta.url).pathname;

  for await (const entry of Deno.readDir(migrationsDir)) {
    if (entry.isFile && entry.name.endsWith('.ts')) {
      const module = await import(`./migrations/${entry.name}`);
      const id = entry.name.replace('.ts', '');
      migrations.push({
        id,
        name: module.name || id,
        up: module.up,
        down: module.down,
      });
    }
  }

  // Sort by ID (timestamp prefix)
  return migrations.sort((a, b) => a.id.localeCompare(b.id));
}

// Initialize migrations table and schema
export async function initMigrations(): Promise<void> {
  const sql = getConnection();
  const config = getConfig();

  // Schema is created by infrastructure (tofu), set search path to use it
  await sql.unsafe(`SET search_path TO ${config.schema}, public`);

  // Create migrations tracking table
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// Get list of applied migrations
export async function getAppliedMigrations(): Promise<string[]> {
  const sql = getConnection();
  const config = getConfig();

  await sql.unsafe(`SET search_path TO ${config.schema}, public`);

  const result = await sql<{ id: string }[]>`
    SELECT id FROM _migrations ORDER BY id
  `;

  return result.map((row) => row.id);
}

// Run pending migrations
export async function runMigrations(): Promise<string[]> {
  await initMigrations();

  const sql = getConnection();
  const config = getConfig();
  const applied = await getAppliedMigrations();
  const migrations = await loadMigrations();
  const pending = migrations.filter((m) => !applied.includes(m.id));
  const ran: string[] = [];

  for (const migration of pending) {
    console.log(`Running migration: ${migration.id} - ${migration.name}`);

    await sql.unsafe(`SET search_path TO ${config.schema}, public`);
    await sql.unsafe(migration.up);

    await sql`
      INSERT INTO _migrations (id, name)
      VALUES (${migration.id}, ${migration.name})
    `;

    ran.push(migration.id);
    console.log(`Completed migration: ${migration.id}`);
  }

  if (ran.length === 0) {
    console.log('No pending migrations');
  } else {
    console.log(`Applied ${ran.length} migration(s)`);
  }

  return ran;
}

// Rollback the last migration
export async function rollbackMigration(): Promise<string | null> {
  const sql = getConnection();
  const config = getConfig();
  const applied = await getAppliedMigrations();

  if (applied.length === 0) {
    console.log('No migrations to rollback');
    return null;
  }

  const lastId = applied[applied.length - 1];
  const migrations = await loadMigrations();
  const migration = migrations.find((m) => m.id === lastId);

  if (!migration) {
    throw new Error(`Migration ${lastId} not found`);
  }

  if (!migration.down) {
    throw new Error(`Migration ${lastId} does not have a down script`);
  }

  console.log(`Rolling back migration: ${migration.id} - ${migration.name}`);

  await sql.unsafe(`SET search_path TO ${config.schema}, public`);
  await sql.unsafe(migration.down);

  await sql`
    DELETE FROM _migrations WHERE id = ${migration.id}
  `;

  console.log(`Rolled back migration: ${migration.id}`);
  return migration.id;
}

// Check if migrations are up to date
export async function checkMigrations(): Promise<{
  applied: number;
  pending: number;
  upToDate: boolean;
}> {
  await initMigrations();

  const applied = await getAppliedMigrations();
  const migrations = await loadMigrations();
  const pending = migrations.filter((m) => !applied.includes(m.id));

  return {
    applied: applied.length,
    pending: pending.length,
    upToDate: pending.length === 0,
  };
}
