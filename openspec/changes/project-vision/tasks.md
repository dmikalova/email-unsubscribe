## 1. Project Setup

- [x] 1.1 Initialize Deno project with deno.json configuration
- [x] 1.2 Set up project directory structure (src/, tests/, docs/)
- [x] 1.3 Configure TypeScript settings in deno.json
- [x] 1.4 Add Hono web framework dependency
- [x] 1.5 Add Playwright dependency for browser automation
- [x] 1.6 Add PostgreSQL client dependency (postgres.js or similar)
- [x] 1.7 Create .env.example with required environment variables
- [x] 1.8 Set up ESLint and Prettier configuration
- [x] 1.9 Create initial README.md with project overview

## 2. Database Schema & Persistence

- [x] 2.1 Set up database migration framework
- [x] 2.2 Create migration: oauth_tokens table (encrypted access/refresh tokens, expiry)
- [x] 2.3 Create migration: allow_list table (type, value, created_at)
- [x] 2.4 Create migration: unsubscribe_history table (sender, url, status, failure_reason, screenshot_path, trace_path, attempted_at)
- [x] 2.5 Create migration: sender_tracking table (sender, domain, first_seen, last_seen, unsubscribed_at, emails_after_unsubscribe)
- [x] 2.6 Create migration: processed_emails table (email_id, processed_at) for idempotency
- [x] 2.7 Create migration: audit_log table (action, details, timestamp)
- [x] 2.8 Create migration: patterns table (name, selector, type, match_count)
- [x] 2.9 Create migration: scan_state table (last_email_id, last_scan_at)
- [x] 2.10 Implement database connection pooling module
- [x] 2.11 Implement transaction wrapper utility
- [x] 2.12 Implement retry logic for transient database errors

## 3. Gmail Connection

- [x] 3.1 Create Google OAuth client configuration
- [x] 3.2 Implement OAuth authorization flow (redirect to Google, handle callback)
- [x] 3.3 Implement secure token storage (encrypt before storing)
- [x] 3.4 Implement token retrieval and decryption
- [x] 3.5 Implement automatic token refresh on expiry
- [x] 3.6 Handle refresh token invalidation (alert and require re-auth)
- [x] 3.7 Create Gmail API client wrapper
- [x] 3.8 Implement rate limit handling with exponential backoff
- [x] 3.9 Implement batch request helper for fetching multiple emails
- [x] 3.10 Add quota awareness logging
- [x] 3.11 Implement Gmail label creation (Unsubscribed/Success, Unsubscribed/Failed)
- [x] 3.12 Implement email labeling after processing
- [x] 3.13 Implement email archiving after successful unsubscribe

## 4. Email Scanner

- [x] 4.1 Implement List-Unsubscribe header parser
- [x] 4.2 Implement List-Unsubscribe-Post header detection (RFC 8058)
- [x] 4.3 Implement mailto: link extraction from headers
- [x] 4.4 Implement HTML body unsubscribe link extraction
- [x] 4.5 Implement sender extraction and normalization
- [x] 4.6 Implement domain extraction for grouping
- [x] 4.7 Implement scan position tracking (store last email ID)
- [x] 4.8 Implement resume-from-position logic
- [x] 4.9 Implement initial backlog limit (1000 emails)
- [x] 4.10 Implement allow list checking before processing
- [x] 4.11 Implement idempotency check (skip already processed emails)
- [x] 4.12 Implement concurrent scan protection (mutex/lock)
- [x] 4.13 Create scheduled scan runner (node-cron equivalent for Deno)
- [x] 4.14 Implement ineffective unsubscribe detection (email after 24hr grace period)

## 5. Unsubscribe Automation - URL Validation

- [ ] 5.1 Implement URL scheme validation (HTTP/HTTPS only)
- [ ] 5.2 Implement private IP rejection (SSRF prevention)
- [ ] 5.3 Implement URL sanitization utility

## 6. Unsubscribe Automation - One-Click & Mailto

- [ ] 6.1 Implement RFC 8058 one-click POST request
- [ ] 6.2 Handle one-click success (2xx response)
- [ ] 6.3 Implement fallback to browser on one-click failure
- [ ] 6.4 Implement mailto unsubscribe (send email via Gmail API)
- [ ] 6.5 Handle mailto with subject parameter

## 7. Unsubscribe Automation - Browser Automation

- [ ] 7.1 Set up Playwright with headless Chromium
- [ ] 7.2 Implement page navigation with timeout handling
- [ ] 7.3 Implement button detection pattern matching
- [ ] 7.4 Implement form detection and filling
- [ ] 7.5 Implement multi-step flow handling
- [ ] 7.6 Implement success text detection heuristics
- [ ] 7.7 Implement error text detection heuristics
- [ ] 7.8 Implement preference center detection
- [ ] 7.9 Implement screenshot capture on all attempts
- [ ] 7.10 Implement Playwright trace recording on failure
- [ ] 7.11 Implement trace file cleanup (30-day retention)
- [ ] 7.12 Implement configurable timeout handling
- [ ] 7.13 Implement navigation error handling

## 8. Pattern Management

- [ ] 8.1 Create default unsubscribe button patterns
- [ ] 8.2 Create default form field patterns
- [ ] 8.3 Create default success text patterns
- [ ] 8.4 Create default error text patterns
- [ ] 8.5 Implement pattern matching engine
- [ ] 8.6 Implement pattern match count tracking
- [ ] 8.7 Implement pattern export to JSON
- [ ] 8.8 Implement pattern import from JSON (merge, avoid duplicates)

## 9. Compliance Tracker

- [ ] 9.1 Implement unsubscribe attempt recording (success/failure/uncertain)
- [ ] 9.2 Implement failure categorization (timeout, no match, navigation error, unknown)
- [ ] 9.3 Implement screenshot storage path management
- [ ] 9.4 Implement trace storage path management
- [ ] 9.5 Implement manual retry trigger
- [ ] 9.6 Implement mark-as-resolved functionality
- [ ] 9.7 Implement ineffective unsubscribe flagging (new email after successful unsubscribe)
- [ ] 9.8 Implement 24-hour grace period for confirmation emails

## 10. Allow List Management

- [ ] 10.1 Implement add sender/domain to allow list
- [ ] 10.2 Implement remove from allow list
- [ ] 10.3 Implement exact email matching
- [ ] 10.4 Implement domain matching
- [ ] 10.5 Implement subdomain handling (no implicit match)
- [ ] 10.6 Implement allow list query for scanner

## 11. Audit Logging

- [ ] 11.1 Implement audit log writer
- [ ] 11.2 Log unsubscribe attempts (sender, URL, method, outcome)
- [ ] 11.3 Log allow list changes (add/remove, entry, timestamp)
- [ ] 11.4 Log authentication events (session created, session expired)

## 12. Web Dashboard - Backend

- [ ] 12.1 Set up Hono application structure
- [ ] 12.2 Implement session validation middleware (check main domain session)
- [ ] 12.3 Implement redirect to cddc39.tech for unauthenticated users
- [ ] 12.4 Implement secure cookie settings (Secure, HttpOnly, SameSite=Strict)
- [ ] 12.5 Implement session expiration handling
- [ ] 12.6 Implement CSRF token generation and validation
- [ ] 12.7 Implement rate limiting middleware
- [ ] 12.8 Create API endpoint: GET /api/stats (dashboard stats)
- [ ] 12.9 Create API endpoint: GET /api/recent (recent activity)
- [ ] 12.10 Create API endpoint: GET /api/digest (weekly digest data)
- [ ] 12.11 Create API endpoint: GET /api/failed (failed unsubscribes list)
- [ ] 12.12 Create API endpoint: GET /api/failed/:id (failure details with screenshot)
- [ ] 12.13 Create API endpoint: GET /api/failed/:id/trace (download trace file)
- [ ] 12.14 Create API endpoint: POST /api/failed/:id/retry (retry unsubscribe)
- [ ] 12.15 Create API endpoint: POST /api/failed/:id/resolve (mark resolved)
- [ ] 12.16 Create API endpoint: GET /api/allowlist (list entries)
- [ ] 12.17 Create API endpoint: POST /api/allowlist (add entry)
- [ ] 12.18 Create API endpoint: DELETE /api/allowlist/:id (remove entry)
- [ ] 12.19 Create API endpoint: GET /api/history (unsubscribe history with filtering)
- [ ] 12.20 Create API endpoint: GET /api/domains (domain grouping stats)
- [ ] 12.21 Create API endpoint: GET /api/domains/:domain (senders in domain)
- [ ] 12.22 Create API endpoint: GET /api/patterns (list patterns)
- [ ] 12.23 Create API endpoint: GET /api/patterns/export (export JSON)
- [ ] 12.24 Create API endpoint: POST /api/patterns/import (import JSON)
- [ ] 12.25 Create API endpoint: GET /api/ineffective (ineffective unsubscribe flags)
- [ ] 12.26 Implement health check endpoint: GET /health

## 13. Web Dashboard - Frontend

- [ ] 13.1 Set up Vue.js project with TypeScript
- [ ] 13.2 Configure Tailwind CSS
- [ ] 13.3 Install and configure Headless UI
- [ ] 13.4 Define Material Design-inspired color palette and shadows
- [ ] 13.5 Create app layout component (navigation, content area)
- [ ] 13.6 Create dashboard home page (stats overview, digest, recent activity)
- [ ] 13.7 Create failed unsubscribes page (list with filtering)
- [ ] 13.8 Create failure detail view (screenshot, error details, trace download, retry/resolve actions)
- [ ] 13.9 Create allow list management page (list, add form, remove action)
- [ ] 13.10 Create unsubscribe history page (filterable list)
- [ ] 13.11 Create domain grouping view (domain list, expandable sender details)
- [ ] 13.12 Create pattern management page (list, export button, import upload)
- [ ] 13.13 Create ineffective unsubscribes page (flagged senders with details)
- [ ] 13.14 Implement CSRF token handling in API requests
- [ ] 13.15 Implement error handling and user feedback (toasts/alerts)
- [ ] 13.16 Add loading states for async operations

## 14. Container Deployment

- [ ] 14.1 Create Dockerfile with Deno and Playwright/Chromium
- [ ] 14.2 Configure environment variable handling
- [ ] 14.3 Implement graceful shutdown on SIGTERM
- [ ] 14.4 Implement structured JSON logging to stdout
- [ ] 14.5 Implement error-level logging for alerting
- [ ] 14.6 Expose metrics via health endpoint
- [ ] 14.7 Test container build and run locally
- [ ] 14.8 Create docker-compose.yml for local development (app + postgres)

## 15. CI/CD Pipeline

- [ ] 15.1 Create GitHub Actions workflow file
- [ ] 15.2 Add build step (deno compile/check)
- [ ] 15.3 Add TypeScript type checking step
- [ ] 15.4 Add linting step
- [ ] 15.5 Add unit test step
- [ ] 15.6 Add integration test step
- [ ] 15.7 Add container image build step
- [ ] 15.8 Configure Northflank deployment on main branch
- [ ] 15.9 Add migration validation step

## 16. Testing - Unit Tests

- [ ] 16.1 Set up Deno test framework
- [ ] 16.2 Write tests: URL extraction (List-Unsubscribe header parsing)
- [ ] 16.3 Write tests: mailto link parsing
- [ ] 16.4 Write tests: HTML body link extraction
- [ ] 16.5 Write tests: sender normalization
- [ ] 16.6 Write tests: domain grouping logic
- [ ] 16.7 Write tests: allow list matching (exact, domain, subdomain)
- [ ] 16.8 Write tests: pattern matching engine
- [ ] 16.9 Write tests: success/error text detection
- [ ] 16.10 Write tests: URL validation (SSRF prevention)
- [ ] 16.11 Write tests: RFC 8058 POST request formation

## 17. Testing - Integration Tests

- [ ] 17.1 Create Gmail API mock/fixtures
- [ ] 17.2 Write tests: email fetching with mocked API
- [ ] 17.3 Write tests: email labeling with mocked API
- [ ] 17.4 Write tests: email archiving with mocked API
- [ ] 17.5 Set up test database instance
- [ ] 17.6 Write tests: database CRUD operations
- [ ] 17.7 Write tests: migration application

## 18. Testing - E2E Tests

- [ ] 18.1 Create mock unsubscribe page: one-click button
- [ ] 18.2 Create mock unsubscribe page: form submission
- [ ] 18.3 Create mock unsubscribe page: multi-step flow
- [ ] 18.4 Create mock unsubscribe page: preference center
- [ ] 18.5 Create mock unsubscribe page: error states
- [ ] 18.6 Write E2E test: one-click unsubscribe flow
- [ ] 18.7 Write E2E test: form-based unsubscribe flow
- [ ] 18.8 Write E2E test: multi-step flow
- [ ] 18.9 Write E2E test: failure handling (screenshot, trace capture)
- [ ] 18.10 Create sample email fixtures with various header formats

## 19. Documentation

- [ ] 19.1 Write setup guide: Google Cloud project and OAuth credentials
- [ ] 19.2 Write setup guide: Northflank project and PostgreSQL addon
- [ ] 19.3 Write setup guide: Environment variables and secrets
- [ ] 19.4 Write setup guide: DNS configuration for subdomain
- [ ] 19.5 Write setup guide: Initial OAuth authorization
- [ ] 19.6 Write setup guide: Local development environment
- [ ] 19.7 Create architecture diagram
- [ ] 19.8 Write architecture overview: component interactions
- [ ] 19.9 Write architecture overview: data flow
- [ ] 19.10 Write architecture overview: authentication flow
