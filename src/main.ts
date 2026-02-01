// Email Unsubscribe - Main Entry Point
// This file bootstraps the application

import { app } from './app.ts';
import { closeConnection, runMigrations } from './db/index.ts';
import { initializeLabels } from './gmail/labels.ts';
import { hasValidTokens } from './gmail/tokens.ts';
import { closeBrowser } from './unsubscribe/index.ts';
import { seedDefaultPatterns } from './unsubscribe/patterns.ts';

const port = parseInt(Deno.env.get('PORT') || '8000');

// Structured logging helper
function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

// Graceful shutdown handler
let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log('info', `Received ${signal}, shutting down gracefully...`);

  try {
    // Close browser instances
    await closeBrowser();
    log('info', 'Browser instances closed');

    // Close database connections
    await closeConnection();
    log('info', 'Database connections closed');

    log('info', 'Shutdown complete');
    Deno.exit(0);
  } catch (error) {
    log('error', 'Error during shutdown', { error: String(error) });
    Deno.exit(1);
  }
}

// Register signal handlers
Deno.addSignalListener('SIGTERM', () => shutdown('SIGTERM'));
Deno.addSignalListener('SIGINT', () => shutdown('SIGINT'));

// Initialize application
async function initialize() {
  try {
    log('info', 'Starting Email Unsubscribe service', { port });

    // Run database migrations
    log('info', 'Running database migrations...');
    await runMigrations();

    // Seed default patterns
    log('info', 'Seeding default patterns...');
    await seedDefaultPatterns();

    // Initialize Gmail labels if tokens exist
    const hasTokens = await hasValidTokens();
    if (hasTokens) {
      log('info', 'Initializing Gmail labels...');
      try {
        await initializeLabels();
      } catch (error) {
        log('warn', 'Failed to initialize Gmail labels', { error: String(error) });
      }
    } else {
      log('info', 'No Gmail tokens found, skipping label initialization');
    }

    log('info', 'Initialization complete, starting server...');
  } catch (error) {
    log('error', 'Initialization failed', { error: String(error) });
    throw error;
  }
}

// Start the server
initialize()
  .then(() => {
    Deno.serve({ port }, app.fetch);
  })
  .catch((error) => {
    log('error', 'Failed to start server', { error: String(error) });
    Deno.exit(1);
  });
