#!/usr/bin/env -S deno run --allow-run --allow-env --allow-read --allow-write

/**
 * Setup SOPS secrets for this project
 * Usage: deno task setup-secrets
 *
 * Prerequisites:
 * - brew install sops age
 * - age-keygen -o ~/.age/key.txt (if you don't have a key)
 * - export SOPS_AGE_KEY_FILE=~/.age/key.txt (in shell profile)
 */

import { existsSync } from 'node:fs';

const SECRETS_FILE = 'secrets/google.sops.json';
const SOPS_CONFIG = '.sops.yaml';
const AGE_KEY_FILE = Deno.env.get('SOPS_AGE_KEY_FILE') ?? `${Deno.env.get('HOME')}/.age/key.txt`;

interface Secret {
  envVar: string;
  prompt: string;
  autoGenerate?: boolean;
}

const SECRETS: Secret[] = [
  {
    envVar: 'GOOGLE_CLIENT_ID',
    prompt: 'Google OAuth Client ID',
  },
  {
    envVar: 'GOOGLE_CLIENT_SECRET',
    prompt: 'Google OAuth Client Secret',
  },
  {
    envVar: 'ENCRYPTION_KEY',
    prompt: 'Encryption Key (32 hex chars)',
    autoGenerate: true,
  },
];

// Colors for terminal output
const colors = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

async function run(cmd: string[]): Promise<{ success: boolean; output: string }> {
  const command = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: 'piped',
    stderr: 'piped',
    env: { ...Deno.env.toObject() },
  });

  const { success, stdout, stderr } = await command.output();
  const output = new TextDecoder().decode(success ? stdout : stderr).trim();
  return { success, output };
}

async function prompt(message: string): Promise<string> {
  const buf = new Uint8Array(1024);
  await Deno.stdout.write(new TextEncoder().encode(message));
  const n = await Deno.stdin.read(buf);
  return new TextDecoder().decode(buf.subarray(0, n ?? 0)).trim();
}

async function checkTools(): Promise<boolean> {
  // Check sops
  const sops = await run(['which', 'sops']);
  if (!sops.success) {
    console.log(colors.red('Error: sops is not installed.'));
    console.log('Install with: brew install sops');
    return false;
  }

  // Check age
  const age = await run(['which', 'age']);
  if (!age.success) {
    console.log(colors.red('Error: age is not installed.'));
    console.log('Install with: brew install age');
    return false;
  }

  // Check age key exists
  if (!existsSync(AGE_KEY_FILE)) {
    console.log(colors.red(`Error: age key not found at ${AGE_KEY_FILE}`));
    console.log('Generate with: age-keygen -o ~/.age/key.txt');
    return false;
  }

  console.log(colors.green('✓ sops and age installed'));
  console.log(colors.green(`✓ age key found at ${AGE_KEY_FILE}`));
  return true;
}

async function getAgePublicKey(): Promise<string | null> {
  const { success, output } = await run(['age-keygen', '-y', AGE_KEY_FILE]);
  return success ? output : null;
}

async function updateSopsConfig(publicKey: string): Promise<boolean> {
  const config = `creation_rules:
  - path_regex: \\.sops\\.json$
    age: >-
      ${publicKey}

# Use spaces for JSON indentation
stores:
  json:
    indent: 4
`;

  try {
    await Deno.writeTextFile(SOPS_CONFIG, config);
    return true;
  } catch {
    return false;
  }
}

async function decryptSecrets(): Promise<Record<string, string> | null> {
  if (!existsSync(SECRETS_FILE)) {
    return null;
  }

  const { success, output } = await run(['sops', '-d', SECRETS_FILE]);
  if (!success) {
    return null;
  }

  try {
    return JSON.parse(output);
  } catch {
    return null;
  }
}

async function encryptSecrets(secrets: Record<string, string>): Promise<boolean> {
  // Write plaintext JSON first
  const plaintext = JSON.stringify(secrets, null, 4);

  // Create temp file
  const tempFile = `${SECRETS_FILE}.tmp`;
  await Deno.writeTextFile(tempFile, plaintext);

  // Encrypt in place
  const { success } = await run(['sops', '-e', '-i', tempFile]);

  if (success) {
    // Move to final location
    await Deno.rename(tempFile, SECRETS_FILE);
  } else {
    // Cleanup temp file
    try {
      await Deno.remove(tempFile);
    } catch {
      // ignore
    }
  }

  return success;
}

function generateHexKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function maskValue(value: string): string {
  if (value.length > 12) {
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }
  return '****';
}

async function main() {
  console.log(colors.blue('=== SOPS Secrets Setup ===\n'));

  if (!(await checkTools())) {
    Deno.exit(1);
  }

  // Get age public key
  const publicKey = await getAgePublicKey();
  if (!publicKey) {
    console.log(colors.red('Error: Could not get age public key'));
    Deno.exit(1);
  }

  console.log(colors.dim(`\nAge public key: ${publicKey}\n`));

  // Update .sops.yaml with the correct public key
  if (await updateSopsConfig(publicKey)) {
    console.log(colors.green(`✓ Updated ${SOPS_CONFIG} with your age public key\n`));
  } else {
    console.log(colors.red(`Error: Could not update ${SOPS_CONFIG}`));
    Deno.exit(1);
  }

  // Load existing secrets
  let secrets = (await decryptSecrets()) ?? {};

  console.log(colors.blue('Enter your secrets:\n'));

  for (const secret of SECRETS) {
    const existing = secrets[secret.envVar];

    let input: string;

    if (existing) {
      console.log(`${secret.envVar}: ${colors.yellow(maskValue(existing))}`);
      input = await prompt('  New value (Enter to keep): ');
    } else {
      console.log(`${secret.envVar}: ${colors.dim('(not set)')}`);
      if (secret.autoGenerate) {
        input = await prompt('  Value (Enter to auto-generate): ');
      } else {
        input = await prompt('  Value: ');
      }
    }

    if (input === '') {
      if (existing) {
        // Keep existing
      } else if (secret.autoGenerate) {
        secrets[secret.envVar] = generateHexKey();
        console.log(colors.green('  Generated random key'));
      }
    } else {
      secrets[secret.envVar] = input;
      console.log(colors.green('  Set'));
    }

    console.log('');
  }

  // Ensure secrets directory exists
  try {
    await Deno.mkdir('secrets', { recursive: true });
  } catch {
    // ignore if exists
  }

  // Save encrypted secrets
  if (await encryptSecrets(secrets)) {
    console.log(colors.green(`✓ Secrets encrypted and saved to ${SECRETS_FILE}`));
    console.log('');
    console.log(colors.blue('Next steps:'));
    console.log('  1. Run: direnv allow');
    console.log('  2. Verify: echo $GOOGLE_CLIENT_ID');
    console.log('  3. Commit the encrypted secrets file to git');
  } else {
    console.log(colors.red('Error: Failed to encrypt secrets'));
    Deno.exit(1);
  }
}

main();
