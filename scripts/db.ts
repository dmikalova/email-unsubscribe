#!/usr/bin/env -S deno run --allow-run --allow-env
/**
 * Atlas database schema management wrapper
 *
 * Automatically fetches DATABASE_URL from Google Secret Manager,
 * or uses the environment variable if set.
 *
 * Usage:
 *   deno task db:apply   # Apply schema changes
 *   deno task db:diff    # Show planned changes
 */

const APP_NAME = 'email-unsubscribe';
const SCHEMA_NAME = 'email_unsubscribe';
const GCP_PROJECT = 'mklv-infrastructure';

async function getDatabaseUrl(): Promise<string> {
  // Check environment variable first
  const envUrl = Deno.env.get('DATABASE_URL');
  if (envUrl) {
    console.log('Using DATABASE_URL from environment');
    return envUrl;
  }

  // Fetch from Secret Manager
  console.log('Fetching DATABASE_URL from Secret Manager...');
  const secretName = `${APP_NAME}-database-url`;

  const command = new Deno.Command('gcloud', {
    args: [
      'secrets',
      'versions',
      'access',
      'latest',
      `--secret=${secretName}`,
      `--project=${GCP_PROJECT}`,
    ],
    stdout: 'piped',
    stderr: 'piped',
  });

  const { code, stdout, stderr } = await command.output();

  if (code !== 0) {
    const errorMsg = new TextDecoder().decode(stderr);
    console.error(`Failed to fetch secret: ${errorMsg}`);
    console.error("\nMake sure you're authenticated with gcloud and have access to the secret.");
    Deno.exit(1);
  }

  return new TextDecoder().decode(stdout).trim();
}

async function runAtlas(subcommand: string, databaseUrl: string): Promise<void> {
  const repoRoot = new URL('../', import.meta.url).pathname;
  const schemaFile = `${repoRoot}db/schema.hcl`;

  const args = [
    'schema',
    subcommand,
    '--to',
    `file://${schemaFile}`,
    '--url',
    databaseUrl,
    '--schema',
    SCHEMA_NAME,
  ];

  // Add --auto-approve for apply
  if (subcommand === 'apply') {
    args.push('--auto-approve');
  }

  console.log(`Running: atlas schema ${subcommand}\n`);

  const command = new Deno.Command('atlas', {
    args,
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const { code } = await command.output();

  if (code !== 0) {
    Deno.exit(code);
  }
}

// Main
const subcommand = Deno.args[0];

if (!subcommand || !['apply', 'diff'].includes(subcommand)) {
  console.log('Usage: db.ts <apply|diff>');
  console.log('');
  console.log('Commands:');
  console.log('  apply  Apply schema changes to the database');
  console.log('  diff   Show planned schema changes without applying');
  Deno.exit(1);
}

const databaseUrl = await getDatabaseUrl();
await runAtlas(subcommand, databaseUrl);
