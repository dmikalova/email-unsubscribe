# Email Unsubscribe

Automated email unsubscribe system that connects to Gmail via OAuth and
automatically processes unsubscribe requests. Built for personal use to
automatically unsubscribe from _everything_ while maintaining an allow list for
important senders.

**Live at [email-unsubscribe.mklv.tech](https://email-unsubscribe.mklv.tech)**

## Features

- **Gmail Integration** - OAuth-based Gmail connection for secure email access
- **Smart Unsubscribe Detection** - Parses RFC 8058 one-click headers, mailto
  links, and HTML unsubscribe links
- **Browser Automation** - Uses Playwright to handle complex unsubscribe flows
- **Allow List** - Preserve subscriptions from important senders with pattern
  matching
- **Debug Tools** - Screenshots and Playwright traces for failed unsubscribe
  flows
- **Web Dashboard** - Monitor progress, view failures, manage allow list
- **Pattern Sharing** - Reusable automation patterns for common unsubscribe
  pages

## Tech Stack

- **Runtime**: [Deno](https://deno.land/) 2.0+
- **Web Framework**: [Hono](https://hono.dev/)
- **Browser Automation**: [Playwright](https://playwright.dev/)
- **Frontend**: Vue.js 3 + Tailwind CSS
- **Database**: PostgreSQL

## Quick Start

```bash
# Start API server with hot reload
deno task api:dev

# Start frontend dev server (in separate terminal)
deno task src:dev
```

## Documentation

- [Local Development](docs/development.md) - Development setup and debugging
- [Google OAuth Setup](docs/setup-google.md) - Configure Gmail API credentials
- [Deployment Guide](docs/deployment.md) - Cloud Run deployment and monitoring
- [Architecture Overview](docs/architecture.md) - System design and data flow
