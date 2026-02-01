## Context

This is a greenfield personal project to automate email unsubscription. The system will scan a Gmail inbox, identify emails with unsubscribe options, and automatically complete unsubscribe flows—even multi-step ones requiring browser interaction.

**Current state**: Manual unsubscription is tedious and inconsistent. No existing tooling in place.

**Constraints**:

- Single-user system (personal use only)
- Must handle sensitive Gmail credentials securely
- Unsubscribe pages vary wildly—some are one-click, others require forms or multiple steps
- Must run in the cloud with minimal maintenance (scheduled or continuous)

**Stakeholders**: Just me (dmikalova)

## Goals / Non-Goals

**Goals:**

- Automatically unsubscribe from all emails except allowed senders
- Handle diverse unsubscribe flows via browser automation
- Surface failed unsubscribe attempts for debugging and pattern improvement
- Provide visibility via authenticated web dashboard
- Run reliably on Northflank with secure credential management
- Support local development and testing

**Non-Goals:**

- Multi-user/SaaS support—this is personal-use only
- Email client functionality (reading/composing emails)
- Spam filtering or classification beyond unsubscribe detection
- Mobile app
- Supporting email providers other than Gmail (initially)

## Decisions

### Language & Runtime: TypeScript with Deno

**Decision**: Use TypeScript with Deno runtime.

**Rationale**:

- Native TypeScript support—no build step or tsconfig complexity
- Built-in security model (explicit permissions for network, file, env access)
- Modern ES modules, no node_modules bloat
- Good Playwright support via npm compatibility
- Familiar TypeScript, enabling faster development and debugging

**Alternatives considered**:

- Node.js: More mature ecosystem, but Deno's DX is cleaner
- Bun: Fast but less mature than Deno
- Go: Single binary deployment is nice, but less familiar

### Browser Automation: Playwright

**Decision**: Use Playwright for browser automation.

**Rationale**:

- Industry-standard browser automation with excellent TypeScript support
- Headless Chromium support for containerized environments
- Handles JavaScript-heavy unsubscribe pages reliably
- Auto-wait features reduce flaky automation
- Built-in screenshot and trace capabilities for debugging failed flows

**Alternatives considered**:

- Puppeteer: Similar capabilities, but Playwright has better cross-browser support and API
- Direct HTTP requests: Won't work for JavaScript-dependent pages

### Database: PostgreSQL with Schema Isolation

**Decision**: Use a dedicated schema within a shared Northflank PostgreSQL instance.

**Rationale**:

- Cost-efficient (one DB instance for multiple apps)
- Schema-level isolation provides security between apps
- PostgreSQL is reliable and well-supported on Northflank

**Schema approach**: Create `email_unsubscribe` schema with app-specific user that only has access to that schema.

### Web Framework: Hono

**Decision**: Use Hono as the web framework.

**Rationale**:

- Ultra-lightweight and fast
- First-class Deno support (also works on Node, Bun, edge runtimes—portable)
- Excellent TypeScript support with type-safe routing
- Simple, Express-like API that's easy to learn
- Middleware for common needs (CORS, sessions, etc.)
- Good foundation for future projects—skills transfer across runtimes

**Alternatives considered**:

- Fastify: Great but Node.js focused, heavier
- Express: Dated API, TypeScript support is bolted-on
- Oak (Deno-native): Good but Hono is more portable

### Frontend: Vue.js with Headless UI and Tailwind

**Decision**: Use Vue.js for the dashboard frontend with Headless UI for accessible components and Tailwind CSS for styling.

**Rationale**:

- Vue.js is simple and approachable with good TypeScript support
- Headless UI provides unstyled, accessible components (dialogs, menus, dropdowns) without imposing design opinions
- Tailwind CSS enables rapid styling with utility classes
- Full control over the look—can apply Material Design-inspired colors, shadows, and spacing
- Lighter than full component libraries like Vuetify

**Styling approach**: Use Tailwind with Material Design color palette and elevation shadows. Headless UI handles interactive component logic (accessibility, keyboard nav) while Tailwind handles appearance.

**Alternatives considered**:

- Vuetify: Full Material Design but has its own styling system, not Tailwind
- Material Tailwind: React-only, doesn't support Vue
- PrimeVue: Good but adds complexity

### Authentication: Google OAuth 2.0

**Decision**: Reuse Google OAuth for both Gmail API access and dashboard authentication.

**Rationale**:

- Single OAuth configuration
- Restricts dashboard access to the same Google account that owns the Gmail
- No separate auth system to maintain

**Implementation**: OAuth flow stores tokens in database; session cookie for dashboard; restrict to single allowed email address.

### Unsubscribe Flow Handling: Pattern-Based with Fallback

**Decision**: Implement pattern-based automation that learns common unsubscribe flows.

**Approach**:

1. Extract unsubscribe URL from email headers (`List-Unsubscribe`) or body parsing
2. Navigate to URL with headless browser
3. Try known patterns (click button with "unsubscribe" text, submit forms)
4. Log results; flag failures for review
5. Iteratively add new patterns as edge cases emerge

**Rationale**: Start simple, evolve based on real-world data. Perfect is the enemy of good—some unsubscribes will fail initially.

### Execution Model: Scheduled scans

**Decision**: Run email scans on a schedule (e.g., every 6 hours) using an in-process scheduler (e.g., `node-cron`).

**Rationale**:

- Single container deployment
- Simpler than setting up Gmail push notifications or IMAP IDLE
- Sufficient for personal use—immediate processing not required
- Easier to manage than Northflank cron jobs

**Alternative considered**:

- Gmail push notifications / Pub/Sub: Real-time but adds complexity (webhook endpoint, Pub/Sub setup)
- IMAP IDLE: Continuous listening, but Gmail's IMAP implementation has quirks and OAuth complexity

## Risks / Trade-offs

**[Unsubscribe pages are unpredictable]** → Start with common patterns; log failures; iterate. Accept that some will require manual handling initially.

**[Gmail API quotas]** → Batch operations; respect rate limits; scan periodically rather than continuously.

**[Browser automation in containers is heavy]** → Use headless Chromium; ensure container has sufficient memory (~512MB minimum). Playwright containers are well-documented.

**[OAuth token expiration]** → Store refresh tokens; implement automatic token refresh; alert if refresh fails.

**[Unsubscribe flow fails]** → Capture screenshots and page state on failure; surface in dashboard with URL and failure reason for debugging; iteratively add patterns.

**[Security of stored credentials]** → Encrypt tokens at rest; use Northflank secrets for sensitive config; restrict database access.

**[Malicious unsubscribe links]** → Browser automation executes arbitrary external pages. Mitigations: run in isolated container, no persistent browser state, screenshot all interactions for audit. Accept residual risk for personal-use system.

## Migration Plan

N/A—greenfield project. Initial deployment steps:

1. Set up Northflank project and PostgreSQL addon
2. Create database schema and app-specific user
3. Configure Google Cloud OAuth credentials
4. Deploy container with environment variables for secrets
5. Complete OAuth flow to authorize Gmail access
6. Configure DNS for email-unsubscribe.cddc39.tech

## Documentation

### Required documentation

- **Setup Guide**: Step-by-step instructions for:
  - Creating Google Cloud project and OAuth credentials
  - Configuring Northflank project, PostgreSQL addon, and secrets
  - Setting up DNS for custom subdomain
  - Initial OAuth authorization flow
  - Local development setup

- **Architecture Overview**: High-level diagram and explanation of:
  - Component interactions (scanner, automation, dashboard, database)
  - Data flow from email to unsubscribe completion
  - Authentication flow with main domain

## Open Questions

- **Chromium in container**: Playwright provides official Docker images, but need to verify they work well on Northflank. May need custom Dockerfile.
- **Gmail API vs IMAP**: Using Gmail API for now, but IMAP might be simpler for some operations. Evaluate after initial implementation.
- **Unsubscribe link extraction**: `List-Unsubscribe` header is ideal but not always present. Need fallback HTML parsing strategy.
- **Execution model**: Scheduled scans are simpler, but Gmail push notifications would be more responsive. Start with scheduled, consider push later if latency matters.
