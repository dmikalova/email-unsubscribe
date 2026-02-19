# Web Dashboard

## ADDED Requirements

### Requirement: Authentication via main domain

The system SHALL require authentication and delegate login to the main domain
(cddc39.tech).

#### Scenario: Unauthenticated access

- **WHEN** a user accesses the dashboard without a valid session
- **THEN** the system SHALL redirect to <https://cddc39.tech> for login

#### Scenario: Authenticated access

- **WHEN** a user accesses the dashboard with a valid session from the main
  domain
- **THEN** the system SHALL grant dashboard access

### Requirement: Session security

The system SHALL implement secure session handling.

#### Scenario: Secure cookies

- **WHEN** setting session cookies
- **THEN** the system SHALL use Secure, HttpOnly, and SameSite=Strict flags

#### Scenario: Session expiration

- **WHEN** a session has been idle for the configured timeout
- **THEN** the system SHALL invalidate the session and require re-authentication

#### Scenario: CSRF protection

- **WHEN** processing state-changing requests (POST, PUT, DELETE)
- **THEN** the system SHALL validate CSRF tokens

### Requirement: Rate limiting

The system SHALL rate limit dashboard endpoints to prevent abuse.

#### Scenario: Retry endpoint rate limit

- **WHEN** the retry unsubscribe endpoint is called more than 10 times per
  minute
- **THEN** the system SHALL return 429 Too Many Requests

#### Scenario: General rate limit

- **WHEN** any endpoint receives more than 100 requests per minute from a
  session
- **THEN** the system SHALL return 429 Too Many Requests

### Requirement: Display unsubscribe statistics

The system SHALL display aggregate statistics about unsubscribe activity.

#### Scenario: Stats overview

- **WHEN** viewing the dashboard home
- **THEN** the system SHALL display total unsubscribes attempted, success count,
  failure count, and success rate

#### Scenario: Recent activity

- **WHEN** viewing the dashboard home
- **THEN** the system SHALL display recent unsubscribe attempts with their
  outcomes

#### Scenario: Digest view

- **WHEN** viewing the dashboard home
- **THEN** the system SHALL display a digest summary: unsubscribes this week,
  failures requiring attention, new senders detected, and ineffective
  unsubscribe flags

### Requirement: Domain grouping

The system SHALL group related senders by domain for consolidated viewing.

#### Scenario: Domain-based grouping

- **WHEN** viewing sender statistics
- **THEN** the system SHALL group senders by root domain (e.g., all
  `*.amazon.com` together)

#### Scenario: Domain stats

- **WHEN** viewing a domain group
- **THEN** the system SHALL display aggregate stats: total emails, total
  unsubscribes, success rate across all senders in that domain

#### Scenario: Expand domain details

- **WHEN** clicking on a domain group
- **THEN** the system SHALL show individual senders within that domain

### Requirement: Display failed unsubscribes for debugging

The system SHALL surface failed unsubscribe attempts prominently for debugging.

#### Scenario: Failed unsubscribes list

- **WHEN** viewing the failed unsubscribes page
- **THEN** the system SHALL display failed attempts with sender, URL, failure
  type, and timestamp

#### Scenario: Failure details with screenshot

- **WHEN** viewing a specific failed unsubscribe
- **THEN** the system SHALL display the captured screenshot and full error
  details

#### Scenario: Replay trace download

- **WHEN** viewing a specific failed unsubscribe that has a trace
- **THEN** the system SHALL provide a download link for the Playwright trace
  file for local replay

#### Scenario: Mark as resolved

- **WHEN** a failure has been manually handled
- **THEN** the system SHALL provide an action to mark it as resolved

### Requirement: Allow list management interface

The system SHALL provide a UI for managing the sender allow list.

#### Scenario: View allow list

- **WHEN** viewing the allow list page
- **THEN** the system SHALL display all allowed entries with their type and
  creation date

#### Scenario: Add to allow list

- **WHEN** submitting the add to allow list form
- **THEN** the system SHALL add the entry and display confirmation

#### Scenario: Remove from allow list

- **WHEN** clicking remove on an allow list entry
- **THEN** the system SHALL remove the entry after confirmation

### Requirement: Pattern management interface

The system SHALL provide a UI for managing unsubscribe patterns.

#### Scenario: View patterns

- **WHEN** viewing the patterns page
- **THEN** the system SHALL display all configured patterns with their match
  counts

#### Scenario: Export patterns

- **WHEN** clicking export
- **THEN** the system SHALL download all patterns as a JSON file

#### Scenario: Import patterns

- **WHEN** uploading a pattern file
- **THEN** the system SHALL merge patterns and display import results

### Requirement: Unsubscribe history view

The system SHALL provide a searchable history of unsubscribe attempts.

#### Scenario: History list

- **WHEN** viewing the history page
- **THEN** the system SHALL display unsubscribe attempts with sender, date, and
  status

#### Scenario: History filtering

- **WHEN** filtering the history
- **THEN** the system SHALL support filtering by status (success/failed) and
  sender search

#### Scenario: Retry failed unsubscribe

- **WHEN** viewing a failed unsubscribe in history
- **THEN** the system SHALL provide a retry action

### Requirement: Subdomain deployment

The system SHALL be deployable at email-unsubscribe.cddc39.tech.

#### Scenario: Custom domain

- **WHEN** deployed with DNS configured
- **THEN** the dashboard SHALL be accessible at email-unsubscribe.cddc39.tech

#### Scenario: HTTPS

- **WHEN** accessing the dashboard
- **THEN** the system SHALL serve over HTTPS (via Northflank TLS termination)
