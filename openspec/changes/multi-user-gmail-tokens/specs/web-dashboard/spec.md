# Web Dashboard

## ADDED Requirements

### Requirement: Gmail connection UI

The system SHALL provide UI for users to connect and disconnect their Gmail account.

#### Scenario: Display connection status

- **WHEN** loading the dashboard
- **THEN** the system SHALL display Gmail connection status prominently
- **AND** SHALL show the connected email address if connected

#### Scenario: Connect Gmail button

- **WHEN** Gmail is not connected
- **THEN** the system SHALL display a "Connect Gmail" button
- **AND** clicking the button SHALL initiate the OAuth flow

#### Scenario: Disconnect Gmail button

- **WHEN** Gmail is connected
- **THEN** the system SHALL display a "Disconnect" button
- **AND** clicking SHALL prompt for confirmation before disconnecting

#### Scenario: Connection required for scanning

- **WHEN** Gmail is not connected and user clicks "Scan Now"
- **THEN** the system SHALL display a message indicating Gmail must be connected first
- **AND** SHALL provide a link/button to connect Gmail

### Requirement: OAuth error handling UI

The system SHALL display clear error messages for OAuth failures.

#### Scenario: OAuth cancellation

- **WHEN** OAuth callback indicates user cancelled consent
- **THEN** the system SHALL display "Gmail connection cancelled" message
- **AND** SHALL return user to dashboard in disconnected state

#### Scenario: OAuth error

- **WHEN** OAuth callback indicates an error
- **THEN** the system SHALL display a user-friendly error message
- **AND** SHALL allow user to retry connection

#### Scenario: Token revocation notification

- **WHEN** the system detects Gmail access has been revoked
- **THEN** the system SHALL display a notification that Gmail needs to be reconnected
- **AND** SHALL show the "Connect Gmail" button
