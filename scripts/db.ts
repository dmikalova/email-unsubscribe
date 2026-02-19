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

const APP_NAME = "email-unsubscribe";
const SCHEMA_NAME = "email_unsubscribe";
const GCP_PROJECT = "mklv-infrastructure";

async function getDatabaseUrl(): Promise<string> {
  // Check environment variable first
  const envUrl = Deno.env.get("DATABASE_URL");
  if (envUrl) {
    console.log("Using DATABASE_URL from environment");
    return envUrl;
  }

  // Fetch from Secret Manager
  console.log("Fetching DATABASE_URL from Secret Manager...");
  const secretName = `${APP_NAME}-database-url`;

  const command = new Deno.Command("gcloud", {
    args: [
      "secrets",
      "versions",
      "access",
      "latest",
      `--secret=${secretName}`,
      `--project=${GCP_PROJECT}`,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();

  if (code !== 0) {
    const errorMsg = new TextDecoder().decode(stderr);
    console.error(`Failed to fetch secret: ${errorMsg}`);
    console.error(
      "\nMake sure you're authenticated with gcloud and have access to the secret.",
    );
    Deno.exit(1);
  }

  return new TextDecoder().decode(stdout).trim();
}

async function runAtlas(
  subcommand: string,
  databaseUrl: string,
): Promise<void> {
  const repoRoot = new URL("../", import.meta.url).pathname;
  const schemaFile = `${repoRoot}db/schema.hcl`;

  const args = [
    "schema",
    subcommand,
    "--to",
    `file://${schemaFile}`,
    "--url",
    databaseUrl,
    "--schema",
    SCHEMA_NAME,
  ];

  // Add --auto-approve for apply
  if (subcommand === "apply") {
    args.push("--auto-approve");
  }

  console.log(`Running: atlas schema ${subcommand}\n`);

  const command = new Deno.Command("atlas", {
    args,
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    Deno.exit(code);
  }
}

async function runTruncate(databaseUrl: string): Promise<void> {
  console.log("Dropping all tables in schema (Atlas will recreate them)...\n");

  // Drop tables entirely so Atlas can recreate with correct schema
  // This is needed when column types change in incompatible ways
  const sql = `
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['oauth_audit_log', 'oauth_tokens', 'processed_emails',
                         'scan_state', 'sender_tracking', 'allow_list',
                         'unsubscribe_history', 'audit_log'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = '${SCHEMA_NAME}' AND table_name = tbl) THEN
      EXECUTE format('DROP TABLE %I.%I CASCADE', '${SCHEMA_NAME}', tbl);
      RAISE NOTICE 'Dropped: %.%', '${SCHEMA_NAME}', tbl;
    END IF;
  END LOOP;
END $$;
`;

  const command = new Deno.Command("psql", {
    args: [databaseUrl, "-c", sql],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    Deno.exit(code);
  }

  console.log("\nAll tables dropped successfully.");
}

// Main
const subcommand = Deno.args[0];

if (!subcommand || !["apply", "diff", "truncate"].includes(subcommand)) {
  console.log("Usage: db.ts <apply|diff|truncate>");
  console.log("");
  console.log("Commands:");
  console.log("  apply     Apply schema changes to the database");
  console.log("  diff      Show planned schema changes without applying");
  console.log(
    "  truncate  Truncate all tables (use before destructive migrations)",
  );
  Deno.exit(1);
}

const databaseUrl = await getDatabaseUrl();

if (subcommand === "truncate") {
  await runTruncate(databaseUrl);
} else {
  await runAtlas(subcommand, databaseUrl);
}
