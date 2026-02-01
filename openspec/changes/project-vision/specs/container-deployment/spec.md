## ADDED Requirements

### Requirement: Containerized deployment

The system SHALL be deployable as a Docker container.

#### Scenario: Docker build

- **WHEN** building the application
- **THEN** a Dockerfile SHALL produce a runnable container image

#### Scenario: Chromium dependencies

- **WHEN** building the container
- **THEN** the image SHALL include headless Chromium and required dependencies for browser automation

### Requirement: Environment-based configuration

The system SHALL be configurable via environment variables.

#### Scenario: Database configuration

- **WHEN** deploying the container
- **THEN** database connection SHALL be configured via `DATABASE_URL` environment variable

#### Scenario: OAuth configuration

- **WHEN** deploying the container
- **THEN** OAuth client ID and secret SHALL be configured via `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables

#### Scenario: Allowed user configuration

- **WHEN** deploying the container
- **THEN** the authorized Google account email SHALL be configured via `ALLOWED_EMAIL` environment variable

### Requirement: Northflank deployment compatibility

The system SHALL be compatible with Northflank PaaS requirements.

#### Scenario: Health check endpoint

- **WHEN** deployed on Northflank
- **THEN** the system SHALL expose a `/health` endpoint for liveness checks

#### Scenario: Port binding

- **WHEN** deployed on Northflank
- **THEN** the system SHALL bind to the port specified by `PORT` environment variable

#### Scenario: Graceful shutdown

- **WHEN** receiving SIGTERM
- **THEN** the system SHALL complete in-progress operations and shut down gracefully

### Requirement: Monitoring, alerting, and logging

The system SHALL use Northflank's built-in observability features.

#### Scenario: Structured logging

- **WHEN** the system logs events
- **THEN** logs SHALL be written to stdout in structured JSON format for Northflank log aggregation

#### Scenario: Error alerting

- **WHEN** critical errors occur (OAuth failure, database connection loss, repeated automation failures)
- **THEN** the system SHALL log at error level for Northflank alerting rules

#### Scenario: Metrics exposure

- **WHEN** Northflank requests metrics
- **THEN** the system SHALL expose key metrics (scan count, success/failure rates, queue depth) via the health endpoint or logs

### Requirement: Local development support

The system SHALL support running locally for development and testing.

#### Scenario: Local execution

- **WHEN** running locally
- **THEN** the system SHALL work with local environment variables or `.env` file

#### Scenario: Local database

- **WHEN** developing locally
- **THEN** the system SHALL connect to a local PostgreSQL instance

### Requirement: Secrets rotation support

The system SHALL support rotating secrets without downtime.

#### Scenario: OAuth credential rotation

- **WHEN** OAuth client credentials are rotated
- **THEN** the system SHALL pick up new credentials on restart without code changes

#### Scenario: Database password rotation

- **WHEN** the database password is rotated via environment variable
- **THEN** the system SHALL use new credentials after restart
