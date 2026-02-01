// CLI for running database migrations

import { runMigrations, rollbackMigration, checkMigrations, closeConnection } from './index.ts';

const command = Deno.args[0];

async function main() {
  try {
    switch (command) {
      case 'up':
      case 'migrate':
        await runMigrations();
        break;

      case 'down':
      case 'rollback':
        await rollbackMigration();
        break;

      case 'status':
        const status = await checkMigrations();
        console.log('Migration status:');
        console.log(`  Applied: ${status.applied}`);
        console.log(`  Pending: ${status.pending}`);
        console.log(`  Up to date: ${status.upToDate}`);
        break;

      default:
        console.log('Usage: deno task migrate [up|down|status]');
        console.log('');
        console.log('Commands:');
        console.log('  up, migrate  - Run pending migrations');
        console.log('  down, rollback - Rollback last migration');
        console.log('  status - Show migration status');
        Deno.exit(1);
    }
  } finally {
    await closeConnection();
  }
}

main();
