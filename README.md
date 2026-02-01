# Email Unsubscribe

Automated email unsubscribe system that connects to Gmail via OAuth and automatically processes unsubscribe requests.

## Features

- 📧 Gmail integration via OAuth
- 🔗 Automatic unsubscribe link detection (RFC 8058 one-click, mailto, browser-based)
- ✅ Sender allow list to preserve important subscriptions
- 🔍 Failed flow debugging with screenshots and Playwright traces
- 📊 Web dashboard for monitoring and management
- 🔄 Pattern sharing for common unsubscribe flows

## Tech Stack

- **Runtime**: Deno
- **Web Framework**: Hono
- **Browser Automation**: Playwright
- **Frontend**: Vue.js + Tailwind CSS + Headless UI
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
