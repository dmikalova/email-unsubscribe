# Email Scanner

## ADDED Requirements

### Requirement: Trigger unsubscribe inline during scan

The system SHALL automatically trigger unsubscribe automation when an email is
scanned.

#### Scenario: Auto-unsubscribe on scan

- **WHEN** an email is scanned with an unsubscribe link AND the sender is not on
  the allow list
- **THEN** the system SHALL immediately trigger the unsubscribe automation
  (one-click, mailto, or browser)

#### Scenario: Unsubscribe method selection

- **WHEN** triggering unsubscribe for an email
- **THEN** the system SHALL attempt methods in order: one-click (RFC 8058),
  mailto, browser automation

#### Scenario: Allow list bypass

- **WHEN** an email's sender matches an allow list entry
- **THEN** the system SHALL skip unsubscribe automation entirely

### Requirement: Graceful error handling per email

The system SHALL continue processing remaining emails when individual
unsubscribes fail.

#### Scenario: Unsubscribe failure continues batch

- **WHEN** an unsubscribe attempt fails for an email
- **THEN** the system SHALL record the failure and continue to the next email in
  the batch

#### Scenario: Failure recorded with details

- **WHEN** an unsubscribe attempt fails
- **THEN** the system SHALL record the failure reason, screenshot path, and
  trace path (if available)

#### Scenario: Exception handling

- **WHEN** an unexpected exception occurs during unsubscribe
- **THEN** the system SHALL catch it, log minimally, record to database, and
  continue processing

### Requirement: Privacy-preserving server logs

The system SHALL emit minimal information to server logs to protect user
privacy.

#### Scenario: Server log format

- **WHEN** logging an unsubscribe operation
- **THEN** the system SHALL log only `[Unsubscribe] userId={userId}` without
  domain, email, or sender details

#### Scenario: Error logging format

- **WHEN** logging an unsubscribe error
- **THEN** the system SHALL log only
  `[Unsubscribe] userId={userId} error={generic_error_type}` without PII

#### Scenario: Detailed logging to database only

- **WHEN** an unsubscribe completes (success or failure)
- **THEN** the system SHALL store full details (domain, sender, URL) only in the
  database, not server logs
