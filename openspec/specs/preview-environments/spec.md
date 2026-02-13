## ADDED Requirements

### Requirement: Preview environment per pull request

The system SHALL create an ephemeral Cloud Run service for each open pull request to enable testing changes before merge.

#### Scenario: Service created on PR open

- **WHEN** a pull request is opened
- **THEN** a Cloud Run service named `app-pr-{PR_NUMBER}` is created with the PR's code deployed

#### Scenario: Service updated on PR push

- **WHEN** new commits are pushed to an open pull request
- **THEN** the existing `app-pr-{PR_NUMBER}` service is updated with the new code

### Requirement: Preview URL posted to PR

The system SHALL post the preview environment URL as a comment on the pull request for easy access.

#### Scenario: URL comment added

- **WHEN** a preview environment is successfully deployed
- **THEN** a comment is added to the PR with the Cloud Run service URL

#### Scenario: URL comment updated

- **WHEN** a preview environment is redeployed after updates
- **THEN** the existing comment is updated rather than creating duplicate comments

### Requirement: Preview environments scale to zero

Preview Cloud Run services SHALL be configured to scale to zero instances when not in use to minimize costs.

#### Scenario: Idle preview scales down

- **WHEN** a preview environment receives no traffic for the configured idle period
- **THEN** it scales to zero instances and incurs no compute costs

#### Scenario: Preview wakes on request

- **WHEN** a request is made to a scaled-to-zero preview environment
- **THEN** Cloud Run starts an instance and serves the request (cold start acceptable)

### Requirement: Preview environment cleanup on PR close

The system SHALL automatically delete preview Cloud Run services when their associated pull request is closed or merged.

#### Scenario: Service deleted on merge

- **WHEN** a pull request is merged
- **THEN** the `app-pr-{PR_NUMBER}` Cloud Run service is deleted

#### Scenario: Service deleted on close without merge

- **WHEN** a pull request is closed without merging
- **THEN** the `app-pr-{PR_NUMBER}` Cloud Run service is deleted

### Requirement: Preview environments use shared database

Preview environments SHALL connect to a shared Supabase preview database, separate from production.

#### Scenario: Preview uses preview database

- **WHEN** a preview environment starts
- **THEN** it connects to the Supabase preview project, not the production database

#### Scenario: Multiple previews share database

- **WHEN** multiple pull requests have active preview environments
- **THEN** they all connect to the same shared preview database

### Requirement: Preview database migrations run automatically

The system SHALL run database migrations when deploying preview environments to ensure schema is up to date.

#### Scenario: Migrations run on preview deploy

- **WHEN** a preview environment is deployed
- **THEN** pending database migrations are applied to the preview database

#### Scenario: Migration conflicts are acceptable

- **WHEN** two PRs with conflicting migrations are both open
- **THEN** the later deployment may fail, which is acceptable for a single-user project

### Requirement: Preview environment secrets configured

Preview Cloud Run services SHALL have access to necessary secrets (Google OAuth credentials, encryption key) via Secret Manager.

#### Scenario: Secrets available to preview

- **WHEN** a preview environment starts
- **THEN** it can access `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `ENCRYPTION_KEY` from Secret Manager

#### Scenario: Preview uses same OAuth credentials

- **WHEN** a user authenticates in a preview environment
- **THEN** they use the same Google OAuth application as production (redirect URIs permitting)

### Requirement: Preview environment labeled for identification

Preview Cloud Run services SHALL be labeled with metadata identifying their associated pull request for management purposes.

#### Scenario: PR number label

- **WHEN** a preview environment is created
- **THEN** the Cloud Run service has a label `pr-number={PR_NUMBER}`

#### Scenario: Git SHA label

- **WHEN** a preview environment is deployed
- **THEN** the Cloud Run revision has a label with the deployed git commit SHA
