# Proposal

## Why

Email subscriptions accumulate over time and most go unread. Manually
unsubscribing is tedious - each email has a different unsubscribe flow, some
requiring multiple clicks or form submissions. I want an automated system that
aggressively unsubscribes me from everything by default, with explicit opt-in
for the few subscriptions I actually want to keep.

## What Changes

This is a greenfield project establishing the email-unsubscribe system:

- **Gmail Integration**: Securely connect to Gmail account via OAuth, scan inbox
  for emails containing unsubscribe links
- **Automated Unsubscribe**: Navigate unsubscribe links and intelligently
  complete multi-step unsubscribe flows (clicking buttons, filling forms)
- **Sender Allow List**: Maintain a list of allowed senders that should never be
  unsubscribed (safer than email alias approach which could leak)
- **Failed Flow Debugging**: Surface failed unsubscribe attempts with
  screenshots and error details for debugging and pattern improvement
- **Adaptive Learning**: Continuously improve handling of different unsubscribe
  flow patterns
- **Cloud Deployment**: Containerized application deployable to Northflank PaaS
  with secure credential management
- **Local Development**: Support running locally for testing and development
- **Database Storage**: Persist allow list, unsubscribe history, and compliance
  tracking data in PostgreSQL; app connects to a shared Northflank Postgres
  instance with its own schema and dedicated credentials (isolated from other
  apps)
- **Web Dashboard**: Web interface showing stats, persistent senders, allow list
  management, and unsubscribe history; hosted at email-unsubscribe.cddc39.tech
- **CI/CD Pipeline**: Automated testing and deployment pipeline with GitHub
  Actions
- **Documentation**: Setup guide for OAuth and Northflank configuration;
  architecture overview

## Capabilities

### New Capabilities

- `gmail-connection`: Secure OAuth-based connection to Gmail API for reading
  emails and extracting unsubscribe links
- `email-scanner`: Scan inbox for emails with unsubscribe options, extract
  sender info and unsubscribe URLs
- `unsubscribe-automation`: Browser automation to navigate unsubscribe links and
  complete multi-step flows (clicking, form filling)
- `sender-allowlist`: Configurable list of sender addresses/domains that should
  never be unsubscribed
- `compliance-tracker`: Track unsubscribe attempts and surface failed flows with
  screenshots for debugging and pattern improvement
- `data-persistence`: PostgreSQL schema and access layer for storing allow list,
  history, and tracking data; uses dedicated schema on shared Northflank
  Postgres instance with app-specific credentials
- `container-deployment`: Dockerfile and deployment configuration for Northflank
  with secure credential handling
- `web-dashboard`: Web interface displaying stats (total unsubscribed, success
  rate), failed unsubscribes with screenshots for debugging, allow list
  management, and unsubscribe history; protected by Google OAuth (same account
  as Gmail); deployable at email-unsubscribe.cddc39.tech
- `ci-cd-testing`: Automated CI pipeline (build, lint, type-check, test),
  automated deployment to Northflank, unit tests, integration tests, E2E tests
  with Playwright, and test fixtures

### Modified Capabilities

<!-- None - this is a new project -->

## Impact

- **APIs**: Gmail API integration required (OAuth 2.0 credentials, manual setup
  step)
- **Dependencies**: Browser automation library (Playwright/Puppeteer), Gmail API
  client, database driver, web framework
- **Infrastructure**: Shared PostgreSQL instance on Northflank (app gets own
  schema + credentials), container runtime, Northflank account, DNS subdomain
  (email-unsubscribe.cddc39.tech)
- **Security**: Sensitive email access requires careful credential management;
  single-user system only; web dashboard requires Google OAuth login (restricts
  access to authorized Google account)
- **External Systems**: Interacts with arbitrary external unsubscribe pages
  (variable reliability)
