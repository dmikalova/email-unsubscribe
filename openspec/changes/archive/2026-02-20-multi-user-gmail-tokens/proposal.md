# Multi-User Gmail Tokens

## Why

The system currently hardcodes Gmail OAuth tokens for a single user, preventing
multi-user operation. With the centralized login portal (`login.mklv.tech`) now
providing authenticated user identity via Supabase JWT, the system can support
multiple users—each connecting their own Gmail account. This requires secure
per-user token storage following OAuth 2.0 security best practices and industry
standards for credential management.

## What Changes

- **Separate OAuth flows**: Identity via Supabase (login.mklv.tech), Gmail
  authorization via dedicated OAuth client (email-unsubscribe.mklv.tech). This
  follows Google's recommended separation of authentication and authorization.
- **"Connect Gmail" flow**: After login, users see a "Connect Gmail" button.
  Clicking initiates a second OAuth consent specifically for Gmail scopes.
  Tokens stored per-user.
- **Multi-user token storage**: Store OAuth refresh tokens per-user in the
  database, keyed by Supabase user ID
- **Token isolation**: Strict enforcement that users can only access their own
  tokens and email data
- **Enhanced security controls**: Implement OWASP-recommended practices for
  OAuth token handling beyond basic encryption
- **Scanner refactor**: Modify scanner to operate per-user, looking up tokens
  from session or cron user list
- **User-initiated revocation**: Allow users to disconnect Gmail and trigger
  token deletion
- **BREAKING**: Remove hardcoded single-user token approach; existing token
  migration required

## Capabilities

### New Capabilities

- `oauth-token-security`: Security controls for OAuth token lifecycle management
  including encryption, rotation, audit logging, and revocation. Covers OWASP
  guidelines for sensitive credential storage.

### Modified Capabilities

- `gmail-connection`: Extend to support per-user token storage and retrieval.
  Tokens keyed by user ID. Scanner operates on behalf of authenticated user or
  iterates users for cron.
- `web-dashboard`: Add "Connect Gmail" / "Disconnect Gmail" UI flow. Show
  connection status per user.

## Impact

**Database**:

- Modify `oauth_tokens` table to add `user_id` foreign key (or column for
  Supabase UUID)
- Add `token_metadata` table for audit/rotation tracking

**API**:

- New `/oauth/gmail/connect` endpoint initiating user-specific OAuth flow
- New `/oauth/gmail/disconnect` endpoint for token revocation
- New `/oauth/gmail/status` endpoint to check connection state
- Modify `/api/scan` to use session user's tokens

**Security**:

- Encryption key management (consider per-user keys or key derivation)
- Audit log integration for token access events
- Token rotation policy implementation

**External dependencies**:

- Google Cloud OAuth consent screen verification (sensitive scopes require
  review)
- Supabase user ID integration from JWT claims
