## Why

The app needs automated build, versioning, and deployment to GCP Cloud Run. Currently there are placeholder workflows - one calling a non-existent Dagger workflow, another deploying to Northflank. Need a simple, working pipeline that:

- Builds and publishes containers automatically
- Versions releases using conventional commits (already in use)
- Deploys to Cloud Run without manual steps
- Uses keyless authentication (no stored GCP credentials)
- Is reusable across multiple app repos

## What Changes

- Create new `dmikalova/github-meta` repo with reusable Dagger workflows
- Build entire CI/CD pipeline in Dagger (TypeScript SDK)
- Dagger builds containers programmatically (no Dockerfile)
- Configure semantic-release for automated versioning from commits
- Add commitlint to enforce conventional commit format
- App repo calls reusable workflow with minimal config
- Use GHCR for container registry (free for public repos)
- Use WIF (Workload Identity Federation) for keyless GCP authentication

## Capabilities

### New Capabilities

- `dagger-pipeline`: Reusable Dagger pipeline in github-meta repo for Deno apps
- `reusable-workflow`: GitHub Actions workflow that runs the Dagger pipeline
- `semantic-versioning`: semantic-release config with conventional-changelog
- `commit-enforcement`: commitlint config and pre-commit hook

### Modified Capabilities

- `deployment-contract`: Update deploy.config.ts to reflect Cloud Run target

## Impact

- **New Repo**: `dmikalova/github-meta` with reusable workflows
- **GitHub Actions**: App repo calls reusable workflow (minimal config)
- **Container Registry**: Public images on ghcr.io/dmikalova/email-unsubscribe
- **GCP Cloud Run**: Receives deployments via Dagger + gcloud
- **Development**: Commits must follow conventional format
- **Releases**: Automated versioning - no manual tags or changelogs
