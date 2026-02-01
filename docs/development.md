# Local Development Guide

This guide covers setting up and running the Email Unsubscribe application locally.

## Prerequisites

- [Deno](https://deno.land/) v2.0 or later
- [Docker](https://www.docker.com/) and Docker Compose
- [Google Cloud Project](./setup-google.md) with Gmail API enabled

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/dmikalova/email-unsubscribe.git
cd email-unsubscribe
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/email_unsubscribe
DATABASE_SCHEMA=email_unsubscribe

# Google OAuth (see docs/setup-google.md)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/oauth/callback

# Security
ENCRYPTION_KEY=your-32-character-encryption-key

# Development settings
SKIP_AUTH=true
SKIP_CSRF=true
```

### 3. Start PostgreSQL

Using Docker Compose:

```bash
docker compose up db -d
```

Or use an existing PostgreSQL instance.

### 4. Run Database Migrations

```bash
deno task migrate
```

### 5. Start the Development Server

```bash
deno task dev
```

The application will be available at http://localhost:8000

## Development Commands

| Command | Description |
|---------|-------------|
| `deno task dev` | Start development server with hot reload |
| `deno task start` | Start production server |
| `deno task test` | Run all tests |
| `deno task check` | Type check TypeScript |
| `deno task lint` | Run linter |
| `deno task fmt` | Format code |
| `deno task migrate` | Run database migrations |

## Running with Docker Compose

For a full local environment including the application:

```bash
docker compose up --build
```

This starts:
- Application on port 8000
- PostgreSQL on port 5432

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
├── deno.json            # Deno configuration
├── Dockerfile           # Container build
└── docker-compose.yml   # Local development setup
```

## Working with the Codebase

### Adding a New API Endpoint

1. Add the route in `src/api/routes.ts`:

```typescript
api.get('/my-endpoint', async (c) => {
  return c.json({ data: 'example' });
});
```

2. Add types if needed in the relevant module

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

Ensure `GOOGLE_REDIRECT_URI` exactly matches the URI configured in Google Cloud Console, including:
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
