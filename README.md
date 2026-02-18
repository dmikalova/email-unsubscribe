# Email Unsubscribe

Automated email unsubscribe system that connects to Gmail via OAuth and automatically processes unsubscribe requests. Built for personal use to automatically unsubscribe from _everything_ while maintaining an allow list for important senders.

## Features

- 📧 **Gmail Integration** - OAuth-based Gmail connection for secure email access
- 🔗 **Smart Unsubscribe Detection** - Parses RFC 8058 one-click headers, mailto links, and HTML unsubscribe links
- 🤖 **Browser Automation** - Uses Playwright to handle complex unsubscribe flows
- ✅ **Allow List** - Preserve subscriptions from important senders with pattern matching
- 🔍 **Debug Tools** - Screenshots and Playwright traces for failed unsubscribe flows
- 📊 **Web Dashboard** - Monitor progress, view failures, manage allow list
- 🔄 **Pattern Sharing** - Reusable automation patterns for common unsubscribe pages

## Tech Stack

- **Runtime**: [Deno](https://deno.land/) 2.0+
- **Web Framework**: [Hono](https://hono.dev/)
- **Browser Automation**: [Playwright](https://playwright.dev/)
- **Frontend**: Vue.js 3 + Tailwind CSS
- **Database**: PostgreSQL

## Quick Start

### Prerequisites

- [Deno](https://deno.land/) v2.0+
- PostgreSQL database
- Google Cloud project with Gmail API enabled

### Development

```bash
# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
# See docs/setup-google.md for OAuth setup

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

### Database Schema

The database schema is defined declaratively in `db/schema.hcl` and managed by [Atlas](https://atlasgo.io/).

```bash
# Install Atlas (macOS)
brew install ariga/tap/atlas

# View planned schema changes (fetches DATABASE_URL from Secret Manager)
deno task db:diff

# Apply schema changes
deno task db:apply

# Or provide DATABASE_URL explicitly
DATABASE_URL="postgres://..." deno task db:diff
```

Schema changes are automatically applied during CI/CD deployments.

## Documentation

- [Google OAuth Setup](docs/setup-google.md)
- [Deployment Guide](docs/deployment.md)
- [Architecture Overview](docs/architecture.md)
- [Local Development](docs/development.md)

## Deployment

The application is deployed on [Google Cloud Run](https://cloud.google.com/run) with [Supabase](https://supabase.com) for PostgreSQL. Cloud Run scales to zero when idle, minimizing costs for personal use.

**Key features:**

- Scale-to-zero serverless containers
- Automatic PR preview environments
- Infrastructure managed in a separate repo via Terramate

See [docs/deployment.md](docs/deployment.md) for configuration details.

### Deployment Contract

The [`deploy.config.ts`](mklv.config.mts) file defines this application's runtime requirements in a platform-agnostic format. Infrastructure tooling consumes this contract to provision appropriate resources.
