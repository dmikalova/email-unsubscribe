# CI Workflow

## ADDED Requirements

### Requirement: CI workflow calls reusable workflow

The repository SHALL include a GitHub Actions workflow at
`.github/workflows/cicd.yaml` that calls a reusable workflow from github-meta.

#### Scenario: Workflow file exists

- **WHEN** a developer clones the repository
- **THEN** a workflow file exists at `.github/workflows/ci.yaml`

#### Scenario: Workflow calls github-meta repo

- **WHEN** CI runs
- **THEN** it uses
  `uses: dmikalova/github-meta/.github/workflows/deno-cloudrun.yaml@main` to
  invoke the reusable workflow

### Requirement: Workflow passes required inputs

The CI workflow SHALL pass the necessary inputs to the reusable workflow
including the deployment contract path.

#### Scenario: Contract path provided

- **WHEN** the reusable workflow runs
- **THEN** it receives the path to `deploy.config.ts` as an input

#### Scenario: Environment specified

- **WHEN** the workflow runs on main branch
- **THEN** it passes `environment: production` to the reusable workflow

#### Scenario: PR number for previews

- **WHEN** the workflow runs on a pull request
- **THEN** it passes the PR number to the reusable workflow for preview
  environment naming

### Requirement: Workflow triggers on appropriate events

The CI workflow SHALL trigger on pull requests and pushes to main.

#### Scenario: PR triggers CI

- **WHEN** a pull request is opened or updated
- **THEN** the CI workflow runs lint and test jobs

#### Scenario: Main branch triggers deploy

- **WHEN** code is pushed to main (including merges)
- **THEN** the CI workflow runs lint, test, and deploy jobs

#### Scenario: PR close triggers cleanup

- **WHEN** a pull request is closed
- **THEN** the CI workflow runs preview cleanup

### Requirement: Workflow has minimal configuration

The CI workflow SHALL contain minimal configuration, delegating pipeline logic
to the reusable workflow.

#### Scenario: No pipeline code in app repo

- **WHEN** a developer looks for CI/CD logic in the app repo
- **THEN** they find none - all pipeline logic lives in the github-meta repo

#### Scenario: Workflow is simple

- **WHEN** a developer reads `.github/workflows/ci.yaml`
- **THEN** it contains only workflow triggers, inputs, and the reusable workflow
  call

### Requirement: Workflow inherits secrets

The CI workflow SHALL pass through necessary secrets to the reusable workflow
using `secrets: inherit`.

#### Scenario: GCP credentials available

- **WHEN** the reusable workflow needs to authenticate to GCP
- **THEN** it has access to the Workload Identity Federation configuration via
  inherited secrets

### Requirement: Workload Identity Federation configured

The repository SHALL have GitHub Actions configured with Workload Identity
Federation for keyless GCP authentication.

#### Scenario: No stored credentials

- **WHEN** the CI workflow runs
- **THEN** it uses OIDC token exchange to authenticate to GCP without any stored
  JSON keys

#### Scenario: WIF provider configured

- **WHEN** setting up the repository
- **THEN** GitHub Actions environment is configured with the WIF provider and
  service account from the infra repo
