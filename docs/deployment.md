# Deployment Guide

This guide covers deploying the Email Unsubscribe application to Google Cloud Run with Supabase for PostgreSQL.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions                            │
│  (calls reusable Dagger workflow from infra repo)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Google Cloud Run                            │
│  - Scale to zero when idle                                  │
│  - Source deploys via Buildpacks                            │
│  - Secrets from Secret Manager                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase                                  │
│  - Managed PostgreSQL                                       │
│  - Supavisor connection pooler                              │
│  - Separate prod/preview projects                           │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Google Cloud project with Cloud Run enabled
- Supabase project (production + preview)
- GitHub repository with Workload Identity Federation configured

## Environment Variables

### Required Secrets (via Secret Manager)

| Secret                 | Description                                   |
| ---------------------- | --------------------------------------------- |
| `DATABASE_URL`         | Supabase pooler connection string (port 6543) |
| `GOOGLE_CLIENT_ID`     | OAuth 2.0 client ID for Gmail API             |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret                       |
| `ENCRYPTION_KEY`       | 32-byte hex key for encrypting OAuth tokens   |

### Optional Configuration

| Variable            | Default             | Description                                  |
| ------------------- | ------------------- | -------------------------------------------- |
| `PORT`              | `8000`              | HTTP server port                             |
| `LOG_LEVEL`         | `info`              | Logging verbosity (debug, info, warn, error) |
| `DATABASE_SCHEMA`   | `email_unsubscribe` | PostgreSQL schema name                       |
| `DATABASE_POOL_MAX` | `10`                | Maximum database connections                 |

## Deployment Contract

The [`deploy.config.ts`](../mklv.config.mts) file defines this application's runtime requirements:

- Runtime: Deno 2.0+
- Entry point: `src/main.ts`
- Health check: `/health` returning HTTP 200
- Resources: 256MB min, 512MB recommended

Infrastructure tooling in the separate infra repo consumes this contract.

## CI/CD Pipeline

### Automatic Deployment

The application is automatically deployed via GitHub Actions:

1. **Pull Request** → Deploys to preview environment (`app-pr-{N}`)
2. **Merge to main** → Deploys to production
3. **PR Close** → Cleans up preview environment

### Workflow File

See [`.github/workflows/ci.yaml`](../.github/workflows/cicd.yaml) which calls a reusable Dagger workflow from the infra repo.

## Environments

### Production

- **URL**: Cloud Run service URL (or custom domain when configured)
- **Database**: Supabase production project
- **Scaling**: 0-1 instances (scale to zero when idle)

### Preview (PR environments)

- **URL**: `https://app-pr-{N}-{hash}.run.app`
- **Database**: Shared Supabase preview project
- **Lifecycle**: Created on PR open, deleted on PR close
- **Scaling**: Scale to zero when idle (no cost)

## Database Connection

The application connects to Supabase via the Supavisor connection pooler:

```
postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require
```

Key configuration:

- Port `6543` for pooler (not `5432` for direct connection)
- SSL mode `require` for encrypted connections
- Transaction mode pooling for serverless compatibility

## Health Checks

Cloud Run uses the `/health` endpoint for liveness probes:

```bash
curl https://your-service.run.app/health
# {"status":"ok","timestamp":"2025-01-01T00:00:00.000Z"}
```

## Monitoring

### Logs

Application logs are automatically captured by Cloud Logging. View in Google Cloud Console:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=email-unsubscribe"
```

### Metrics

Monitor via Cloud Run metrics in Google Cloud Console:

- Request latency
- Instance count
- Memory/CPU utilization

## Rollback

Cloud Run maintains revision history. To rollback:

```bash
# List revisions
gcloud run revisions list --service email-unsubscribe

# Route traffic to previous revision
gcloud run services update-traffic email-unsubscribe --to-revisions=email-unsubscribe-00005-abc=100
```

Each revision is labeled with its git SHA for traceability.

## Cost Optimization

Cloud Run scales to zero when idle, meaning you only pay for actual usage:

- **Idle**: $0 (no instances running)
- **Active**: ~$0.00002400 per vCPU-second

For a personal app with sporadic usage, monthly costs are typically under $1.

## Troubleshooting

### Cold Start Issues

Deno has fast cold starts (~300-800ms). If cold starts are problematic:

1. Set `min_instances=1` in Cloud Run (adds ~$5/month)
2. Or accept occasional cold starts for personal use

### Database Connection Errors

If you see "too many connections" errors:

1. Ensure you're using the pooler endpoint (port 6543)
2. Reduce `DATABASE_POOL_MAX` if needed
3. Check Supabase dashboard for connection limits

### Preview Environment Not Created

1. Check GitHub Actions logs for the PR
2. Verify Workload Identity Federation is configured
3. Ensure the infra repo's reusable workflow is accessible
