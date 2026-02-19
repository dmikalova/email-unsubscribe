# Multi-User Gmail Tokens

## Context

The email-unsubscribe system currently uses a hardcoded "default" user ID for OAuth token storage, supporting only a single user. With the centralized login portal (`login.mklv.tech`) providing Supabase JWT authentication, we can now support multiple users.

**Current state:**

- Tokens stored with `user_id = "default"` (single user)
- AES-256-GCM encryption already implemented in `gmail/encryption.ts`
- Token refresh logic exists in `gmail/tokens.ts`
- No audit logging for token operations
- Single global ENCRYPTION_KEY for all tokens

**Constraints:**

- Must work with existing Supabase JWT from login portal (cannot modify login flow)
- Database migrations are additive-only (cannot drop columns)
- Google requires separate OAuth clients for different privilege levels
- Sensitive Gmail scopes require Google app verification for production

## Goals / Non-Goals

**Goals:**

- Per-user Gmail token storage keyed by Supabase user ID
- Strict token isolation (users can only access their own data)
- Security controls meeting OWASP recommendations for credential storage
- "Connect Gmail" flow separate from login
- Support both interactive (user present) and background (cron) token access
- Audit trail for token lifecycle events

**Non-Goals:**

- Multi-tenant SaaS features (billing, quotas, admin panels)
- Token sharing between users
- Modifying the login.mklv.tech authentication flow
- Supporting OAuth providers other than Google for Gmail

## Decisions

### 1. Two OAuth Clients (Separation of Authentication and Authorization)

**Decision:** Use Supabase's OAuth client for identity, a separate Gmail OAuth client for API access.

**Rationale:**

- Follows Google's recommended separation (Google Identity Services explicitly split auth from authorization in 2022+)
- Users see contextual consent ("Email Unsubscribe wants to read your Gmail") rather than scary permissions at login
- Can revoke Gmail access without affecting login
- Supabase manages identity lifecycle; we manage Gmail tokens

**Alternatives considered:**

- _Supabase with Gmail scopes:_ Would require all users to grant Gmail access at login, even if they never use the feature. Also requires manual token refresh since Supabase doesn't auto-refresh provider tokens.
- _Single custom OAuth client:_ Would require rebuilding login infrastructure, losing Supabase benefits.

### 2. User ID Strategy

**Decision:** Use Supabase `sub` claim (UUID) from JWT as `user_id` primary key.

**Rationale:**

- Immutable identifier (email can change)
- Already validated by auth middleware
- Consistent across all mklv.tech apps

**Schema change:**

```sql
-- Replace user_id TEXT with UUID, make it the primary key
CREATE TABLE oauth_tokens (
  user_id UUID PRIMARY KEY,
  access_token_encrypted BYTEA NOT NULL,
  refresh_token_encrypted BYTEA NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  scope TEXT,
  connected_email TEXT,  -- Which Gmail account is connected
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Since nothing is deployed yet, we can modify the schema directly rather than adding columns.

### 3. Token Encryption Strategy

**Decision:** Keep single ENCRYPTION_KEY with key versioning support.

**Rationale:**

- Per-user keys add complexity (key derivation, key storage) with marginal security benefit for this use case
- Single key with versioning allows key rotation without re-encrypting all tokens immediately
- AES-256-GCM already provides authenticated encryption

**Implementation:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION KEY VERSIONING                        │
└─────────────────────────────────────────────────────────────────────┘

    Stored token format: [version:1 byte][iv:12 bytes][ciphertext]

    ENCRYPTION_KEY_V1=<base64>     (current)
    ENCRYPTION_KEY_V2=<base64>     (future rotation)

    On read:  Check version byte → select correct key
    On write: Always use latest version
    Rotation: Lazy re-encryption on next token refresh
```

### 4. Token Isolation Enforcement

**Decision:** Enforce isolation at data access layer, not just API layer.

**Rationale:**

- Defense in depth - even if API middleware is bypassed, data layer rejects unauthorized access
- Single point of enforcement reduces risk of missed checks

**Implementation:**

```typescript
// All token queries MUST include user_id from authenticated session
async function getTokens(userId: string): Promise<StoredTokens | null> {
  // userId is REQUIRED, no default value
  // Query always includes WHERE supabase_user_id = $userId
}
```

Remove the `DEFAULT_USER_ID` constant and all functions that allow omitting user ID.

### 5. Audit Logging

**Decision:** Log token lifecycle events to dedicated audit table.

**Events to log:**

| Event                 | Data                                                     |
| --------------------- | -------------------------------------------------------- |
| `gmail_connected`     | user_id, timestamp, scopes_granted, connected_email      |
| `gmail_disconnected`  | user_id, timestamp, initiated_by (user/system)           |
| `token_refreshed`     | user_id, timestamp, success/failure, trigger (cron/user) |
| `token_access_failed` | user_id, timestamp, error, action_taken                  |
| `user_data_deleted`   | user_id, timestamp, tables_cleared                       |

**Schema:**

```sql
CREATE TABLE oauth_audit_log (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id ON oauth_audit_log(user_id);
CREATE INDEX idx_audit_event_type ON oauth_audit_log(event_type);
CREATE INDEX idx_audit_created_at ON oauth_audit_log(created_at);
```

### 6. Connect Gmail Flow

**Decision:** Dedicated OAuth routes with CSRF protection and state validation.

**Flow:**

```
User clicks "Connect Gmail"
        │
        ▼
GET /oauth/gmail/connect
  → Generate state token (CSRF + user_id hash)
  → Store state in session/cookie
  → Redirect to Google OAuth
        │
        ▼
User consents at Google
        │
        ▼
GET /oauth/gmail/callback?code=...&state=...
  → Validate state matches session
  → Exchange code for tokens
  → Store tokens with user_id from session
  → Log gmail_connected event
  → Redirect to dashboard with success
```

### 7. Token Revocation / Disconnect

**Decision:** User-initiated disconnect deletes tokens and revokes at Google.

**Implementation:**

```
POST /oauth/gmail/disconnect
  → Verify user owns token
  → Call Google revocation endpoint
  → DELETE from oauth_tokens WHERE user_id = $userId
  → Log gmail_disconnected event
  → Return success
```

Google revocation endpoint: `https://oauth2.googleapis.com/revoke?token=<access_token>`

### 8. Background/Cron Job Token Access

**Decision:** Cron iterates active users, accesses tokens with system context.

**Rationale:**

- No user session in cron context
- Need to scan all connected users' inboxes

**Implementation:**

```typescript
// Cron job context
async function runScheduledScan() {
  const activeUsers = await getActiveGmailUsers();

  for (const userId of activeUsers) {
    try {
      const tokens = await getTokensForCron(userId); // System-level access
      await scanUserInbox(userId, tokens);
      await logTokenAccess(userId, 'cron_scan');
    } catch (err) {
      // Handle per-user failures, continue with others
    }
  }
}
```

Cron access is logged separately from user-initiated access for audit trail.

### 9. Token Health Check

**Decision:** Provide endpoint to verify token validity without triggering a scan.

**Implementation:**

```
GET /oauth/gmail/health
  → Get user_id from session
  → If no tokens → return { status: "not_connected" }
  → If access token expired → attempt refresh
  → Call Google tokeninfo endpoint to verify
  → Return { status: "healthy", expires_at, connected_email }
     or   { status: "unhealthy", reason: "..." }
```

Google tokeninfo endpoint: `https://oauth2.googleapis.com/tokeninfo?access_token=<token>`

### 10. User Data Deletion

**Decision:** Allow users to delete all their data with a single action.

**Implementation:**

```
DELETE /api/user/data?confirm=true
  → Verify user session
  → Require ?confirm=true parameter
  → Call Google revocation endpoint (if tokens exist)
  → Delete from: oauth_tokens, allow_list, unsubscribe_history,
                 processed_emails, sender_tracking
  → Log user_data_deleted audit event
  → Return { success: true, deleted: [...tables] }
```

This provides users control over their data and supports a clean "start over" workflow.

## Risks / Trade-offs

| Risk                                                  | Mitigation                                                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Google app verification required for sensitive scopes | Submit for verification before production launch; use test mode during development (100 user limit)                   |
| Token refresh fails (user revoked access externally)  | Detect 401 from Gmail API, mark user as disconnected, surface in UI                                                   |
| Encryption key compromise                             | Key versioning allows rotation; tokens are useless without key; short access token lifetime (1hr) limits blast radius |
| Cron job processes user data without explicit consent | Consent is granted at "Connect Gmail" step; document in privacy policy; provide disconnect option                     |
| Single ENCRYPTION_KEY is single point of failure      | Store in Secret Manager with access controls; could move to per-user KDF in future if needed                          |

## Migration Plan

Since nothing is deployed to production yet, we can make breaking schema changes directly:

1. Drop and recreate `oauth_tokens` table with new schema
2. Add `oauth_audit_log` table
3. Update token functions to require user ID (no default)
4. Add Connect Gmail / Disconnect flows
5. Update scanner to accept user_id parameter

**Rollback:** Revert code and recreate old schema if needed.

## Open Questions

_All resolved:_

1. ~~**Token refresh rotation:**~~ **Yes, enable it.** Google may issue new refresh tokens on each refresh - always store the latest refresh token returned. This is automatic if we save tokens after every refresh.

2. ~~**Inactive user cleanup:**~~ **No cleanup.** The app is designed to run in the background after setup. Users may not access the dashboard frequently. Keep tokens indefinitely; only remove on explicit disconnect or Google revocation.

3. ~~**Rate limiting per user:**~~ **Yes, track per-user.** Gmail API quotas are per-project, but tracking per-user helps identify if one user's activity is causing issues. Log user_id with each API call for debugging. If quota issues arise, can implement per-user throttling.
