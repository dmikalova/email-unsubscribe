# OAuth Token Security

## ADDED Requirements

### Requirement: Per-user token isolation

The system SHALL enforce strict isolation between users' OAuth tokens.

#### Scenario: Token retrieval requires user context

- **WHEN** retrieving stored OAuth tokens
- **THEN** the system SHALL require a valid Supabase user ID
- **AND** SHALL return only tokens belonging to that user ID

#### Scenario: No default user fallback

- **WHEN** attempting to access tokens without a user ID
- **THEN** the system SHALL reject the request with an error
- **AND** SHALL NOT fall back to any default user

#### Scenario: Token queries always scoped

- **WHEN** executing database queries for tokens
- **THEN** the system SHALL always include the user ID in the WHERE clause
- **AND** SHALL NOT allow queries that return tokens for all users

### Requirement: Token encryption at rest

The system SHALL encrypt OAuth tokens before database storage.

#### Scenario: Encryption algorithm

- **WHEN** storing tokens in the database
- **THEN** the system SHALL encrypt using AES-256-GCM
- **AND** SHALL generate a random 12-byte IV for each encryption

#### Scenario: Encryption key management

- **WHEN** encrypting or decrypting tokens
- **THEN** the system SHALL retrieve the encryption key from Secret Manager
- **AND** the key SHALL be 256 bits (32 bytes)

#### Scenario: Key versioning

- **WHEN** storing encrypted tokens
- **THEN** the system SHALL include a version byte in the encrypted payload
- **AND** SHALL support multiple key versions for rotation

#### Scenario: Token decryption

- **WHEN** retrieving tokens from the database
- **THEN** the system SHALL decrypt using the key version indicated in the
  payload

### Requirement: Audit logging for token operations

The system SHALL log security-relevant token lifecycle events.

#### Scenario: Log Gmail connection

- **WHEN** a user completes Gmail OAuth authorization
- **THEN** the system SHALL log an audit event with type `gmail_connected`
- **AND** SHALL include user_id, timestamp, granted scopes, and IP address

#### Scenario: Log Gmail disconnection

- **WHEN** a user disconnects their Gmail account
- **THEN** the system SHALL log an audit event with type `gmail_disconnected`
- **AND** SHALL include user_id, timestamp, and initiator (user/system)

#### Scenario: Log token refresh

- **WHEN** an access token is refreshed
- **THEN** the system SHALL log an audit event with type `token_refreshed`
- **AND** SHALL include user_id, timestamp, and success/failure status

#### Scenario: Log token access failure

- **WHEN** a token operation fails due to revocation or invalidity
- **THEN** the system SHALL log an audit event with type `token_access_failed`
- **AND** SHALL include user_id, timestamp, and failure reason

### Requirement: Token revocation support

The system SHALL support revoking tokens at both local and provider level.

#### Scenario: User-initiated disconnection

- **WHEN** a user requests to disconnect their Gmail account
- **THEN** the system SHALL delete the stored tokens from the database
- **AND** SHALL call Google's revocation endpoint to invalidate the token

#### Scenario: Provider revocation handling

- **WHEN** Google indicates a token is revoked (401 response)
- **THEN** the system SHALL mark the user's Gmail connection as invalid
- **AND** SHALL surface the issue in the dashboard

#### Scenario: Revocation endpoint call

- **WHEN** revoking tokens at Google
- **THEN** the system SHALL POST to `https://oauth2.googleapis.com/revoke`
- **AND** SHALL include the access token as form parameter

### Requirement: Secure state parameter for OAuth flow

The system SHALL use cryptographically secure state parameters.

#### Scenario: State generation

- **WHEN** initiating Gmail OAuth flow
- **THEN** the system SHALL generate a state parameter containing a random token
- **AND** SHALL store the state in the user's session for validation

#### Scenario: State validation

- **WHEN** receiving the OAuth callback
- **THEN** the system SHALL verify the state parameter matches the stored value
- **AND** SHALL reject the callback if state does not match

#### Scenario: State expiration

- **WHEN** an OAuth callback arrives with an expired state
- **THEN** the system SHALL reject the callback
- **AND** SHALL require the user to restart the OAuth flow

### Requirement: Token health check

The system SHALL provide an endpoint to verify token validity without triggering
a scan.

#### Scenario: Health check with valid token

- **WHEN** calling GET /oauth/gmail/health with a valid session
- **THEN** the system SHALL verify the token against Google's tokeninfo endpoint
- **AND** SHALL return status "healthy" with token expiration time

#### Scenario: Health check with expired token

- **WHEN** calling GET /oauth/gmail/health and the access token is expired
- **THEN** the system SHALL attempt to refresh the token
- **AND** SHALL return status "healthy" if refresh succeeds
- **AND** SHALL return status "unhealthy" with reason if refresh fails

#### Scenario: Health check without Gmail connected

- **WHEN** calling GET /oauth/gmail/health for a user without Gmail connected
- **THEN** the system SHALL return status "not_connected"

### Requirement: User data deletion

The system SHALL allow users to delete all their stored data.

#### Scenario: Delete all user data

- **WHEN** calling DELETE /api/user/data with a valid session
- **THEN** the system SHALL delete OAuth tokens for the user
- **AND** SHALL delete allow list entries for the user
- **AND** SHALL delete unsubscribe history for the user
- **AND** SHALL delete any other user-associated data
- **AND** SHALL call Google's revocation endpoint
- **AND** SHALL log a user_data_deleted audit event

#### Scenario: Confirmation required

- **WHEN** calling DELETE /api/user/data
- **THEN** the system SHALL require a confirmation parameter
- **AND** SHALL reject the request without confirmation

#### Scenario: Data deletion is permanent

- **WHEN** user data is deleted
- **THEN** the system SHALL NOT retain any recoverable copies
- **AND** the user SHALL need to re-connect Gmail to use the service
