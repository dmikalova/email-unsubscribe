# GCS Trace Storage + Playwright Sidecar Design

## Decisions

### 1. GCS Bucket in cloud-run-app Module

**Decision**: Create bucket within cloud-run-app module when
`storage_bucket =
true`. Accept `storage_lifecycle_rules` for prefix-specific
retention:

```hcl
variable "storage_lifecycle_rules" {
  type = list(object({
    prefix     = string
    age_days   = number
  }))
  default = []
}
```

**Rationale**: Simplifies IAM grants - service account is created in same
module, can grant `roles/storage.objectAdmin` directly. Prefix-based lifecycle
rules allow different retention for different data types (traces vs other app
data).

**Alternative considered**: Hardcoded 90-day bucket-wide TTL - rejected because
bucket may store other data with different retention needs.

### 2. Generic Sidecars Variable Structure

**Decision**: Accept `sidecars` as list of container config objects:

```hcl
variable "sidecars" {
  type = list(object({
    name    = string
    image   = string
    port    = optional(number)
    cpu     = optional(string, "0.5")
    memory  = optional(string, "256Mi")
    command = optional(list(string))
    args    = optional(list(string))
    env     = optional(map(string), {})
  }))
  default = []
}
```

**Rationale**: Generic structure supports any sidecar (Playwright, logging
agents, proxies). Caller defines container specifics, module handles Cloud Run
plumbing.

### 3. Cloud Scheduler Authentication

**Decision**: Create dedicated invoker service account for Cloud Scheduler with
`roles/run.invoker` on the specific Cloud Run service.

**Rationale**: Principle of least privilege - scheduler only needs invoke
permission, not the broader permissions of the app's runtime service account.

**Alternative considered**: Use app's service account - rejected because it has
broader permissions than needed for HTTP invocation.

### 4. GCS Upload via Signed URLs vs SDK

**Decision**: Use `@google-cloud/storage` SDK with Application Default
Credentials (ADC).

**Rationale**: Cloud Run service account is automatically available via ADC. SDK
handles retries, streaming uploads. No need to manage signed URLs.

### 5. Bucket Naming and Location

**Decision**: Bucket name `{project_id}-{app_name}-storage`, same region as
Cloud Run service.

**Rationale**: Region co-location minimizes latency and egress costs. Project ID
prefix ensures global uniqueness.

### 6. Scheduled Scan Variable Structure

**Decision**: Accept `scheduled_jobs` as list of job configs:

```hcl
variable "scheduled_jobs" {
  type = list(object({
    name     = string
    schedule = string           # Cron expression
    path     = string           # HTTP path to invoke
    method   = optional(string, "POST")
    body     = optional(string, "")
    timezone = optional(string, "UTC")
  }))
  default = []
}
```

**Rationale**: Generic structure supports multiple scheduled endpoints. More
flexible than single `scheduled_scan` variable.

## Resolved Questions

**Q: Should sidecar containers share the main container's port?** A: No. Cloud
Run routes external traffic to the container with the `ports` block. Sidecars
communicate via localhost on their own ports.

**Q: How does Cloud Scheduler authenticate to Cloud Run?** A: OIDC token with
dedicated service account. Cloud Scheduler generates token, Cloud Run validates
it.

**Q: What happens if GCS upload fails?** A: Log error, continue processing.
Trace storage is best-effort - don't fail the unsubscribe operation for storage
issues.

## Future Considerations

- **Separate Playwright service**: If cold start latency becomes a problem, move
  Playwright to its own Cloud Run service instead of sidecar
- **Trace viewer**: Build UI to browse GCS traces with Playwright Trace Viewer
- **Retention policies**: May add more lifecycle rules for other prefixes as
  storage needs evolve
