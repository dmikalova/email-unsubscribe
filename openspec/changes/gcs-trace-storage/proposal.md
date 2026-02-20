# GCS Trace Storage

## Why

Playwright traces and screenshots are currently stored on local filesystem
(`./data/traces/`, `./data/screenshots/`), which is ephemeral on Cloud Run -
data is lost on container restart. Traces are 2-15MB each and grow unbounded.
Need persistent storage with automatic cleanup.

## What Changes

- Add `storage_bucket` flag to `cloud-run-app` Terraform module
- When enabled, module creates app-specific GCS bucket with 90-day lifecycle TTL
- Grants app's service account read/write access to the bucket
- Passes bucket name as `STORAGE_BUCKET` env var to Cloud Run
- App's browser automation uploads traces/screenshots to GCS instead of local
  filesystem

## Capabilities

### New Capabilities

- `gcs-storage`: Cloud-run-app module creates and configures app-specific GCS
  bucket when `storage_bucket=true`. Includes lifecycle policy for automatic
  deletion after 90 days.

### Modified Capabilities

None - this is new infrastructure capability.

## Impact

- **Infrastructure**: New `google_storage_bucket` and IAM bindings in
  cloud-run-app module
- **App code**: `browser.ts` writes to GCS URLs instead of local paths;
  `unsubscribe_history` stores `gs://` URLs
- **Cost**: GCS Standard storage, minimal cost (~$0.02/GB/month), auto-deleted
  after 90 days
- **Cross-repo**: Module change in `infrastructure` repo, app code change in
  `email-unsubscribe` repo
