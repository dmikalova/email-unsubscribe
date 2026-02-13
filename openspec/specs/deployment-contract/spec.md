## ADDED Requirements

### Requirement: Deployment contract file exists

The application SHALL provide a deployment contract file at `deploy.config.ts` that exports a typed configuration object defining all runtime requirements.

#### Scenario: Contract file is present

- **WHEN** a developer clones the repository
- **THEN** a file exists at `deploy.config.ts` exporting a typed configuration object

### Requirement: Contract uses TypeScript type from infra repo

The deployment contract SHALL import and satisfy a TypeScript type defined in the infra repo, providing compile-time validation.

#### Scenario: Type import from infra

- **WHEN** a developer edits `deploy.config.ts`
- **THEN** it imports `AppContract` type from the infra repo package

#### Scenario: Type errors caught at authorship

- **WHEN** a developer adds an unknown field or omits a required field
- **THEN** TypeScript reports the error immediately in the IDE

#### Scenario: Compilation validates contract

- **WHEN** the Dagger pipeline runs
- **THEN** TypeScript compilation fails if the contract doesn't satisfy the type

### Requirement: Contract specifies runtime environment

The deployment contract SHALL specify the runtime environment including language runtime, version constraints, and entry point.

#### Scenario: Deno runtime specified

- **WHEN** an infrastructure tool reads the deployment contract
- **THEN** it finds the runtime is Deno 2.0+ with the entry point `src/main.ts`

### Requirement: Contract specifies port configuration

The deployment contract SHALL specify the port the application listens on via the `PORT` environment variable.

#### Scenario: Port configuration defined

- **WHEN** an infrastructure tool reads the deployment contract
- **THEN** it finds the application expects a `PORT` environment variable and defaults to 8000

### Requirement: Contract specifies required environment variables

The deployment contract SHALL list all required environment variables with descriptions, indicating which are secrets versus configuration.

#### Scenario: Required variables documented

- **WHEN** a developer reads the deployment contract
- **THEN** they see a list of required environment variables including `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `ENCRYPTION_KEY` marked as secrets

#### Scenario: Optional variables documented

- **WHEN** a developer reads the deployment contract
- **THEN** they see optional configuration variables like `LOG_LEVEL` with their default values

### Requirement: Contract specifies health check endpoint

The deployment contract SHALL specify the health check endpoint path and expected response for liveness probes.

#### Scenario: Health check path defined

- **WHEN** an infrastructure tool reads the deployment contract
- **THEN** it finds the health check endpoint is `/health` returning HTTP 200 when healthy

### Requirement: Contract specifies resource requirements

The deployment contract SHALL specify minimum and recommended resource allocations for CPU and memory.

#### Scenario: Resource limits documented

- **WHEN** an infrastructure tool reads the deployment contract
- **THEN** it finds memory requirements (minimum 256MB, recommended 512MB) and CPU requirements (minimum 0.5 vCPU)

### Requirement: Contract specifies startup timing

The deployment contract SHALL specify expected startup time to help configure startup probes and timeouts.

#### Scenario: Startup timing defined

- **WHEN** an infrastructure tool reads the deployment contract
- **THEN** it finds the expected cold start time (under 2 seconds) and readiness probe configuration

### Requirement: Contract is self-documenting

The deployment contract SHALL include inline comments explaining each section for developers unfamiliar with the project.

#### Scenario: New developer understands contract

- **WHEN** a developer who has never seen the project reads `deploy.config.ts`
- **THEN** they understand what the application needs to run without reading other documentation
- **THEN** it can infer the contract type with `z.infer<typeof appContractSchema>`
