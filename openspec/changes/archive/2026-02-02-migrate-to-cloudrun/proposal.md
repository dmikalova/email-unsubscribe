## Why

The original project specs assumed Northflank for deployment, but before deploying we've decided to use Google Cloud Run + Supabase instead. Cloud Run scales to zero, meaning we only pay when the app is running - ideal for a single-user personal app with sporadic usage.

Additionally, separating infrastructure into a dedicated repository with proper tooling (Terramate) enables a cleaner architecture where this repo focuses on the application and remains portable for anyone who wants to fork and deploy it themselves.

## What Changes

- Update specs to use Google Cloud Run instead of Northflank for container hosting
- Update specs to use Supabase instead of Northflank PostgreSQL for database
- Add deployment contract (app manifest) that defines what the app needs without specifying how to deploy
- Add Dagger for CI pipelines (test, lint, deploy) as code in TypeScript
- Use Cloud Run source deploys (no manual registry management, git SHA labels for traceability)
- Add ephemeral PR preview environments (auto-created Cloud Run services, deleted on PR close)
- Update documentation for the new deployment model

## Capabilities

### New Capabilities

- `deployment-contract`: Application manifest defining runtime requirements (port, env vars, resources, health checks) in a platform-agnostic format that the infra repo consumes
- `dagger-ci`: Dagger pipeline defining test, lint, and deploy stages in TypeScript. Tests run in the same Buildpack environment that Cloud Run uses for consistency between CI and production
- `preview-environments`: Ephemeral Cloud Run services created for each PR, using shared Supabase preview database. Auto-cleanup on PR close. Will migrate to Supabase database branching when available in stable

### Modified Capabilities

- `container-deployment`: Update from Northflank-specific requirements to Cloud Run compatibility (health check patterns, logging integration, startup probes, scale-to-zero behavior)
- `data-persistence`: Update from Northflank PostgreSQL schema isolation to Supabase connection model (still PostgreSQL, but different connection handling via Supavisor pooler)

## Impact

### Code Changes

- Database connection configuration (Supabase connection string format, pooler mode)
- Health check endpoint for Cloud Run expectations

### Configuration Changes

- Remove Dockerfile (Cloud Run builds via Buildpacks from source)
- New `app.yaml` or similar deployment contract file
- Add Dagger module (`ci/`) with TypeScript pipeline definition
- Updated environment variable documentation

### Infrastructure (Separate Repo)

- New infra repository with Terramate structure
- GCP project setup (Cloud Run, Secret Manager)
- Supabase project provisioning (production + shared preview database)
- CI/CD integration between repos (Dagger triggers Cloud Run source deploy)
- Workload Identity Federation for keyless GCP auth from GitHub Actions

### Environments

- **Production**: Persistent Cloud Run service + Supabase production database, managed by infra repo
- **Preview**: Ephemeral Cloud Run services (`app-pr-{N}`) created/deleted by app repo CI, shared Supabase preview database
- **Future**: Migrate to Supabase database branching when stable (isolated DB per PR)

### Dependencies

- No runtime dependency changes (still Deno, Hono, PostgreSQL)
- New dev dependency: Dagger CLI
- Build/deploy tooling changes (gcloud CLI, Supabase CLI)
