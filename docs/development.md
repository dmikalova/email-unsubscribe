# Local Development Guide

This guide covers setting up and running the Email Unsubscribe application
locally.

## Prerequisites

- [Deno](https://deno.land/) v2.0 or later
- [Docker](https://www.docker.com/) and Docker Compose
- [Google Cloud Project](./setup-google.md) with Gmail API enabled
- [direnv](https://direnv.net/) for automatic environment loading
- [SOPS](https://github.com/mozilla/sops) and
  [age](https://github.com/FiloSottile/age) for secrets

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/dmikalova/email-unsubscribe.git
cd email-unsubscribe
```

### 2. Set Up SOPS and age

Install the tools:

```bash
brew install sops age direnv
```

Generate an age key (if you don't have one):

```bash
mkdir -p ~/.age
age-keygen -o ~/.age/key.txt
```

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export SOPS_AGE_KEY_FILE=~/.age/key.txt
eval "$(direnv hook zsh)"  # or bash
```

### 3. Configure SOPS

Get your age public key and update `.sops.yaml`:

```bash
age-keygen -y ~/.age/key.txt
# Copy the output (age1...) and replace the placeholder in .sops.yaml
```

### 4. Create Secrets File

```bash
sops secrets/google.sops.json
```

Add your secrets (see `secrets/google.sops.json.example` for format):

```json
{
  "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
  "GOOGLE_CLIENT_SECRET": "your-client-secret",
  "EMAIL_UNSUBSCRIBE_ENCRYPTION_KEY_BASE64": "your-32-byte-base64-encryption-key"
}
```

### 5. Allow direnv

```bash
direnv allow
```

This automatically loads secrets from SOPS when you `cd` into the project.

### 6. Start PostgreSQL

For local development, you can use Docker to run PostgreSQL:

```bash
docker run --name postgres-dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=email_unsubscribe \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Or use an existing PostgreSQL instance, or connect to your Supabase preview
database.

### 4. Run Database Migrations

```bash
deno task migrate
```

### 5. Start the Development Server

```bash
deno task dev
```

The application will be available at <http://localhost:8000>

## Development Commands

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `deno task dev`     | Start development server with hot reload |
| `deno task start`   | Start production server                  |
| `deno task test`    | Run all tests                            |
| `deno task check`   | Type check TypeScript                    |
| `deno task lint`    | Run linter                               |
| `deno task fmt`     | Format code                              |
| `deno task migrate` | Run database migrations                  |

## PR Preview Environments

When you open a pull request, a preview environment is automatically deployed:

1. **Automatic deployment**: PR triggers CI workflow → deploys to `app-pr-{N}`
2. **Preview URL**: Posted as a comment on the PR
3. **Shared database**: Uses Supabase preview project (not production)
4. **Auto-cleanup**: Deleted when PR is closed/merged

This lets you test changes in a production-like environment before merging.

## Project Structure

```
email-unsubscribe/
├── src/
│   ├── main.ts          # Application entry point
│   ├── app.ts           # Hono application setup
│   ├── api/             # REST API endpoints
│   ├── db/              # Database connection and migrations
│   ├── gmail/           # Gmail OAuth and API client
│   ├── scanner/         # Email scanning and parsing
│   ├── unsubscribe/     # Unsubscribe processing
│   ├── tracker/         # Attempt tracking and audit
│   └── public/          # Static files (dashboard)
├── tests/
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
├── docs/                # Documentation
├── openspec/            # Project specifications
├── deploy.config.ts     # Deployment contract
├── deno.json            # Deno configuration
└── .github/workflows/   # CI/CD workflows
```

## Working with the Codebase

### Adding a New API Endpoint

1. Add the route in `src/api/routes.ts`:

```typescript
api.get("/my-endpoint", async (c) => {
  return c.json({ data: "example" });
});
```

- Add types if needed in the relevant module

### Adding a Database Migration

```bash
# Migrations are in src/db/migrations/
# Create a new file with the next number:
# 009_my_migration.ts
```

Migration format:

```typescript
export const up = `
  CREATE TABLE my_table (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
  );
`;

export const down = `
  DROP TABLE my_table;
`;
```

### Running Tests

```bash
# Run all tests
deno task test

# Run specific test file
deno test tests/unit/headers_test.ts

# Run with coverage
deno test --coverage=coverage/

# Generate coverage report
deno coverage coverage/
```

### Debugging

#### Enable Verbose Logging

Set environment variable:

```bash
DEBUG=true deno task dev
```

#### Debugging Browser Automation

Set `headless: false` in browser config to see the browser:

```typescript
// In src/unsubscribe/browser.ts
const browser = await chromium.launch({ headless: false });
```

#### Inspecting Playwright Traces

1. Find the trace file in `data/traces/`
2. Open with Playwright:

```bash
npx playwright show-trace data/traces/trace-123.zip
```

## Common Issues

### Port Already in Use

```bash
# Find and kill the process
lsof -i :8000
kill -9 <PID>
```

### Database Connection Failed

1. Ensure PostgreSQL is running: `docker compose ps`
2. Check `DATABASE_URL` in `.env`
3. Verify network connectivity

### OAuth Redirect Mismatch

Ensure `GOOGLE_REDIRECT_URI` exactly matches the URI configured in Google Cloud
Console, including:

- Protocol (http vs https)
- Port number
- Path
- No trailing slash

### Deno Cache Issues

Clear the Deno cache:

```bash
deno cache --reload deno.json
```

### Chromium/Playwright Issues

Ensure Chromium dependencies are installed:

```bash
# On macOS
brew install chromium

# On Ubuntu/Debian
apt-get install chromium
```

Set the executable path:

```bash
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
```

## IDE Setup

### VS Code

Recommended extensions:

- [Deno](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

Add to `.vscode/settings.json`:

```json
{
  "deno.enable": true,
  "deno.lint": true,
  "editor.defaultFormatter": "denoland.vscode-deno"
}
```

### JetBrains IDEs

Install the Deno plugin from the marketplace.
