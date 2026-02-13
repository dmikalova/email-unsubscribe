## ADDED Requirements

### Requirement: Scan inbox for unsubscribable emails

The system SHALL periodically scan the Gmail inbox for emails containing unsubscribe options.

#### Scenario: Scheduled scan

- **WHEN** the configured scan interval elapses (e.g., every 6 hours)
- **THEN** the system SHALL scan recent emails for unsubscribe links

#### Scenario: One-Click Unsubscribe header detection (RFC 8058)

- **WHEN** an email contains a `List-Unsubscribe-Post` header along with `List-Unsubscribe`
- **THEN** the system SHALL mark this email as supporting one-click unsubscribe via POST request

#### Scenario: Unsubscribe link detection via header

- **WHEN** an email contains a `List-Unsubscribe` header with an HTTP/HTTPS URL
- **THEN** the system SHALL extract the unsubscribe URL from the header

#### Scenario: Mailto unsubscribe detection

- **WHEN** an email contains a `List-Unsubscribe` header with a `mailto:` link
- **THEN** the system SHALL extract the mailto address and mark as requiring email-based unsubscribe

#### Scenario: Unsubscribe link detection via body

- **WHEN** an email lacks a `List-Unsubscribe` header but contains an unsubscribe link in the body
- **THEN** the system SHALL parse the email body to extract the unsubscribe URL

### Requirement: Extract sender information

The system SHALL extract and normalize sender information from each email.

#### Scenario: Sender extraction

- **WHEN** an email is scanned
- **THEN** the system SHALL extract the sender email address and domain

#### Scenario: Sender normalization

- **WHEN** a sender uses plus-addressing or subdomains
- **THEN** the system SHALL normalize to the base sender identity for tracking purposes

### Requirement: Track scan position

The system SHALL track the last scanned email to ensure no emails are missed between scans.

#### Scenario: Record scan position

- **WHEN** a scan completes
- **THEN** the system SHALL store the timestamp or ID of the most recent email scanned

#### Scenario: Resume from last position

- **WHEN** a new scan starts
- **THEN** the system SHALL scan all emails received since the last recorded position, regardless of the scan interval

#### Scenario: First scan

- **WHEN** no previous scan position exists
- **THEN** the system SHALL scan the most recent 1000 emails as the initial backlog

### Requirement: Idempotent processing

The system SHALL not reprocess emails that have already been handled.

#### Scenario: Already processed email

- **WHEN** scanning encounters an email that was previously processed
- **THEN** the system SHALL skip it without re-attempting unsubscribe

#### Scenario: Process tracking

- **WHEN** an email is processed (success or failure)
- **THEN** the system SHALL record the email ID to prevent reprocessing

#### Scenario: Concurrent scan protection

- **WHEN** a scan is already in progress
- **THEN** the system SHALL skip starting a new scan until the current one completes

### Requirement: Skip allowed senders

The system SHALL not process emails from allowed senders.

#### Scenario: Allowed sender detected

- **WHEN** an email's sender matches an allow list entry
- **THEN** the system SHALL skip that email without attempting to unsubscribe
