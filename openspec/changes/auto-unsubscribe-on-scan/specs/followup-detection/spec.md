# Followup Detection

## ADDED Requirements

### Requirement: Track post-unsubscribe email counts

The system SHALL track emails received from a sender after an unsubscribe
attempt to identify non-compliant senders.

#### Scenario: Email received after unsubscribe

- **WHEN** an email is received from a sender with a prior unsubscribe attempt
- **THEN** the system SHALL increment the `emails_after_unsubscribe` counter for
  that sender

#### Scenario: Email received within grace period

- **WHEN** an email is received from a sender within 24 hours of the unsubscribe
- **THEN** the system SHALL NOT count it against the sender (allows confirmation
  emails)

### Requirement: Flag ineffective unsubscribes

The system SHALL flag senders that continue emailing after unsubscribe requests.

#### Scenario: Sender flagged as ineffective

- **WHEN** an email is received from a sender more than 24 hours after
  unsubscribe
- **THEN** the system SHALL flag the sender as `flagged_ineffective` and record
  the flag timestamp

#### Scenario: Track last followup timestamp

- **WHEN** an email is received after the grace period from an unsubscribed
  sender
- **THEN** the system SHALL record the `last_email_after_unsubscribe_at`
  timestamp

### Requirement: Surface repeat offenders in dashboard

The system SHALL display senders that ignore unsubscribe requests in the
dashboard.

#### Scenario: Repeat offenders list

- **WHEN** viewing the compliance dashboard
- **THEN** the system SHALL display all senders with
  `flagged_ineffective = true`

#### Scenario: Repeat offender details

- **WHEN** viewing a flagged sender
- **THEN** the system SHALL display the original unsubscribe date, followup
  email count, and last followup date
