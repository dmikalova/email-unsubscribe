# Design

## Context

The email-unsubscribe app needs CI/CD to deploy containers to GCP Cloud Run.
Current state:

- `ci.yaml`: Calls non-existent Dagger workflow in infra repo
- `deploy.yml`: Deploys to Northflank (deprecated target)
- `deploy.config.ts`: Deployment contract (keep and update)
- Conventional commits already in use

Target: Reusable Dagger pipeline in a shared repo, app repos just call it.

## Goals / Non-Goals

**Goals:**

- Automated builds on push to main
- Semantic versioning from commit messages
- Container images on GHCR (free for public repos)
- Keyless deployment to Cloud Run via WIF
- Reusable pipeline across multiple app repos
- Entire build defined in Dagger (no Dockerfile)

**Non-Goals:**

- Preview environments (future enhancement)
- App-specific build logic in app repos
- Private container registry

## Decisions

### 1. Repository Structure

**Decision:** New `dmikalova/github-meta` repo hosts reusable workflows and
Dagger pipelines.

```
github-meta/
├── .github/
│   └── workflows/
│       └── deno-cloudrun.yaml    # Reusable workflow
├── dagger/
│   ├── deno/
│   │   ├── src/
│   │   │   └── index.ts          # Dagger pipeline
│   │   └── dagger.json
│   └── README.md
└── README.md
```

**Rationale:** Centralized CI/CD logic. App repos stay clean - just call the
reusable workflow. Changes to build process don't require updating every app
repo.

### 2. Container Registry

**Decision:** Use GitHub Container Registry (ghcr.io).

```
ghcr.io/dmikalova/email-unsubscribe:1.2.3
ghcr.io/dmikalova/email-unsubscribe:latest
```

**Alternatives considered:**

- GCP Artifact Registry: Requires authentication, costs money
- Docker Hub: Rate limits, less integrated with GitHub

**Rationale:** GHCR is free for public repos, integrated with GitHub auth, and
Cloud Run can pull public images directly.

### 3. Versioning Strategy

**Decision:** semantic-release with conventional commits.

```
feat: add new feature    → 1.x.0 (minor)
fix: bug fix             → 1.0.x (patch)
feat!: breaking change   → x.0.0 (major)
chore: maintenance       → no release
```

**Rationale:** Removes manual versioning. Commit messages already follow
conventional format. semantic-release creates GitHub releases with changelogs
automatically.

### 4. Commit Enforcement

**Decision:** commitlint with husky pre-commit hook (in each app repo).

```json
// package.json (for commitlint/husky only)
{
  "devDependencies": {
    "@commitlint/cli": "^19.0.0",
    "@commitlint/config-conventional": "^19.0.0",
    "husky": "^9.0.0"
  }
}
```

**Rationale:** Catches bad commit messages before push. Works with Deno
projects.

### 5. Dagger Pipeline (No Dockerfile)

**Decision:** Build containers entirely in Dagger using TypeScript SDK.

```typescript
// github-meta/dagger/deno/src/index.ts
import { Container, dag, Directory, func, object } from '@dagger.io/dagger';

@object()
class DenoPipeline {
  @func()
  async build(source: Directory, entrypoint: string): Promise<Container> {
    // Build stage: compile Deno app to standalone binary
    const builder = dag
      .container()
      .from('denoland/deno:2.0.0')
      .withDirectory('/app', source)
      .withWorkdir('/app')
      .withExec([
        'deno',
        'compile',
        '--allow-net',
        '--allow-env',
        '--allow-read',
        '--output',
        'app',
        entrypoint,
      ]);

    // Runtime stage: minimal distroless image
    return dag
      .container()
      .from('gcr.io/distroless/cc-debian12')
      .withFile('/app', builder.file('/app/app'))
      .withExposedPort(8000)
      .withEntrypoint(['/app']);
  }

  @func()
  async test(source: Directory): Promise<string> {
    return dag
      .container()
      .from('denoland/deno:2.0.0')
      .withDirectory('/app', source)
      .withWorkdir('/app')
      .withExec(['deno', 'task', 'check'])
      .withExec(['deno', 'task', 'test'])
      .stdout();
  }

  @func()
  async publish(
    container: Container,
    registry: string,
    image: string,
    tag: string,
    username: string,
    password: Secret,
  ): Promise<string> {
    const ref = `${registry}/${image}:${tag}`;
    return container.withRegistryAuth(registry, username, password).publish(ref);
  }

  @func()
  async deploy(image: string, service: string, region: string, project: string): Promise<string> {
    // Use gcloud CLI to deploy
    return dag
      .container()
      .from('google/cloud-sdk:slim')
      .withExec([
        'gcloud',
        'run',
        'deploy',
        service,
        '--image',
        image,
        '--region',
        region,
        '--project',
        project,
        '--quiet',
      ])
      .stdout();
  }
}
```

**Rationale:**

- No Dockerfile to maintain - build logic is code
- Testable and composable
- Same pipeline runs locally and in CI
- TypeScript for type safety

### 6. Reusable Workflow

**Decision:** Single reusable workflow that orchestrates Dagger.

```yaml
# github-meta/.github/workflows/deno-cloudrun.yaml
name: Deno Cloud Run Deploy

on:
  workflow_call:
    inputs:
      app-name:
        required: true
        type: string
      entrypoint:
        required: true
        type: string
      region:
        required: false
        type: string
        default: us-west1
      gcp-project:
        required: true
        type: string
      wif-provider:
        required: true
        type: string
      wif-service-account:
        required: true
        type: string

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dagger/dagger-for-github@v6
        with:
          verb: call
          module: github.com/dmikalova/github-meta/dagger/deno
          args: test --source=.

  release:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.semantic.outputs.new_release_version }}
      released: ${{ steps.semantic.outputs.new_release_published }}
    steps:
      - uses: actions/checkout@v4
      - uses: cycjimmy/semantic-release-action@v4
        id: semantic
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build-publish:
    needs: release
    if: needs.release.outputs.released == 'true'
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: dagger/dagger-for-github@v6
        with:
          verb: call
          module: github.com/dmikalova/github-meta/dagger/deno
          args: >-
            build --source=. --entrypoint=${{ inputs.entrypoint }}
            publish
            --registry=ghcr.io
            --image=dmikalova/${{ inputs.app-name }}
            --tag=${{ needs.release.outputs.version }}
            --username=${{ github.actor }}
            --password=env:GITHUB_TOKEN
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy:
    needs: [release, build-publish]
    if: needs.release.outputs.released == 'true'
    runs-on: ubuntu-latest
    permissions:
      id-token: write
    steps:
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ inputs.wif-provider }}
          service_account: ${{ inputs.wif-service-account }}
      - uses: dagger/dagger-for-github@v6
        with:
          verb: call
          module: github.com/dmikalova/github-meta/dagger/deno
          args: >-
            deploy
            --image=ghcr.io/dmikalova/${{ inputs.app-name }}:${{ needs.release.outputs.version }}
            --service=${{ inputs.app-name }}
            --region=${{ inputs.region }}
            --project=${{ inputs.gcp-project }}
```

**Rationale:** App repos just pass inputs - all logic is in the shared workflow
and Dagger module.

### 7. App Repo Workflow (Caller)

**Decision:** Minimal workflow in app repo that calls reusable workflow.

```yaml
# email-unsubscribe/.github/workflows/ci.yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  pipeline:
    uses: dmikalova/github-meta/.github/workflows/deno-cloudrun.yaml@main
    with:
      app-name: email-unsubscribe
      entrypoint: src/main.ts
      gcp-project: dmikalova-email-unsubscribe
      wif-provider: projects/PROJECT_NUM/locations/global/workloadIdentityPools/github/providers/github
      wif-service-account: email-unsubscribe-deploy@dmikalova-email-unsubscribe.iam.gserviceaccount.com
    secrets: inherit
```

**Rationale:** ~15 lines instead of 100+. Changes to pipeline don't require app
repo updates.

### 8. Files to Remove/Update

- **Delete** `.github/workflows/deploy.yml` - Northflank deployment
- **Replace** `.github/workflows/ci.yaml` - Call reusable workflow
- **Keep** `deploy.config.ts` - Still useful for documenting runtime
  requirements

## Risks / Trade-offs

| Risk                         | Mitigation                                        |
| ---------------------------- | ------------------------------------------------- |
| Dagger learning curve        | TypeScript SDK is intuitive, good docs            |
| Reusable workflow versioning | Pin to `@main` or tags, update when ready         |
| Dagger module caching        | Built-in caching, cold starts ~30s                |
| WIF not configured           | Dependency on gcp-github-wif change in infra repo |

## Migration Plan

### In github-meta repo (new)

1. **Create repo** - `dmikalova/github-meta`, public
2. **Add Dagger module** - `dagger/deno/` with TypeScript pipeline
3. **Add reusable workflow** - `.github/workflows/deno-cloudrun.yaml`
4. **Test locally** -
   `dagger call build --source=../email-unsubscribe --entrypoint=src/main.ts`

### In email-unsubscribe repo

- **Add commitlint** - package.json, commitlint.config.js, husky setup
- **Add semantic-release** - .releaserc.json
- **Replace ci.yaml** - Call reusable workflow
- **Delete deploy.yml** - Remove Northflank workflow
- **Push to main** - Triggers first automated release

## Dependencies

- `gcp-github-wif` change in infrastructure repo must be applied first (WIF
  pool, service account)
- `supabase-setup` change must be applied first (database connection)
- `github-terramate-migration` to manage the new github-meta repo

## Open Questions

None - Dagger + reusable workflows is a clean pattern.
