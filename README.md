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

### Database Migrations

```bash
# Run migrations
deno task migrate

# Create new migration
deno task migrate:create <name>
```

## Documentation

- [Google OAuth Setup](docs/setup-google.md)
- [Northflank Deployment](docs/deployment.md)
- [Architecture Overview](docs/architecture.md)
- [Local Development](docs/development.md)

## Deployment

The application is deployed on [Northflank](https://northflank.com). See [docs/deployment.md](docs/deployment.md) for configuration details.

## License

MIT
