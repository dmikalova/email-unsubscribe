# Multi-User Gmail Tokens Tasks

## 1. Database Schema

- [x] 1.1 Drop existing `oauth_tokens` table and recreate with new schema (UUID
      primary key, `connected_email` column)
- [x] 1.2 Create `oauth_audit_log` table with indexes on user_id, event_type,
      and created_at
- [x] 1.3 Add `user_id` column to `allow_list`, `unsubscribe_history`,
      `processed_emails`, and `sender_tracking` tables

## 2. CSRF Fix

- [x] 2.1 Update HTML page to set CSRF cookie on load (generate token, set in
      cookie)
- [x] 2.2 Update frontend JavaScript to include `X-CSRF-Token` header on all
      POST/DELETE requests
- [x] 2.3 Verify "Scan Now" button works after CSRF fix
- [ ] 2.4 Add tests for CSRF validation (valid token accepted, missing/invalid
      rejected) - FOLLOW-UP

## 3. Token Storage Refactor

- [x] 3.1 Remove `DEFAULT_USER_ID` constant from `gmail/tokens.ts`
- [x] 3.2 Update `storeTokens()` to require user_id parameter (no default)
- [x] 3.3 Update `getTokens()` to require user_id parameter (no default)
- [x] 3.4 Update `getValidAccessToken()` to require user_id parameter
- [x] 3.5 Add `connected_email` field to stored token data
- [ ] 3.6 Add database locking for concurrent token refresh (SELECT FOR
      UPDATE) - FOLLOW-UP
- [ ] 3.7 Add unit tests verifying cross-user token access fails - FOLLOW-UP

## 4. Audit Logging

- [x] 4.1 Create `logAuditEvent()` utility function in `src/tracker/audit.ts`
- [x] 4.2 Log `gmail_connected` event on successful OAuth callback
      (oauth_authorized)
- [x] 4.3 Log `gmail_disconnected` event on disconnect (oauth_revoked)
- [x] 4.4 Log `token_refreshed` event on token refresh (success/failure)
- [ ] 4.5 Log `token_access_failed` event when Google returns 401 - FOLLOW-UP
- [ ] 4.6 Log `user_data_deleted` event on data deletion - FOLLOW-UP

## 5. Gmail OAuth Flow

- [x] 5.1 Create `GET /oauth/authorize` route - generate signed state, redirect
      to Google
- [x] 5.2 Implement signed state token generation (timestamp + user_id hash +
      random)
- [x] 5.3 Store state in URL parameter for validation
- [x] 5.4 Create `GET /oauth/callback` route - validate state, exchange code,
      store tokens
- [x] 5.5 Extract connected email from Google userinfo or token response
- [x] 5.6 Create `GET /oauth/status` route - return connection status for user
- [ ] 5.7 Add tests for OAuth flow (state validation, callback handling, error
      cases) - FOLLOW-UP

## 6. Gmail Disconnect

- [x] 6.1 Create `POST /oauth/revoke` route
- [x] 6.2 Delete tokens from database for user
- [x] 6.3 Return success response
- [ ] 6.4 Call Google revocation endpoint before deleting tokens - FOLLOW-UP
- [ ] 6.5 Add tests for disconnect flow - FOLLOW-UP

## 7. Token Health Check

- [x] 7.1 Create `GET /oauth/health` route
- [x] 7.2 Return `not_connected` status if no tokens exist
- [x] 7.3 Attempt token refresh if access token expired
- [x] 7.4 Return health status with expiration time and connected email
- [ ] 7.5 Verify token against Google tokeninfo endpoint - FOLLOW-UP
- [ ] 7.6 Add tests for health check endpoint - FOLLOW-UP

## 8. User Data Deletion

- [x] 8.1 Create `DELETE /oauth/data` route
- [x] 8.2 Delete user data from all tables (oauth_tokens, allow_list,
      unsubscribe_history, etc.)
- [x] 8.3 Return list of cleared tables
- [ ] 8.4 Require `?confirm=true` query parameter - FOLLOW-UP
- [ ] 8.5 Revoke Google token if exists before deletion - FOLLOW-UP
- [ ] 8.6 Log `user_data_deleted` audit event - FOLLOW-UP
- [ ] 8.7 Add tests for data deletion (with/without confirm, partial data) -
      FOLLOW-UP

## 9. Scanner Refactor

- [x] 9.1 Update `scanEmails()` to accept user_id parameter
- [x] 9.2 Update scan endpoint to use session user_id
- [x] 9.3 Return error if Gmail not connected for user
- [x] 9.4 Add user_id to all scan-related database operations
- [ ] 9.5 Update cron job to iterate all connected users - FOLLOW-UP
- [ ] 9.6 Handle per-user failures in cron (continue with other users) -
      FOLLOW-UP

## 10. Dashboard UI

- [x] 10.1 Add Gmail connection status display (connected email or "Not
      connected")
- [x] 10.2 Add "Connect Gmail" button when not connected
- [x] 10.3 Add "Disconnect" button when connected
- [x] 10.4 Update "Scan Now" to show error if Gmail not connected
- [ ] 10.5 Add "Delete My Data" button in settings (with confirmation dialog) -
      FOLLOW-UP
- [ ] 10.6 Display OAuth errors (cancelled, failed) with retry option -
      FOLLOW-UP
- [ ] 10.7 Show notification when Gmail connection is detected as revoked -
      FOLLOW-UP

## 11. Integration Testing - FOLLOW-UP

- [ ] 11.1 E2E test: Full OAuth connect flow (mock Google responses)
- [ ] 11.2 E2E test: Scan with connected Gmail
- [ ] 11.3 E2E test: Disconnect Gmail flow
- [ ] 11.4 E2E test: Token expiration and refresh during scan
- [ ] 11.5 E2E test: Delete user data flow
