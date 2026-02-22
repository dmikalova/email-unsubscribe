// Database configuration and connection pooling
// Configured for Supabase with Supavisor connection pooler (port 6543)

import postgres from "postgres";

export interface DatabaseConfig {
  url: string;
  schema: string;
  max?: number;
  idleTimeout?: number;
  connectTimeout?: number;
  /** Timeout for acquiring a connection from the pool (seconds) */
  acquireTimeout?: number;
}

let sql: postgres.Sql | null = null;

export function getConfig(): DatabaseConfig {
  const url = Deno.env.get("DATABASE_URL_TRANSACTION");
  if (!url) {
    throw new Error(
      "DATABASE_URL_TRANSACTION environment variable is required",
    );
  }

  return {
    url,
    schema: Deno.env.get("DATABASE_SCHEMA") || "email_unsubscribe",
    max: parseInt(Deno.env.get("DATABASE_POOL_MAX") || "10"),
    idleTimeout: parseInt(Deno.env.get("DATABASE_IDLE_TIMEOUT") || "30"),
    connectTimeout: parseInt(Deno.env.get("DATABASE_CONNECT_TIMEOUT") || "10"),
    acquireTimeout: parseInt(Deno.env.get("DATABASE_ACQUIRE_TIMEOUT") || "30"),
  };
}

// Schema name for queries
let schemaName: string | null = null;

export function getSchema(): string {
  if (!schemaName) {
    schemaName = Deno.env.get("DATABASE_SCHEMA") || "email_unsubscribe";
  }
  return schemaName;
}

// Schema constant for SQL queries - exported for query builders
export const SCHEMA = "email_unsubscribe";

export function getConnection(): postgres.Sql {
  if (sql) {
    return sql;
  }

  const config = getConfig();

  sql = postgres(config.url, {
    max: config.max,
    idle_timeout: config.idleTimeout,
    connect_timeout: config.connectTimeout,
    // SSL is required for Supabase - the connection string should include sslmode=require
    ssl: "require",
    onnotice: () => {}, // Suppress notice messages
    transform: {
      undefined: null,
    },
    // Disable prepared statements - required for Supavisor transaction pooler
    prepare: false,
  });

  return sql;
}

// Reset connection pool - call after fatal connection errors
export function resetConnection(): void {
  if (sql) {
    sql.end().catch(() => {}); // Fire and forget cleanup
    sql = null;
  }
}

export async function closeConnection(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

// Transaction wrapper with automatic retry on transient errors
// Handles pool exhaustion gracefully with exponential backoff
// Sets search_path for Supavisor transaction pooling compatibility
export async function withTransaction<T>(
  fn: (sql: postgres.TransactionSql) => Promise<T>,
  retries = 3,
): Promise<T> {
  const schema = getSchema();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    const connection = getConnection(); // Get fresh connection each attempt
    try {
      const result = (await connection.begin(async (tx) => {
        await tx.unsafe(`SET LOCAL search_path TO ${schema}, public`);
        return await fn(tx);
      })) as T;
      return result;
    } catch (error) {
      lastError = error as Error;

      // Check if it's a transient error worth retrying
      // Includes pool exhaustion scenarios from Supavisor
      const errorMessage = lastError.message.toLowerCase();
      const isConnectionDead = errorMessage.includes("connection_ended") ||
        errorMessage.includes("connection terminated") ||
        errorMessage.includes("connection refused");
      const isTransient = isConnectionDead ||
        errorMessage.includes("deadlock") ||
        errorMessage.includes("serialization") ||
        errorMessage.includes("connection") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("pool") ||
        errorMessage.includes("too many connections") ||
        errorMessage.includes("remaining connection slots");

      // Reset connection pool on dead connection errors
      if (isConnectionDead) {
        console.log(`[DB] Connection dead, resetting pool: ${errorMessage}`);
        resetConnection();
      }

      if (!isTransient || attempt === retries - 1) {
        throw error;
      }

      // Exponential backoff with jitter to avoid thundering herd
      const baseDelay = Math.pow(2, attempt) * 100;
      const jitter = Math.random() * 50;
      await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
    }
  }

  throw lastError;
}

// Simple query helper with retry logic
// Handles pool exhaustion and transient connection errors
// Wraps queries in a transaction with search_path set (required for Supavisor pooling)
export async function query<T>(
  queryFn: (sql: postgres.Sql) => Promise<T>,
  retries = 3,
): Promise<T> {
  const schema = getSchema();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    const connection = getConnection(); // Get fresh connection each attempt
    try {
      // Use begin to ensure search_path is set for the query
      return (await connection.begin(async (tx) => {
        await tx.unsafe(`SET LOCAL search_path TO ${schema}, public`);
        return await queryFn(tx as unknown as postgres.Sql);
      })) as T;
    } catch (error) {
      lastError = error as Error;

      // Check for transient errors including pool exhaustion
      const errorMessage = lastError.message.toLowerCase();
      const isConnectionDead = errorMessage.includes("connection_ended") ||
        errorMessage.includes("connection terminated") ||
        errorMessage.includes("connection refused");
      const isTransient = isConnectionDead ||
        errorMessage.includes("connection") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("pool") ||
        errorMessage.includes("too many connections") ||
        errorMessage.includes("remaining connection slots");

      // Reset connection pool on dead connection errors
      if (isConnectionDead) {
        console.log(`[DB] Connection dead, resetting pool: ${errorMessage}`);
        resetConnection();
      }

      if (!isTransient || attempt === retries - 1) {
        throw error;
      }

      // Exponential backoff with jitter
      const baseDelay = Math.pow(2, attempt) * 100;
      const jitter = Math.random() * 50;
      await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
    }
  }

  throw lastError;
}

/**
 * Execute a database function with search_path set.
 * Required for Supavisor transaction pooling where session settings don't persist.
 * Wraps the function in a transaction to ensure search_path is set.
 * Uses query() internally for automatic retry on connection errors.
 */
export function withDb<T>(
  fn: (sql: postgres.Sql) => Promise<T>,
): Promise<T> {
  return query(fn);
}
