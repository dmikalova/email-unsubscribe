# Data Persistence

## ADDED Requirements

### Requirement: PostgreSQL schema isolation

The system SHALL use a dedicated PostgreSQL schema within a shared database
instance.

#### Scenario: Schema creation

- **WHEN** the application initializes
- **THEN** the system SHALL ensure the `email_unsubscribe` schema exists

#### Scenario: Credential isolation

- **WHEN** connecting to the database
- **THEN** the system SHALL use credentials that only have access to the
  `email_unsubscribe` schema

### Requirement: Store OAuth tokens

The system SHALL persist OAuth tokens securely.

#### Scenario: Token table

- **WHEN** storing OAuth tokens
- **THEN** the system SHALL store access_token, refresh_token, expiry, and
  encrypted_at fields

### Requirement: Store allow list entries

The system SHALL persist allow list entries.

#### Scenario: Allow list table

- **WHEN** storing an allow list entry
- **THEN** the system SHALL store the entry type (email/domain), value, and
  created_at timestamp

### Requirement: Store unsubscribe history

The system SHALL persist unsubscribe attempt history.

#### Scenario: Unsubscribe history table

- **WHEN** storing an unsubscribe attempt
- **THEN** the system SHALL store sender, unsubscribe_url, attempted_at, status,
  and failure_reason

### Requirement: Store sender tracking data

The system SHALL persist sender tracking information for compliance monitoring.

#### Scenario: Sender tracking table

- **WHEN** tracking a sender
- **THEN** the system SHALL store sender, first_seen, last_seen,
  unsubscribed_at, emails_after_unsubscribe count

### Requirement: Database migrations

The system SHALL support versioned database migrations.

#### Scenario: Migration on startup

- **WHEN** the application starts
- **THEN** the system SHALL apply any pending database migrations

#### Scenario: Migration versioning

- **WHEN** applying migrations
- **THEN** the system SHALL track applied migrations to prevent re-application

### Requirement: Audit logging

The system SHALL log all significant actions for forensics.

#### Scenario: Unsubscribe attempt logging

- **WHEN** an unsubscribe is attempted
- **THEN** the system SHALL log sender, URL, method, timestamp, and outcome

#### Scenario: Allow list change logging

- **WHEN** the allow list is modified (add/remove)
- **THEN** the system SHALL log the action, entry, and timestamp

#### Scenario: Authentication logging

- **WHEN** a user authenticates or session events occur
- **THEN** the system SHALL log login/logout events with timestamps

### Requirement: Database reliability

The system SHALL implement reliable database access patterns.

#### Scenario: Connection pooling

- **WHEN** connecting to the database
- **THEN** the system SHALL use connection pooling to handle connection limits
  efficiently

#### Scenario: Transaction handling

- **WHEN** performing multi-step database operations
- **THEN** the system SHALL use transactions to ensure atomicity

#### Scenario: Retry on transient errors

- **WHEN** a database operation fails with a transient error (connection lost,
  deadlock)
- **THEN** the system SHALL retry with exponential backoff
