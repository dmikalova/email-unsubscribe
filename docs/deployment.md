# Northflank Deployment Guide

This guide covers deploying the Email Unsubscribe application to Northflank.

## Prerequisites

- [Northflank account](https://northflank.com)
- GitHub repository with the application code
- PostgreSQL addon (shared or dedicated)

## Project Setup

### 1. Create a New Project

1. Log in to Northflank
2. Click "Create Project"
3. Name it "email-unsubscribe"

### 2. Connect GitHub Repository

1. Go to "Git" in your project
2. Click "Connect Git"
3. Authorize Northflank for your GitHub account
4. Select the `email-unsubscribe` repository

## Database Setup

### Option A: Shared PostgreSQL (Recommended for Personal Use)

If you have an existing PostgreSQL addon:

1. Create a new database `email_unsubscribe` in your shared instance
2. The application uses the `email_unsubscribe` schema (separate from other apps)

### Option B: Dedicated PostgreSQL Addon

1. Go to "Addons" → "Create Addon"
2. Select "PostgreSQL"
3. Choose your plan (the smallest is fine for personal use)
4. Name it "email-unsubscribe-db"
5. Click "Create"

## Service Configuration

### 1. Create the Service

1. Go to "Services" → "Create Service"
2. Select "Combined" (build and run)
3. Configure:
   - **Name**: email-unsubscribe
   - **Type**: Deployment
   - **Git branch**: main
   - **Dockerfile path**: `/Dockerfile`

### 2. Configure Resources

Recommended resources for personal use:

- **CPU**: 0.2 vCPU
- **Memory**: 512 MB (1 GB recommended for Chromium)
- **Instances**: 1

### 3. Configure Environment Variables

Add the following environment variables:

| Variable               | Value                                                  | Notes                 |
| ---------------------- | ------------------------------------------------------ | --------------------- |
| `PORT`                 | `8000`                                                 | Required              |
| `DATABASE_URL`         | `postgresql://...`                                     | From PostgreSQL addon |
| `DATABASE_SCHEMA`      | `email_unsubscribe`                                    | Schema name           |
| `GOOGLE_CLIENT_ID`     | Your OAuth client ID                                   | See setup-google.md   |
| `GOOGLE_CLIENT_SECRET` | Your OAuth client secret                               | Mark as secret        |
| `GOOGLE_REDIRECT_URI`  | `https://email-unsubscribe.cddc39.tech/oauth/callback` | Production URL        |
| `ENCRYPTION_KEY`       | Your encryption key                                    | Mark as secret        |
| `SESSION_DOMAIN`       | `cddc39.tech`                                          | For cookie sharing    |
| `SCREENSHOTS_PATH`     | `/app/data/screenshots`                                | Default               |
| `TRACES_PATH`          | `/app/data/traces`                                     | Default               |

### 4. Configure Health Checks

1. Go to service settings → "Health Checks"
2. Add HTTP health check:
   - **Path**: `/api/health`
   - **Port**: `8000`
   - **Interval**: `30s`
   - **Timeout**: `10s`

### 5. Configure Networking

1. Go to "Networking" → "Ports"
2. Add port `8000` (HTTP)
3. Enable public networking

## Custom Domain Setup

### 1. Add Domain

1. Go to "Networking" → "Domains"
2. Click "Add Domain"
3. Enter: `email-unsubscribe.cddc39.tech`

### 2. Configure DNS

Add a CNAME record in your DNS provider:

```
email-unsubscribe.cddc39.tech CNAME your-service.northflank.app
```

### 3. Enable TLS

Northflank automatically provisions TLS certificates via Let's Encrypt.

## Persistent Storage (Optional)

For persistent screenshots and traces:

1. Go to "Volumes" → "Create Volume"
2. Create volume:
   - **Name**: data
   - **Size**: 1 GB
3. Mount to service at `/app/data`

## Deployment

### Automatic Deployment

Northflank automatically deploys on push to main branch.

### Manual Deployment

1. Go to "Deployments"
2. Click "Create Deployment"
3. Select the latest build
4. Click "Deploy"

## Monitoring

### Logs

View application logs in "Logs" tab. Logs are in JSON format for easy parsing.

### Metrics

Monitor CPU, memory, and network in the "Metrics" tab.

### Alerts (Optional)

Set up alerts for:

- High CPU/memory usage
- Service health check failures
- Error rate thresholds

## CI/CD Integration

The repository includes GitHub Actions workflows:

- **CI** (`ci.yml`): Runs on all PRs and pushes
- **Deploy** (`deploy.yml`): Deploys to Northflank on main branch

### Configure GitHub Secrets

Add these secrets to your GitHub repository:

| Secret               | Value                   |
| -------------------- | ----------------------- |
| `REGISTRY_URL`       | Northflank registry URL |
| `REGISTRY_USERNAME`  | Registry username       |
| `REGISTRY_PASSWORD`  | Registry password       |
| `NORTHFLANK_API_KEY` | API key for deployments |

### Configure GitHub Variables

Add these variables:

| Variable             | Value                           |
| -------------------- | ------------------------------- |
| `IMAGE_NAME`         | `email-unsubscribe`             |
| `NORTHFLANK_PROJECT` | Project ID                      |
| `NORTHFLANK_SERVICE` | Service ID                      |
| `APP_DOMAIN`         | `email-unsubscribe.cddc39.tech` |

## Troubleshooting

### Container Won't Start

1. Check logs for error messages
2. Verify environment variables are set
3. Ensure database is accessible

### Database Connection Failed

1. Verify DATABASE_URL is correct
2. Check if the database schema exists
3. Run migrations manually if needed

### Out of Memory

Chromium requires significant memory. Increase to 1 GB if you see OOM errors.

### Slow Unsubscribe Processing

Browser automation is CPU-intensive. Consider:

- Increasing CPU allocation
- Adding rate limiting between unsubscribes
