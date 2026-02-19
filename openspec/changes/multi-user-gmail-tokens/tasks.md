# Multi-User Gmail Tokens Tasks

## 1. Database Schema

- [ ] 1.1 Drop existing `oauth_tokens` table and recreate with new schema (UUID
      primary key, `connected_email` column)
- [ ] 1.2 Create `oauth_audit_log` table with indexes on user_id, event_type,
      and created_at
- [ ] 1.3 Add `user_id` column to `allow_list`, `unsubscribe_history`,
      `processed_emails`, and `sender_tracking` tables

## 2. CSRF Fix

- [ ] 2.1 Update HTML page to set CSRF cookie on load (generate token, set in
      cookie)
- [ ] 2.2 Update frontend JavaScript to include `X-CSRF-Token` header on all
      POST/DELETE requests
- [ ] 2.3 Verify "Scan Now" button works after CSRF fix
- [ ] 2.4 Add tests for CSRF validation (valid token accepted, missing/invalid
      rejected)

## 3. Token Storage Refactor

- [ ] 3.1 Remove `DEFAULT_USER_ID` constant from `gmail/tokens.ts`
- [ ] 3.2 Update `storeTokens()` to require user_id parameter (no default)
- [ ] 3.3 Update `getTokens()` to require user_id parameter (no default)
- [ ] 3.4 Update `getValidAccessToken()` to require user_id parameter
- [ ] 3.5 Add `connected_email` field to stored token data
- [ ] 3.6 Add database locking for concurrent token refresh (SELECT FOR UPDATE)
- [ ] 3.7 Add unit tests verifying cross-user token access fails

## 4. Audit Logging

- [ ] 4.1 Create `logAuditEvent()` utility function in `src/tracker/audit.ts`
- [ ] 4.2 Log `gmail_connected` event on successful OAuth callback
- [ ] 4.3 Log `gmail_disconnected` event on disconnect
- [ ] 4.4 Log `token_refreshed` event on token refresh (success/failure)
- [ ] 4.5 Log `token_access_failed` event when Google returns 401
- [ ] 4.6 Log `user_data_deleted` event on data deletion

## 5. Gmail OAuth Flow

- [ ] 5.1 Create `GET /oauth/gmail/connect` route - generate signed state,
      redirect to Google
- [ ] 5.2 Implement signed state token generation (timestamp + user_id hash +
      random)
- [ ] 5.3 Store state in session cookie for validation
- [ ] 5.4 Create `GET /oauth/gmail/callback` route - validate state, exchange
      code, store tokens
- [ ] 5.5 Extract connected email from Google userinfo or token response
- [ ] 5.6 Create `GET /oauth/gmail/status` route - return connection status for
      user
- [ ] 5.7 Add tests for OAuth flow (state validation, callback handling, error
      cases)

## 6. Gmail Disconnect

- [ ] 6.1 Create `POST /oauth/gmail/disconnect` route
- [ ] 6.2 Call Google revocation endpoint before deleting tokens
- [ ] 6.3 Delete tokens from database for user
- [ ] 6.4 Return success response with disconnected email
- [ ] 6.5 Add tests for disconnect flow

## 7. Token Health Check

- [ ] 7.1 Create `GET /oauth/gmail/health` route
- [ ] 7.2 Return `not_connected` status if no tokens exist
- [ ] 7.3 Attempt token refresh if access token expired
- [ ] 7.4 Verify token against Google tokeninfo endpoint
- [ ] 7.5 Return health status with expiration time and connected email
- [ ] 7.6 Add tests for health check endpoint

## 8. User Data Deletion

- [ ] 8.1 Create `DELETE /api/user/data` route
- [ ] 8.2 Require `?confirm=true` query parameter
- [ ] 8.3 Revoke Google token if exists
- [ ] 8.4 Delete user data from all tables (oauth_tokens, allow_list,
      unsubscribe_history, etc.)
- [ ] 8.5 Log `user_data_deleted` audit event
- [ ] 8.6 Return list of cleared tables
- [ ] 8.7 Add tests for data deletion (with/without confirm, partial data)

## 9. Scanner Refactor

- [ ] 9.1 Update `scanEmails()` to accept user_id parameter
- [ ] 9.2 Update scan endpoint to use session user_id
- [ ] 9.3 Return error if Gmail not connected for user
- [ ] 9.4 Update cron job to iterate all connected users
- [ ] 9.5 Handle per-user failures in cron (continue with other users)
- [ ] 9.6 Add user_id to all scan-related database operations

## 10. Dashboard UI

- [ ] 10.1 Add Gmail connection status display (connected email or "Not
      connected")
- [ ] 10.2 Add "Connect Gmail" button when not connected
- [ ] 10.3 Add "Disconnect" button when connected (with confirmation dialog)
- [ ] 10.4 Update "Scan Now" to show error if Gmail not connected
- [ ] 10.5 Add "Delete My Data" button in settings (with confirmation dialog)
- [ ] 10.6 Display OAuth errors (cancelled, failed) with retry option
- [ ] 10.7 Show notification when Gmail connection is detected as revoked

## 11. Integration Testing

- [ ] 11.1 E2E test: Full OAuth connect flow (mock Google responses)
- [ ] 11.2 E2E test: Scan with connected Gmail
- [ ] 11.3 E2E test: Disconnect Gmail flow
- [ ] 11.4 E2E test: Token expiration and refresh during scan
- [ ] 11.5 E2E test: Delete user data flow
