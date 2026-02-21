# GCS Trace Storage + Playwright Sidecar

## Why

Playwright traces and screenshots are currently stored on local filesystem
(`./data/traces/`, `./data/screenshots/`), which is ephemeral on Cloud Run -
data is lost on container restart. Traces are 2-15MB each and grow unbounded.
Need persistent storage with automatic cleanup.

Additionally, browser-based unsubscribe automation fails in production because
Playwright browsers aren't installed in the distroless container. Need a sidecar
container running Playwright server that the app connects to via WebSocket.

Currently, scans are triggered manually. Need weekly scheduled scans with Cloud
Scheduler.

## What Changes

### GCS Storage

- Add `storage_bucket` flag to `cloud-run-app` Terraform module
- When enabled, module creates app-specific GCS bucket
- Add `storage_lifecycle_rules` variable for prefix-specific TTL policies
- email-unsubscribe stack configures 90-day TTL for `traces/` prefix only
- Grants app's service account read/write access to the bucket
- Passes bucket name as `STORAGE_BUCKET` env var to Cloud Run
- App's browser automation uploads traces/screenshots to `gs://bucket/traces/`

### Playwright Sidecar

- Add optional `sidecars` variable to `cloud-run-app` module accepting list of
  container configs (image, port, cpu, memory, env vars)
- email-unsubscribe stack passes Playwright sidecar config
- Playwright container runs `npx playwright run-server` on port 3000
- Main app connects via `PLAYWRIGHT_WS_ENDPOINT=ws://localhost:3000`
- Sidecar config: 1 vCPU, 1GB memory (added to main container's allocation)

### Weekly Scheduled Scan

- Add optional `scheduled_scan` variable to `cloud-run-app` module
- When set, creates Cloud Scheduler job with specified cron expression
- Default: `0 6 * * 0` (Sunday 6am UTC / Saturday 10pm PST)
- Job POSTs to `/api/scan` endpoint to trigger weekly scan

## Capabilities

### New Capabilities

- `gcs-storage`: Cloud-run-app module creates app-specific GCS bucket when
  `storage_bucket=true`. Accepts `storage_lifecycle_rules` for prefix-specific
  retention policies (e.g., 90-day TTL for `traces/` prefix).

- `sidecar-containers`: Cloud-run-app module accepts generic `sidecars` list
  when provided. Each entry specifies image, port, resources, and env vars.
  Enables any sidecar use case (Playwright, logging, proxies, etc.).

- `scheduled-scan`: Cloud-run-app module creates Cloud Scheduler job when
  `scheduled_scan` cron expression is provided. Triggers automated scans.

### Modified Capabilities

None - these are new infrastructure capabilities.

## Impact

- **Infrastructure**: New GCS bucket, IAM bindings, optional sidecar container,
  optional Cloud Scheduler job in cloud-run-app module
- **App code**: `browser.ts` writes to GCS URLs instead of local paths;
  `unsubscribe_history` stores `gs://` URLs
- **Cold starts**: Sidecar adds to cold start time (~3-5 seconds for Playwright
  image). Only impacts first request after scale-to-zero.
- **Cost estimates**:
  - GCS storage: ~$0.02/GB/month, auto-deleted after 90 days
  - Sidecar compute: ~$0.05-0.10/month for weekly 5-minute scans
  - Cloud Scheduler: Free tier (3 jobs/month)
- **Cross-repo**: Module change in `infrastructure` repo, app code change in
  `email-unsubscribe` repo
