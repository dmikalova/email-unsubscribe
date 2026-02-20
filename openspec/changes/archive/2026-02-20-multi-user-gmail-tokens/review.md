# Multi-User Gmail Tokens Review

## Summary

The design is well-structured with strong security foundations. The
two-OAuth-client architecture is sound and follows Google's recommendations. Key
areas for attention: CSRF implementation (currently broken in existing code),
ensuring token isolation is enforced consistently, and handling the existing
broken CSRF middleware.

## Security

- [x] **CSRF middleware is broken** - The existing code has `csrfMiddleware` but
      never sets the `csrf` cookie. The "Scan Now" button fails with "Invalid
      CSRF token". **Address**: Fix as part of this change since we're adding
      new OAuth routes that need CSRF protection.

- [x] **State parameter for OAuth** - Design specifies state validation but
      doesn't detail the cryptographic binding. **Address**: Use signed state
      token that includes user_id hash to prevent CSRF and session fixation.

- [x] **Token storage for cron context** - Cron jobs bypass normal user context.
      **Address**: Design already specifies separate `getTokensForCron` function
      with audit logging. Ensure this cannot be called from user-facing routes.

- [ ] **Refresh token rotation** - Google may issue new refresh tokens on each
      refresh. Existing code handles this but worth validating. **Defer**:
      Observe behavior in testing.

## Patterns

- [x] **Existing encryption module** - `gmail/encryption.ts` already implements
      AES-256-GCM. **Address**: Extend with key versioning as designed, don't
      duplicate.

- [x] **Consistent error handling** - Existing token code throws generic errors.
      **Address**: Use consistent error types that distinguish "no token" from
      "token invalid" from "decryption failed".

- [ ] **Audit logging pattern** - No existing audit logging in codebase.
      **Defer**: Consider extracting to shared utility if pattern spreads to
      other areas.

## Alternatives

- [x] **Supabase provider tokens** - Investigated using Supabase's
      `provider_token`/`provider_refresh_token` from initial Google login.
      **Decided against**: Requires all users get Gmail scopes at login;
      Supabase doesn't auto-refresh provider tokens. Design correctly uses
      separate OAuth client.

- [ ] **Google Identity Services library** - Could use Google's new frontend
      library for token popup flow instead of redirect. **Defer**: Redirect flow
      works fine; popup adds complexity.

## Simplifications

- [x] **Key versioning complexity** - Design includes key versioning for
      encryption. **Simplify**: Start with single key version; add versioning
      only when rotation is actually needed. Document the format but don't
      implement rotation logic until required.

- [x] **Remove DEFAULT_USER_ID** - Existing code has a fallback. **Address**:
      Remove completely; no default user pattern.

## Missing Considerations

- [x] **What if user connects different Gmail account than login email?** - User
      might log in as `alice@gmail.com` but connect `bob@gmail.com` for
      scanning. **Address**: Allow this (valid use case); store connected email
      in tokens table for display.

- [x] **Concurrent token refresh** - Two requests might try to refresh
      simultaneously. **Address**: Use database-level locking or optimistic
      concurrency to prevent race conditions.

- [x] **Testing strategy** - Design mentions E2E but not unit tests for token
      isolation. **Address**: Add requirement for unit tests that verify
      cross-user access fails.

- [ ] **Documentation for Google app verification** - Sensitive scopes require
      Google review. **Defer**: Document the verification process but don't
      block implementation since we can use test mode initially.

## Valuable Additions

- [x] **Token health check endpoint** - Endpoint to verify tokens are still
      valid without triggering a scan. **Address**: Add
      `GET /oauth/gmail/health` that tests token validity against Google's
      tokeninfo endpoint.

- [x] **Delete user data** - Allow users to delete all their data (tokens,
      history, settings). **Address**: Add `DELETE /api/user/data` endpoint that
      clears all user-associated data and logs the action.

## Action Items

1. Fix existing CSRF middleware - set cookie on page load, add header to
   frontend POSTs
2. Implement signed state parameter for OAuth flow
3. Remove `DEFAULT_USER_ID` constant and all optional user ID parameters
4. Recreate `oauth_tokens` table with UUID primary key and `connected_email`
   column
5. Add `oauth_audit_log` table for security event logging
6. Handle concurrent token refresh with database locking
7. Add unit tests for token isolation (cross-user access rejection)
8. Simplify key versioning - document format but defer rotation implementation
9. Add token health check endpoint (`GET /oauth/gmail/health`)
10. Add delete user data endpoint (`DELETE /api/user/data`)

## Deferred Items

1. Refresh token rotation observation (verify in testing)
2. Audit logging extraction to shared utility (if pattern spreads)
3. Google Identity Services popup flow
4. Google app verification documentation

## Updates Required

**Design updates:**

1. ~~Add section on CSRF fix approach (set cookie on HTML page load)~~ - Covered
   in action items
2. Clarify state parameter format: `base64(timestamp:user_id_hash:random)`
3. ~~Add `connected_email` to schema~~ - Already in updated design
4. Note key versioning as future-ready format, not immediate implementation

**Spec updates:**

None required - specs are at the right level of abstraction.
