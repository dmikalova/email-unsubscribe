## Why

Email-unsubscribe currently has partial login infrastructure but isn't fully integrated with the centralized login portal at `login.mklv.tech`. The middleware was updated to use Supabase JWT verification, but the dashboard needs updated redirect URLs and the web-dashboard spec references an outdated auth approach (cddc39.tech).

## What Changes

- Update redirect URLs to use `login.{SESSION_DOMAIN}` instead of hardcoded domain
- Update web-dashboard spec to reflect the login portal architecture
- Remove any remaining references to the old cddc39.tech auth approach
- Ensure cookie domain scoping works correctly for session sharing

## Capabilities

### New Capabilities

None - this change integrates with existing login portal capability.

### Modified Capabilities

- `web-dashboard`: Update authentication requirements to use centralized login portal at `login.{domain}` instead of redirecting to main domain

## Impact

- **Code**: `src/api/middleware.ts` - verify redirect URL construction
- **Specs**: `openspec/specs/web-dashboard/spec.md` - update auth scenarios
- **Dependencies**: Requires login portal to be deployed and operational
- **Systems**: Session cookies shared across `*.mklv.tech` subdomains
