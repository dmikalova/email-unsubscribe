## ADDED Requirements

### Requirement: Automated CI pipeline

The system SHALL have an automated CI pipeline that runs on every push.

#### Scenario: Build validation

- **WHEN** code is pushed to the repository
- **THEN** the CI pipeline SHALL build the application and fail if build errors occur

#### Scenario: Type checking

- **WHEN** the CI pipeline runs
- **THEN** TypeScript type checking SHALL pass with no errors

#### Scenario: Linting

- **WHEN** the CI pipeline runs
- **THEN** the linter SHALL pass with no errors or warnings

#### Scenario: Unit test execution

- **WHEN** the CI pipeline runs
- **THEN** all unit tests SHALL pass

#### Scenario: Integration test execution

- **WHEN** the CI pipeline runs
- **THEN** all integration tests SHALL pass

### Requirement: Automated deployment

The system SHALL automatically deploy to Northflank on successful main branch builds.

#### Scenario: Container image build

- **WHEN** CI passes on the main branch
- **THEN** the pipeline SHALL build and push a Docker image to the container registry

#### Scenario: Automatic deployment

- **WHEN** a new container image is pushed for main branch
- **THEN** Northflank SHALL automatically deploy the new version

#### Scenario: Migration validation

- **WHEN** deploying a new version
- **THEN** database migrations SHALL be validated before deployment completes

### Requirement: Unit test coverage

The system SHALL have unit tests for core logic.

#### Scenario: URL extraction tests

- **WHEN** testing URL extraction
- **THEN** tests SHALL cover List-Unsubscribe header parsing, mailto links, and body link extraction

#### Scenario: Pattern matching tests

- **WHEN** testing pattern matching
- **THEN** tests SHALL cover button detection, form detection, and success/error text detection

#### Scenario: Domain grouping tests

- **WHEN** testing domain grouping
- **THEN** tests SHALL cover subdomain normalization and aggregation logic

#### Scenario: Allow list matching tests

- **WHEN** testing allow list matching
- **THEN** tests SHALL cover exact email match, domain match, and subdomain handling

### Requirement: Integration tests

The system SHALL have integration tests for external service interactions.

#### Scenario: Gmail API mock tests

- **WHEN** testing Gmail integration
- **THEN** tests SHALL use mocked Gmail API responses to verify email fetching, labeling, and archiving

#### Scenario: Database integration tests

- **WHEN** testing database operations
- **THEN** tests SHALL run against a test database instance

### Requirement: E2E automation tests

The system SHALL have E2E tests for browser automation flows.

#### Scenario: Test fixture pages

- **WHEN** testing unsubscribe automation
- **THEN** tests SHALL use local mock unsubscribe pages with known behaviors

#### Scenario: One-click unsubscribe test

- **WHEN** testing one-click unsubscribe
- **THEN** tests SHALL verify correct POST request formation and response handling

#### Scenario: Multi-step flow test

- **WHEN** testing multi-step flows
- **THEN** tests SHALL verify navigation through button clicks and form submissions

#### Scenario: Failure handling test

- **WHEN** testing failure scenarios
- **THEN** tests SHALL verify screenshot capture, trace recording, and proper error categorization

### Requirement: Test fixtures

The system SHALL include test fixtures for reliable testing.

#### Scenario: Sample email fixtures

- **WHEN** testing email scanning
- **THEN** fixtures SHALL include emails with various unsubscribe header formats

#### Scenario: Mock unsubscribe pages

- **WHEN** testing browser automation
- **THEN** fixtures SHALL include HTML pages simulating common unsubscribe patterns (one-click, form, multi-step, preference center)
