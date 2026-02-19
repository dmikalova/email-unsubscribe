# Gmail Connection

## MODIFIED Requirements

### Requirement: OAuth authentication with Gmail

The system SHALL authenticate with Gmail using Google OAuth 2.0 to obtain read
access to each user's inbox. Authentication is per-user and requires explicit
user action.

#### Scenario: Initial OAuth authorization

- **WHEN** a user clicks "Connect Gmail" in the dashboard
- **THEN** the system SHALL redirect to Google OAuth consent screen
- **AND** SHALL request gmail.readonly, gmail.modify, gmail.labels, and mail.google.com scopes
- **AND** SHALL include offline access (refresh token)

#### Scenario: OAuth callback handling

- **WHEN** Google redirects back after user consent
- **THEN** the system SHALL validate the state parameter
- **AND** SHALL exchange the authorization code for tokens
- **AND** SHALL store tokens associated with the authenticated user's Supabase ID

#### Scenario: Token refresh

- **WHEN** the access token expires
- **THEN** the system SHALL automatically refresh using the stored refresh token
- **AND** SHALL update the stored access token for the user

#### Scenario: Refresh token invalid

- **WHEN** the refresh token is invalid or revoked
- **THEN** the system SHALL mark the user's Gmail connection as disconnected
- **AND** SHALL surface the issue in the dashboard
- **AND** SHALL require the user to re-authorize via "Connect Gmail"

### Requirement: Secure token storage

The system SHALL store OAuth tokens encrypted in the database, keyed by user ID.

#### Scenario: Token persistence

- **WHEN** OAuth authorization completes
- **THEN** the system SHALL store the access token and refresh token encrypted at rest
- **AND** SHALL associate tokens with the authenticated user's Supabase UUID

#### Scenario: Token retrieval

- **WHEN** the system needs to access Gmail
- **THEN** the system SHALL decrypt and use the stored tokens for the specific user
- **AND** SHALL reject requests without a valid user context

#### Scenario: Token isolation

- **WHEN** accessing stored tokens
- **THEN** the system SHALL only return tokens belonging to the requesting user
- **AND** SHALL NOT allow cross-user token access

## ADDED Requirements

### Requirement: Gmail connection status

The system SHALL track and expose Gmail connection status per user.

#### Scenario: Check connection status

- **WHEN** loading the dashboard for an authenticated user
- **THEN** the system SHALL indicate whether Gmail is connected
- **AND** SHALL show "Connect Gmail" if not connected
- **AND** SHALL show "Disconnect" if connected

#### Scenario: Connection status endpoint

- **WHEN** calling GET /oauth/gmail/status
- **THEN** the system SHALL return the connection status for the authenticated user
- **AND** SHALL include connected (boolean), email (if connected), and connected_at timestamp

### Requirement: Per-user email scanning

The system SHALL scan emails on behalf of specific users.

#### Scenario: User-initiated scan

- **WHEN** a user clicks "Scan Now" in the dashboard
- **THEN** the system SHALL scan that user's inbox using their stored tokens
- **AND** SHALL store scan results associated with that user

#### Scenario: Background scan for all users

- **WHEN** the scheduled scan job runs
- **THEN** the system SHALL iterate through all users with valid Gmail connections
- **AND** SHALL scan each user's inbox with their respective tokens
- **AND** SHALL handle per-user failures without stopping the entire job

#### Scenario: Scan requires connection

- **WHEN** a scan is attempted for a user without Gmail connected
- **THEN** the system SHALL return an error indicating Gmail must be connected first
