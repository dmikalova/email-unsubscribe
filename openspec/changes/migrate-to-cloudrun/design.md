## Context

The application is a Deno-based email unsubscribe automation tool that needs deployment infrastructure. The original specs assumed Northflank PaaS, but we're pivoting to Google Cloud Run + Supabase before any production deployment. This is a single-user personal app with sporadic usage patterns, making scale-to-zero critical for cost efficiency.

Current state:

- Application code exists with Hono web framework, Playwright for browser automation
- Database migrations defined for PostgreSQL
- Google OAuth already configured for Gmail API access
- No production deployment yet (Northflank config was planned but not implemented)

Constraints:

- Must remain portable for others to fork and deploy
- Infrastructure should be in a separate repo (Terramate)
- CI/CD defined as code (Dagger in TypeScript)
- Minimize ongoing costs (scale-to-zero everywhere)

## Goals / Non-Goals

**Goals:**

- Deploy to Cloud Run with scale-to-zero for near-zero idle costs
- Use Supabase for managed PostgreSQL with connection pooling
- Separate app repo (this) from infra repo for portability
- Define CI pipelines in TypeScript via Dagger for reusability
- Support ephemeral PR preview environments
- Maintain traceability between deployments and git commits

**Non-Goals:**

- Multi-region deployment (single region is sufficient for personal use)
- Custom domain setup (will use Cloud Run default URLs initially)
- Supabase real-time features (not needed for this app)
- Database branching per PR (will use shared preview DB until Supabase branching is stable)
- Kubernetes (Cloud Run provides sufficient container orchestration)

## Decisions

### Decision 1: Cloud Run with Source Deploys

**Choice**: Use Cloud Run source deploys (via `gcloud run deploy --source .`) wrapped by Dagger, instead of building/pushing images manually.

**Alternatives considered**:

- Dagger builds image → push to Artifact Registry → deploy: More control but adds registry management complexity
- Dockerfile with manual builds: More portable but more maintenance

**Rationale**: Source deploys let Google handle the build via Buildpacks, automatically managing Artifact Registry. Dagger wraps the gcloud CLI call, providing a consistent TypeScript interface, local testability, and the ability to add git SHA labels for traceability. Simpler setup, and we can migrate to explicit image builds later if needed.

### Decision 2: Dagger for CI Pipelines

**Choice**: Define CI pipelines in TypeScript using Dagger, triggered by GitHub Actions.

**Alternatives considered**:

- Pure GitHub Actions: Less portable, YAML-based, harder to test locally
- Earthly: Better than Dockerfile but still a DSL, not a real language
- Makefile + scripts: Not type-safe, harder to maintain

**Rationale**: Dagger lets us write pipelines in TypeScript (matching our stack), test them locally, and reuse modules across repos. GHA becomes a thin wrapper that just calls Dagger.

### Decision 3: Supabase for Database

**Choice**: Use Supabase managed PostgreSQL with Supavisor connection pooler.

**Alternatives considered**:

- Neon: Better database branching, but we'd lose Supabase's potential for real-time features later
- Cloud SQL: No scale-to-zero, minimum ~$10/month even when idle
- PlanetScale: MySQL only, not PostgreSQL

**Rationale**: Supabase offers managed PostgreSQL with a generous free tier, connection pooling via Supavisor, and potential for real-time features if needed later. We'll use a shared preview database for now, migrating to database branching when Supabase releases it as stable.

### Decision 4: Separate Infra Repository

**Choice**: Infrastructure (Terramate/Terraform) lives in a separate repository; app repo only contains a deployment contract (`deploy/app.yaml`).

**Alternatives considered**:

- Infra in app repo: Convenient but pollutes the repo for forks
- No deployment contract: Infra repo would need to know app internals

**Rationale**: The deployment contract pattern keeps the app repo portable. Anyone can fork it, read `deploy/app.yaml` to understand requirements, and deploy however they want. The infra repo consumes this contract to provision Cloud Run.

### Decision 5: Ephemeral Preview Environments

**Choice**: PR previews create temporary Cloud Run services (`app-pr-{N}`), cleaned up when PR closes.

**Alternatives considered**:

- No preview environments: Slower feedback loop
- Persistent staging environment: Less isolation between PRs
- Full database per preview (Neon branching): Would require switching from Supabase

**Rationale**: Cloud Run services scale to zero, so preview environments cost nothing when idle. Using a shared Supabase preview database is a pragmatic starting point; we'll migrate to database branching when available.

### Decision 6: Workload Identity Federation for GCP Auth

**Choice**: Use Workload Identity Federation (WIF) for keyless authentication from GitHub Actions to GCP.

**Alternatives considered**:

- Service account key JSON: Security risk, key rotation burden
- Manual deployments: Not automated

**Rationale**: WIF is the recommended approach—no long-lived credentials, automatic token exchange, better security posture.

## Risks / Trade-offs

**[Source deploys are less reproducible]** → Accept for simplicity. Buildpacks are deterministic enough for personal use. Can migrate to explicit image builds if reproducibility becomes critical.

**[Shared preview database can have conflicts]** → Acceptable for single-user project. Each PR uses the same preview DB, so concurrent PRs could interfere. Mitigate by using unique table prefixes per PR if needed, or migrate to Supabase branching when stable.

**[Cold starts on Cloud Run]** → Deno has fast startup (~300-800ms). For a personal dashboard accessed occasionally, this is acceptable. Can set `min_instances=1` later if needed (~$5/month).

**[Supabase free tier pauses after 7 days]** → For an actively used personal app, unlikely to hit this. If it becomes an issue, upgrade to Pro ($25/month) or switch to Neon (no pause on free tier).

**[Two-repo complexity]** → Managing infra separately adds coordination overhead. Mitigate with clear deployment contract and CI automation. The portability benefit outweighs the complexity for a project intended to be forkable.

**[Dagger learning curve]** → Team needs to learn Dagger's TypeScript SDK. Mitigate with good documentation and examples in the `ci/` directory.

## Migration Plan

Since nothing is deployed yet, this is initial setup rather than migration:

1. **Infra repo setup** (separate repo):
   - Initialize Terramate structure
   - Configure GCP project with Terraform
   - Set up Supabase projects (prod + preview)
   - Configure Workload Identity Federation

2. **App repo changes** (this repo):
   - Create `deploy/app.yaml` deployment contract
   - Add Dagger module in `ci/`
   - Update GitHub Actions to call Dagger
   - Remove Northflank references from specs
   - Update documentation

3. **Verification**:
   - Test Dagger pipeline locally
   - Open test PR to verify preview environment
   - Merge to main to verify production deploy

**Rollback strategy**: Since nothing is deployed, rollback is simply "don't use the new infra." Once deployed, Cloud Run revisions provide instant rollback to previous versions.

## Open Questions

- **Deployment contract format**: Use custom YAML or adopt a standard like Score? Starting with custom YAML for simplicity; can adopt Score later if multi-platform becomes needed.

- **Preview environment database isolation**: Accept shared DB for now, or implement table prefixes per PR? Starting with shared DB; will reassess if conflicts occur.

- **Custom domain timing**: When to set up custom domain mapping? Deferring until after initial deployment is stable.
