## 1. Deployment Contract

- [x] 1.1 Create `deploy.config.ts` with typed configuration object
- [x] 1.2 Define runtime environment (Deno 2.0+, entry point `src/main.ts`)
- [x] 1.3 Document port configuration (PORT env var, default 8000)
- [x] 1.4 List required secrets (DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ENCRYPTION_KEY)
- [x] 1.5 List optional configuration (LOG_LEVEL with defaults)
- [x] 1.6 Specify health check endpoint (`/health`, HTTP 200)
- [x] 1.7 Specify resource requirements (256MB min, 512MB recommended, 0.5 vCPU)
- [x] 1.8 Specify startup timing (under 2 seconds cold start)
- [x] 1.9 Add inline comments explaining each section

## 2. Health Check Endpoint

- [x] 2.1 Add `/health` route to Hono app returning HTTP 200
- [x] 2.2 Add basic health check test

## 3. Database Connection Updates

- [x] 3.1 Update connection configuration to use Supabase pooler format (port 6543)
- [x] 3.2 Ensure SSL mode is set to `require` in connection string
- [x] 3.3 Add graceful handling for connection pool exhaustion
- [ ] 3.4 Test database connection with Supabase pooler endpoint

## 4. CI Workflow

- [x] 4.1 Create `.github/workflows/ci.yaml` workflow file
- [x] 4.2 Add workflow triggers (push to main, pull_request, pull_request closed)
- [x] 4.3 Configure reusable workflow call to infra repo
- [x] 4.4 Pass inputs (contract path, environment, PR number)
- [x] 4.5 Configure `secrets: inherit` for WIF credentials

## 5. Cleanup Legacy Config

- [x] 5.1 Remove Dockerfile (Cloud Run uses Buildpacks)
- [x] 5.2 Remove Dockerfile.playwright if no longer needed
- [x] 5.3 Remove docker-compose files if no longer needed
- [x] 5.4 Remove northflank.json
- [x] 5.5 Update README.md with new deployment model

## 6. Documentation

- [x] 6.1 Update docs/deployment.md for Cloud Run + Supabase
- [x] 6.2 Document environment variables and secrets
- [x] 6.3 Document local development workflow
- [x] 6.4 Document PR preview environment usage
- [x] 6.5 Remove Northflank references from existing docs
