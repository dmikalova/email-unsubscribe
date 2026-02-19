# Email Unsubscribe

Automated email unsubscribe system that connects to Gmail via OAuth and
automatically processes unsubscribe requests.

## Features

- Gmail integration via OAuth
- Automatic unsubscribe link detection (RFC 8058 one-click, mailto,
  browser-based)
- Sender allow list to preserve important subscriptions
- Failed flow debugging with screenshots and Playwright traces
- Web dashboard for monitoring and management
- Pattern sharing for common unsubscribe flows

## Tech Stack

- **Runtime**: Deno
- **Web Framework**: Hono
- **Browser Automation**: Playwright
- **Frontend**: Vue.js + Tailwind CSS + Headless UI
- **Database**: PostgreSQL

## Development

```bash
# Start development server
deno task dev

# Run tests
deno task test

# Type check
deno task check

# Lint
deno task lint

# Format
deno task fmt
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

See `.env.example` for required variables.

## Deployment

The application is deployed on Google Cloud Run with Supabase for PostgreSQL.
See [deployment.md](deployment.md) for details.
