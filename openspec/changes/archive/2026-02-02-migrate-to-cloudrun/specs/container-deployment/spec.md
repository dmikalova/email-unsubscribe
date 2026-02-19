# Container Deployment

## ADDED Requirements

### Requirement: Cloud Run as deployment target

The application SHALL be deployed to Google Cloud Run as a serverless container
service.

#### Scenario: Application runs on Cloud Run

- **WHEN** the application is deployed
- **THEN** it runs as a Cloud Run service in the us-west1 region

### Requirement: Scale to zero configuration

The Cloud Run service SHALL be configured to scale to zero instances when idle
to minimize costs.

#### Scenario: No traffic scaling

- **WHEN** the application receives no traffic for the configured idle timeout
- **THEN** Cloud Run scales to zero instances and no compute charges accrue

#### Scenario: Traffic triggers scaling

- **WHEN** a request arrives at a scaled-to-zero service
- **THEN** Cloud Run starts an instance to handle the request

### Requirement: Source-based deployments

The application SHALL be deployed using Cloud Run source deploys
(`gcloud run deploy --source .`) with Google Cloud Buildpacks.

#### Scenario: No Dockerfile required

- **WHEN** deploying the application
- **THEN** Cloud Run uses Buildpacks to detect Deno and build the container
  image automatically

#### Scenario: Artifact Registry managed automatically

- **WHEN** a source deploy completes
- **THEN** the container image is stored in Artifact Registry without manual
  registry configuration

### Requirement: Health check endpoint

The application SHALL expose a health check endpoint that Cloud Run uses for
liveness probes.

#### Scenario: Health endpoint returns OK

- **WHEN** Cloud Run sends a request to `/health`
- **THEN** the application returns HTTP 200 when healthy

#### Scenario: Unhealthy instance replaced

- **WHEN** the health check fails repeatedly
- **THEN** Cloud Run replaces the unhealthy instance

### Requirement: Startup probe configuration

The Cloud Run service SHALL be configured with appropriate startup probe
settings for Deno's cold start time.

#### Scenario: Startup time allowed

- **WHEN** a new instance starts
- **THEN** Cloud Run allows up to 10 seconds for the application to become ready
  before failing the health check

### Requirement: Cloud Logging integration

The application logs SHALL be automatically captured by Cloud Logging without
additional configuration.

#### Scenario: Stdout captured

- **WHEN** the application writes to stdout
- **THEN** the output appears in Cloud Logging for the Cloud Run service

#### Scenario: Structured logging supported

- **WHEN** the application outputs JSON-formatted log lines
- **THEN** Cloud Logging parses them as structured logs with severity levels

### Requirement: Secret Manager integration

The Cloud Run service SHALL access secrets via Google Secret Manager, not
environment variables with plaintext values.

#### Scenario: Database URL from Secret Manager

- **WHEN** the application needs the database connection string
- **THEN** Cloud Run injects it from Secret Manager at runtime

#### Scenario: OAuth credentials from Secret Manager

- **WHEN** the application needs Google OAuth client credentials
- **THEN** Cloud Run injects them from Secret Manager at runtime

### Requirement: Revision labels for traceability

Each Cloud Run deployment SHALL include labels identifying the git commit SHA
for rollback and debugging purposes.

#### Scenario: Git SHA label present

- **WHEN** a new revision is deployed
- **THEN** it includes a `git-sha` label with the full commit hash

#### Scenario: Rollback identification

- **WHEN** viewing Cloud Run revision history
- **THEN** each revision shows which git commit it corresponds to

### Requirement: Single region deployment

The application SHALL be deployed to a single region (us-west1) without
multi-region redundancy.

#### Scenario: Region selection

- **WHEN** the Cloud Run service is created
- **THEN** it runs in us-west1 for low latency to US West users

### Requirement: CPU allocation on request only

The Cloud Run service SHALL be configured to allocate CPU only during request
processing to minimize costs.

#### Scenario: CPU throttled when idle

- **WHEN** an instance has no active requests
- **THEN** CPU is throttled and not billed
