# Unsubscribe Automation

## ADDED Requirements

### Requirement: URL validation and sanitization

The system SHALL validate and sanitize all unsubscribe URLs before processing.

#### Scenario: Valid HTTP/HTTPS URL

- **WHEN** processing an unsubscribe URL
- **THEN** the system SHALL only proceed if the URL is a valid HTTP or HTTPS URL

#### Scenario: Invalid URL rejection

- **WHEN** an unsubscribe URL is not HTTP/HTTPS (e.g., javascript:, file:,
  data:)
- **THEN** the system SHALL reject it and log a security warning

#### Scenario: Private IP rejection

- **WHEN** an unsubscribe URL resolves to a private IP range (localhost, 10.x,
  192.168.x)
- **THEN** the system SHALL reject it to prevent SSRF attacks

### Requirement: One-Click Unsubscribe (RFC 8058)

The system SHALL attempt RFC 8058 one-click unsubscribe before falling back to
browser automation.

#### Scenario: One-click POST request

- **WHEN** an email supports one-click unsubscribe (`List-Unsubscribe-Post`
  header)
- **THEN** the system SHALL send a POST request with
  `List-Unsubscribe=One-Click` body to the unsubscribe URL

#### Scenario: One-click success

- **WHEN** the POST request returns a 2xx status
- **THEN** the system SHALL record success without browser automation

#### Scenario: One-click failure fallback

- **WHEN** the POST request fails or returns non-2xx status
- **THEN** the system SHALL fall back to browser automation

### Requirement: Mailto unsubscribe

The system SHALL handle mailto-based unsubscribe links.

#### Scenario: Send unsubscribe email

- **WHEN** an email only has a `mailto:` unsubscribe link
- **THEN** the system SHALL send an email to that address with "unsubscribe" as
  the subject

#### Scenario: Mailto with subject

- **WHEN** the mailto link includes a subject parameter
- **THEN** the system SHALL use the specified subject in the unsubscribe email

### Requirement: Navigate unsubscribe URLs

The system SHALL use browser automation to navigate to unsubscribe URLs and
complete the unsubscribe process.

#### Scenario: Simple one-click unsubscribe

- **WHEN** the unsubscribe page contains a single confirmation button
- **THEN** the system SHALL click the button and record success

#### Scenario: Multi-step unsubscribe flow

- **WHEN** the unsubscribe page requires multiple steps (e.g., confirm email,
  click button)
- **THEN** the system SHALL attempt to complete each step using pattern matching

#### Scenario: Form-based unsubscribe

- **WHEN** the unsubscribe page requires filling a form (e.g., email address
  input)
- **THEN** the system SHALL fill the form with the user's email and submit

### Requirement: Pattern-based interaction

The system SHALL use configurable patterns to identify and interact with
unsubscribe page elements.

#### Scenario: Button detection

- **WHEN** the page contains a button or link with text matching unsubscribe
  patterns (e.g., "unsubscribe", "opt out", "remove")
- **THEN** the system SHALL click that element

#### Scenario: Unknown page layout

- **WHEN** the page does not match any known patterns
- **THEN** the system SHALL log the failure and mark the unsubscribe as
  requiring review

#### Scenario: Preference center detection

- **WHEN** the page appears to be a preference center (multiple checkboxes,
  frequency options) rather than a simple unsubscribe
- **THEN** the system SHALL flag for review and log the page structure for
  pattern improvement

### Requirement: Headless browser execution

The system SHALL run browser automation in headless mode suitable for
containerized environments.

#### Scenario: Headless execution

- **WHEN** processing an unsubscribe URL
- **THEN** the system SHALL use headless Chromium without requiring a display

#### Scenario: JavaScript-heavy pages

- **WHEN** the unsubscribe page requires JavaScript to render
- **THEN** the system SHALL wait for page load and JavaScript execution before
  interacting

### Requirement: Unsubscribe success heuristics

The system SHALL analyze the resulting page to determine if unsubscribe actually
succeeded.

#### Scenario: Success text detection

- **WHEN** after completing unsubscribe steps, the page contains success
  indicators ("successfully unsubscribed", "you've been removed", "no longer
  receive")
- **THEN** the system SHALL mark the unsubscribe as confirmed successful

#### Scenario: Error text detection

- **WHEN** the page contains error indicators ("already unsubscribed", "link
  expired", "error")
- **THEN** the system SHALL record the specific error and flag for review

#### Scenario: Ambiguous result

- **WHEN** no clear success or error indicators are found
- **THEN** the system SHALL mark as "attempted" with uncertain status and
  capture screenshot

### Requirement: Timeout and error handling

The system SHALL handle timeouts and errors gracefully during unsubscribe
attempts.

#### Scenario: Page timeout

- **WHEN** a page fails to load within the configured timeout
- **THEN** the system SHALL mark the attempt as failed and log the error

#### Scenario: Navigation error

- **WHEN** the unsubscribe URL is invalid or returns an error
- **THEN** the system SHALL record the failure with the error details

### Requirement: Playwright trace recording

The system SHALL record full Playwright traces for failed automation attempts.

#### Scenario: Trace on failure

- **WHEN** an unsubscribe automation fails
- **THEN** the system SHALL save the full Playwright trace file for replay and
  debugging

#### Scenario: Trace storage

- **WHEN** storing traces
- **THEN** the system SHALL retain traces for a configurable period (e.g., 30
  days) before cleanup

### Requirement: Pattern sharing

The system SHALL support exporting and importing unsubscribe patterns.

#### Scenario: Export patterns

- **WHEN** a user requests pattern export
- **THEN** the system SHALL export all custom patterns as a JSON file

#### Scenario: Import patterns

- **WHEN** a user uploads a pattern file
- **THEN** the system SHALL merge imported patterns with existing ones, avoiding
  duplicates
