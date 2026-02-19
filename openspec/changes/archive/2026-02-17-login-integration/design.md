# Design

## Context

Email-unsubscribe middleware was updated during login-portal implementation to
redirect unauthenticated users to `login.{SESSION_DOMAIN}`. The code is already
in place, but the `web-dashboard` spec still references the old auth approach
(redirecting to cddc39.tech main domain).

Current state:

- Middleware correctly redirects to `https://login.{SESSION_DOMAIN}`
- JWT verification uses Supabase JWT with ES256 (public keys from JWKS endpoint)
- Session cookies are scoped to `.mklv.tech` for subdomain sharing
- Spec is outdated and needs alignment with implementation

## Goals / Non-Goals

**Goals:**

- Update web-dashboard spec to match actual login portal behavior
- Verify middleware implementation is correct and complete
- Document the session domain configuration approach

**Non-Goals:**

- Changing the authentication mechanism (already implemented)
- Multi-domain support beyond mklv.tech (future work)
- Gmail OAuth changes (separate from dashboard auth)

## Decisions

### Decision: Use SESSION_DOMAIN environment variable

**Choice:** Configure session domain via `SESSION_DOMAIN` env var with mklv.tech
default.

**Rationale:** Allows flexibility for different environments while maintaining
sensible defaults. Consistent with how login portal handles domain
configuration.

**Alternatives:**

- Hardcode domain → Less flexible, harder to test
- Parse from request host → More complex, potential security issues

## Risks / Trade-offs

**[Risk] SESSION_DOMAIN mismatch** → If SESSION_DOMAIN doesn't match cookie
domain from login portal, sessions won't work. Mitigation: Both services use
same env var pattern.

**[Risk] Spec drift** → Documentation may drift from implementation again.
Mitigation: Automated spec validation in CI (future).

**[Risk] Supabase Site URL misconfiguration** → If Supabase Auth Site URL is set
to localhost, OAuth redirects fail. Discovered during testing: must configure
Site URL to `https://login.mklv.tech` in Supabase Dashboard → Authentication →
URL Configuration.
