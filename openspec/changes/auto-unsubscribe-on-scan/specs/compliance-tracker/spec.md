# Compliance Tracker

## ADDED Requirements

### Requirement: Domain-aggregated unsubscribe logs API

The system SHALL provide an API endpoint returning unsubscribe data aggregated
by domain.

#### Scenario: Get unsubscribe logs by domain

- **WHEN** calling `GET /api/unsubscribe-logs`
- **THEN** the system SHALL return a list of domains with aggregated unsubscribe
  statistics

#### Scenario: Domain summary fields

- **WHEN** receiving domain summary data
- **THEN** each entry SHALL include: domain, totalAttempts, successCount,
  failedCount, lastAttemptAt, followupEmails, flaggedIneffective

#### Scenario: Join with sender tracking

- **WHEN** building domain summaries
- **THEN** the system SHALL join `unsubscribe_history` with `sender_tracking` to
  include followup data

### Requirement: Dashboard unsubscribe logs view

The system SHALL display unsubscribe logs in the dashboard without private
message content.

#### Scenario: Domain log list display

- **WHEN** viewing unsubscribe logs in dashboard
- **THEN** the system SHALL display a table of domains with attempt counts and
  compliance status

#### Scenario: No private content in dashboard

- **WHEN** displaying unsubscribe logs
- **THEN** the system SHALL show domain names only, not individual email
  subjects or message content

#### Scenario: Compliance status indicator

- **WHEN** displaying a domain in the logs
- **THEN** the system SHALL indicate if the domain is flagged as ineffective
  (ignores unsubscribes)

## MODIFIED Requirements

### Requirement: Detect ineffective unsubscribes

The system SHALL detect when a previously unsubscribed sender sends a new email
containing an unsubscribe link, indicating the unsubscribe may not have worked.

#### Scenario: Grace period for confirmation emails

- **WHEN** an email is received from an unsubscribed sender within 24 hours of
  the unsubscribe
- **THEN** the system SHALL NOT flag this as an ineffective unsubscribe (allows
  for confirmation emails)

#### Scenario: New unsubscribable email from unsubscribed sender

- **WHEN** an email is received from a sender previously marked as successfully
  unsubscribed AND more than 24 hours have passed since the unsubscribe
- **THEN** the system SHALL flag this sender as ineffective and surface it in
  the dashboard

#### Scenario: Inquiry details

- **WHEN** viewing a flagged sender in the dashboard
- **THEN** the system SHALL display the original unsubscribe date, followup
  email count, last followup date, and both unsubscribe URLs for comparison
