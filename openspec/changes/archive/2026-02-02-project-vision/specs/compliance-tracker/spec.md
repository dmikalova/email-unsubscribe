# Compliance Tracker

## ADDED Requirements

### Requirement: Track unsubscribe attempts

The system SHALL record all unsubscribe attempts with their outcomes.

#### Scenario: Successful unsubscribe recorded

- **WHEN** an unsubscribe attempt succeeds
- **THEN** the system SHALL record the sender, timestamp, and success status

#### Scenario: Failed unsubscribe recorded

- **WHEN** an unsubscribe attempt fails
- **THEN** the system SHALL record the sender, timestamp, failure reason,
  screenshot, and page URL

### Requirement: Surface failed unsubscribe flows for debugging

The system SHALL make failed unsubscribe attempts easily accessible for
debugging and pattern improvement.

#### Scenario: Failed flow list

- **WHEN** viewing failed unsubscribes in the dashboard
- **THEN** the system SHALL display the sender, unsubscribe URL, failure reason,
  and timestamp

#### Scenario: Failure details with screenshot

- **WHEN** viewing a specific failed unsubscribe
- **THEN** the system SHALL display the captured screenshot showing the page
  state at failure

#### Scenario: Failure categorization

- **WHEN** recording a failure
- **THEN** the system SHALL categorize by type (timeout, no matching elements,
  navigation error, unknown)

### Requirement: Re-attempt failed unsubscribes

The system SHALL support re-attempting unsubscribes that previously failed.

#### Scenario: Manual retry trigger

- **WHEN** a user requests a retry for a failed unsubscribe
- **THEN** the system SHALL re-attempt the unsubscribe process

#### Scenario: Mark as resolved

- **WHEN** a user manually completes an unsubscribe
- **THEN** the system SHALL allow marking the failure as manually resolved

### Requirement: Detect ineffective unsubscribes

The system SHALL detect when a previously unsubscribed sender sends a new email
containing an unsubscribe link, indicating the unsubscribe may not have worked.

#### Scenario: Grace period for confirmation emails

- **WHEN** an email is received from an unsubscribed sender within 24 hours of
  the unsubscribe
- **THEN** the system SHALL NOT flag this as an ineffective unsubscribe (allows
  for confirmation emails)

#### Scenario: New unsubscribable email from unsubscribed sender

- **WHEN** an email with an unsubscribe link is received from a sender
  previously marked as successfully unsubscribed AND more than 24 hours have
  passed since the unsubscribe
- **THEN** the system SHALL flag this sender for inquiry and surface it in the
  dashboard

#### Scenario: Inquiry details

- **WHEN** viewing a flagged sender in the dashboard
- **THEN** the system SHALL display the original unsubscribe date, the new email
  date, and both unsubscribe URLs for comparison
