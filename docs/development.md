# Local Development Guide

This guide covers setting up and running the Email Unsubscribe application
locally.

## Prerequisites

- [Deno](https://deno.land/) v2.0 or later
- PostgreSQL database (local Docker or Supabase)
- [Google Cloud Project](./setup-google.md) with Gmail API enabled

## Required Environment Variables

| Variable                | Description                             |
| ----------------------- | --------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string            |
| `GOOGLE_CLIENT_ID`      | OAuth 2.0 client ID for Gmail API       |
| `GOOGLE_CLIENT_SECRET`  | OAuth 2.0 client secret                 |
| `GOOGLE_REDIRECT_URI`   | OAuth callback URL                      |
| `ENCRYPTION_KEY_BASE64` | 32-byte base64 key for token encryption |
| `SUPABASE_URL`          | Supabase project URL                    |
| `SUPABASE_JWT_KEY`      | Supabase JWT signing key                |

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/dmikalova/email-unsubscribe.git
cd email-unsubscribe
```

### 2. Set Environment Variables

Export the required variables or add them to your shell profile:

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/email_unsubscribe"
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export GOOGLE_REDIRECT_URI="http://localhost:8000/oauth/callback"
export ENCRYPTION_KEY_BASE64="$(openssl rand -base64 32)"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_JWT_KEY="your-jwt-key"
```

### 3. Start PostgreSQL

For local development, use Docker:

```bash
docker run --name postgres-dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=email_unsubscribe \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Or connect to your Supabase preview database.

### 4. Install Atlas

The database schema is managed by [Atlas](https://atlasgo.io/):

```bash
brew install ariga/tap/atlas
```

### 5. Apply Database Schema

```bash
deno task db:apply
```

### 6. Start Development Servers

```bash
# Terminal 1: API server with hot reload
deno task api:dev

# Terminal 2: Frontend dev server
deno task src:dev
```

The application will be available at <http://localhost:8000>

## Development Commands

| Command               | Description                        |
| --------------------- | ---------------------------------- |
| `deno task api:dev`   | Start API server with hot reload   |
| `deno task api:start` | Start production API server        |
| `deno task src:dev`   | Start frontend dev server          |
| `deno task src:build` | Build frontend for production      |
| `deno task test`      | Run unit tests                     |
| `deno task test:all`  | Run all tests (unit + integration) |
| `deno task check`     | Type check TypeScript              |
| `deno task lint`      | Run linter                         |
| `deno task fmt`       | Format code                        |
| `deno task db:diff`   | Show planned schema changes        |
| `deno task db:apply`  | Apply schema changes               |

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
├── api/
│   ├── main.ts          # Application entry point
│   ├── app.ts           # Hono application setup
│   ├── routes/          # REST API endpoints
│   ├── db/              # Database queries
│   ├── gmail/           # Gmail OAuth and API client
│   ├── scanner/         # Email scanning and parsing
│   ├── unsubscribe/     # Unsubscribe processing
│   ├── tracker/         # Attempt tracking and audit
│   └── public/          # Static files (dashboard)
├── src/                 # Vue.js frontend
├── db/
│   └── schema.hcl       # Atlas database schema
├── tests/
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
├── docs/                # Documentation
├── openspec/            # Project specifications
├── mklv.config.json     # Deployment contract
├── deno.jsonc           # Deno configuration
└── .github/workflows/   # CI/CD workflows
```

## Working with the Codebase

### Adding a New API Endpoint

1. Add the route in `api/routes/`:

```typescript
api.get("/my-endpoint", async (c) => {
  return c.json({ data: "example" });
});
```

1. Add types if needed in the relevant module

### Updating the Database Schema

The schema is defined declaratively in `db/schema.hcl` using
[Atlas](https://atlasgo.io/):

```hcl
schema "email_unsubscribe" {}

table "my_table" {
  schema = schema.email_unsubscribe
  column "id" {
    type = serial
  }
  column "name" {
    type = text
    null = false
  }
  primary_key {
    columns = [column.id]
  }
}
```

Apply changes:

```bash
# Preview changes
deno task db:diff

# Apply changes
deno task db:apply
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
// In api/unsubscribe/browser.ts
const browser = await chromium.launch({ headless: false });
```

#### Inspecting Playwright Traces

1. Find the trace file in the traces directory
2. Open with Playwright:

```bash
npx playwright show-trace trace-123.zip
```
