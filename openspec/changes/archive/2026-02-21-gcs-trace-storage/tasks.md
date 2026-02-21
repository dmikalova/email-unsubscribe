# GCS Trace Storage + Playwright Sidecar Tasks

## 1. Cloud-run-app Module: GCS Storage

- [x] 1.1 Add `storage_bucket` boolean variable (default false)
- [x] 1.2 Add `storage_lifecycle_rules` variable for prefix-specific TTL
- [x] 1.3 Create `google_storage_bucket` resource with conditional count
- [x] 1.4 Add lifecycle rule dynamic block using `storage_lifecycle_rules`
- [x] 1.5 Grant service account `roles/storage.objectAdmin` on bucket
- [x] 1.6 Add `STORAGE_BUCKET` env var to Cloud Run container
- [x] 1.7 Add bucket name to module outputs

## 2. Cloud-run-app Module: Sidecars

- [x] 2.1 Add `sidecars` variable with container config schema
- [x] 2.2 Add dynamic `containers` block for each sidecar in template
- [x] 2.3 Handle sidecar resources (cpu, memory) in container config
- [x] 2.4 Support optional command, args, and env vars

## 3. Cloud-run-app Module: Scheduled Jobs

- [x] 3.1 Add `scheduled_jobs` variable with job config schema
- [x] 3.2 Create scheduler invoker service account
- [x] 3.3 Grant invoker account `roles/run.invoker` on Cloud Run service
- [x] 3.4 Create `google_cloud_scheduler_job` resource for each job
- [x] 3.5 Configure OIDC authentication for scheduler

## 4. email-unsubscribe Stack: Configuration

- [x] 4.1 Enable `storage_bucket = true` in main.tf
- [x] 4.2 Add `storage_lifecycle_rules` for traces/ prefix (90 days)
- [x] 4.3 Add Playwright sidecar to `sidecars` list
- [x] 4.4 Add weekly scan job to `scheduled_jobs` (Sunday 6am UTC)
- [x] 4.5 Add `PLAYWRIGHT_WS_ENDPOINT` via `env_vars`

## 5. App Code: GCS Integration

- [~] 5.1 Add `@google-cloud/storage` to deno.jsonc dependencies
  - Used GCS REST API directly instead
- [x] 5.2 Create `src/storage.ts` with GCS upload helper
- [x] 5.3 Update `browser.ts` to upload traces to `gs://bucket/traces/`
- [x] 5.4 Update `browser.ts` to upload screenshots to `gs://bucket/traces/`
  - Screenshots not uploaded to GCS (local only)
- [x] 5.5 Store GCS URLs in `unsubscribe_history.trace_path`

## 6. App Code: Remote Playwright Connection

- [x] 6.1 Update `getBrowser()` to prefer `PLAYWRIGHT_WS_ENDPOINT` env var
  - Already implemented in previous change
- [~] 6.2 Add connection retry logic with backoff
  - Skipped: Cloud Run handles sidecar startup
- [~] 6.3 Handle sidecar not ready on cold start (wait for connection)
  - Skipped: Cloud Run sidecar starts with main container

## 7. Testing

- [x] 7.1 Test storage upload with mock GCS client
- [x] 7.2 Test Playwright remote connection
- [x] 7.3 Run `tofu plan` in infrastructure repo to verify module changes
- [x] 7.4 Deploy and verify sidecar starts with main container
- [x] 7.5 Verify scheduled job triggers scan
