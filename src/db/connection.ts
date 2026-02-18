// Database configuration and connection pooling
// Configured for Supabase with Supavisor connection pooler (port 6543)

import postgres from 'postgres';

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
  const url = Deno.env.get('DATABASE_URL');
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return {
    url,
    schema: Deno.env.get('DATABASE_SCHEMA') || 'email_unsubscribe',
    max: parseInt(Deno.env.get('DATABASE_POOL_MAX') || '10'),
    idleTimeout: parseInt(Deno.env.get('DATABASE_IDLE_TIMEOUT') || '30'),
    connectTimeout: parseInt(Deno.env.get('DATABASE_CONNECT_TIMEOUT') || '10'),
    acquireTimeout: parseInt(Deno.env.get('DATABASE_ACQUIRE_TIMEOUT') || '30'),
  };
}

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
    ssl: 'require',
    onnotice: () => {}, // Suppress notice messages
    transform: {
      undefined: null,
    },
    // Disable prepared statements - required for Supavisor transaction pooler
    prepare: false,
    // Set search_path on each new connection so queries find the schema's tables
    connection: {
      search_path: `${config.schema}, public`,
    },
  });

  return sql;
}

export async function closeConnection(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

// Transaction wrapper with automatic retry on transient errors
// Handles pool exhaustion gracefully with exponential backoff
export async function withTransaction<T>(
  fn: (sql: postgres.TransactionSql) => Promise<T>,
  retries = 3,
): Promise<T> {
  const connection = getConnection();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = (await connection.begin(async (tx) => {
        return await fn(tx);
      })) as T;
      return result;
    } catch (error) {
      lastError = error as Error;

      // Check if it's a transient error worth retrying
      // Includes pool exhaustion scenarios from Supavisor
      const errorMessage = lastError.message.toLowerCase();
      const isTransient =
        errorMessage.includes('deadlock') ||
        errorMessage.includes('serialization') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('pool') ||
        errorMessage.includes('too many connections') ||
        errorMessage.includes('remaining connection slots');

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
export async function query<T>(
  queryFn: (sql: postgres.Sql) => Promise<T>,
  retries = 3,
): Promise<T> {
  const connection = getConnection();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await queryFn(connection);
    } catch (error) {
      lastError = error as Error;

      // Check for transient errors including pool exhaustion
      const errorMessage = lastError.message.toLowerCase();
      const isTransient =
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('pool') ||
        errorMessage.includes('too many connections') ||
        errorMessage.includes('remaining connection slots');

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
