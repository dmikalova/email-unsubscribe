# Terraform/OpenTofu Google Cloud Authentication

This guide explains how to authenticate with Google Cloud to run
Terraform/OpenTofu configurations.

## Prerequisites

- [Google Cloud CLI (gcloud)](https://cloud.google.com/sdk/docs/install)
  installed
- A Google Cloud project (see "Creating Your First Project" below)

## Creating Your First Project

If you don't have a GCP project yet:

### Step 1: Create a Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Accept the terms of service

### Step 2: Create a Project

```bash
# Install gcloud first (see below), then:
gcloud projects create email-unsubscribe-prd --name="Email Unsubscribe"

# Set it as your default project
gcloud config set project email-unsubscribe-prd
```

Or via the console:

1. Go to
   [Resource Manager](https://console.cloud.google.com/cloud-resource-manager)
2. Click "Create Project"
3. Enter name: `Email Unsubscribe`
4. Project ID: `email-unsubscribe-prod` (or let Google generate one)
5. Click "Create"

### Step 3: Enable Billing (Required for APIs)

1. Go to [Billing](https://console.cloud.google.com/billing)
2. Create a billing account if you don't have one
3. Link your project to the billing account

> **Note**: Gmail API has a generous free tier. You won't be charged for typical
> personal use.

## About Organizations (Optional)

**Organizations are optional** for personal use. They're typically used by:

- Companies with Google Workspace (formerly G Suite)
- Teams using Google Cloud Identity

For personal projects, you can skip organizations entirely and work directly
with projects. If you later need to manage multiple projects, you can:

- Create a
  [Cloud Identity Free](https://cloud.google.com/identity/docs/set-up-cloud-identity-admin)
  account to get an organization
- Or simply grant your service account access to each project individually

## Option 1: Application Default Credentials (Recommended for Development)

The simplest way to authenticate for local development:

### Step 1: Install gcloud CLI

```bash
# macOS with Homebrew
brew install google-cloud-sdk

# Or download from https://cloud.google.com/sdk/docs/install
```

### Step 2: Login to Google Cloud

```bash
gcloud auth login
```

This opens a browser window to authenticate with your Google account.

### Step 3: Set Application Default Credentials

```bash
gcloud auth application-default login
```

This creates credentials that Terraform/OpenTofu will automatically use.

### Step 4: Set Your Project

```bash
gcloud config set project email-unsubscribe-prod
```

### Step 5: Run Terraform

```bash
cd infra/google-oauth
tofu init
tofu apply
```

## Option 2: Service Account Key (For CI/CD or Automation)

For automated environments, use a service account.

### Option 2a: Organization-Wide Service Account (Access to All Projects)

> **Note**: This requires a GCP organization (via Google Workspace or Cloud
> Identity). Skip to Option 2b if you don't have one.

Create a service account with access across your entire GCP organization:

#### Step 1: Find Your Organization ID

```bash
gcloud organizations list
```

Note the `ID` column value (a number like `123456789012`).

#### Step 2: Create a Service Account in a Central Project

Choose a project to host the service account (e.g., your main project):

```bash
PROJECT_ID="email-unsubscribe-prod"
gcloud config set project $PROJECT_ID

gcloud iam service-accounts create terraform \
  --display-name="Terraform Organization Service Account"
```

#### Step 3: Grant Organization-Level Roles

```bash
ORG_ID="123456789012"  # Replace with your organization ID
PROJECT_ID="email-unsubscribe-prod"
SA_EMAIL="terraform@$PROJECT_ID.iam.gserviceaccount.com"

# Grant organization-wide roles
gcloud organizations add-iam-policy-binding $ORG_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/owner"

# Or for more restricted access, use specific roles:
# - roles/resourcemanager.projectCreator (create new projects)
# - roles/resourcemanager.folderViewer (view folder structure)
# - roles/billing.user (link projects to billing accounts)
```

#### Step 4: Create and Download Key

```bash
gcloud iam service-accounts keys create terraform-key.json \
  --iam-account=$SA_EMAIL
```

### Option 2b: Single Project Service Account

For access to only one project:

#### Step 1: Create a Service Account

```bash
PROJECT_ID="email-unsubscribe-prod"
gcloud config set project $PROJECT_ID

gcloud iam service-accounts create terraform \
  --display-name="Terraform Service Account"
```

#### Step 2: Grant Project-Level Roles

```bash
PROJECT_ID="email-unsubscribe-prod"
SA_EMAIL="terraform@$PROJECT_ID.iam.gserviceaccount.com"

# Service Usage Admin (to enable APIs)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/serviceusage.serviceUsageAdmin"

# (Optional) Additional roles as needed
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountAdmin"
```

#### Step 3: Create and Download Key

```bash
gcloud iam service-accounts keys create terraform-key.json \
  --iam-account=$SA_EMAIL
```

⚠️ **Security Warning**: Keep this file secure and never commit it to version
control.

### Step 4: Set Environment Variable

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/terraform-key.json"
```

Or add to your shell profile:

```bash
echo 'export GOOGLE_APPLICATION_CREDENTIALS="/path/to/terraform-key.json"' >> ~/.zshrc
```

## Verifying Authentication

Test that authentication is working:

```bash
# Check current account
gcloud auth list

# Check application default credentials
gcloud auth application-default print-access-token

# Test with Terraform
cd infra/google-oauth
tofu init
tofu plan
```

## Troubleshooting

### "Could not find default credentials"

Run `gcloud auth application-default login` to set up credentials.

### "Permission denied" or "403 Forbidden"

- Ensure the account has the required IAM roles
- For service accounts, verify the key file path is correct
- Check that the project ID matches

### "API not enabled"

The Terraform configuration will enable required APIs, but you need sufficient
permissions. Ensure your account has `roles/serviceusage.serviceUsageAdmin` or
`roles/owner`.

### "Quota exceeded"

Google Cloud has API quotas. Wait a few minutes and try again, or request a
quota increase.

## Required IAM Permissions

To run the Terraform configuration, your account needs:

| Permission                     | Role                | Purpose           |
| ------------------------------ | ------------------- | ----------------- |
| `serviceusage.services.enable` | Service Usage Admin | Enable Gmail API  |
| `resourcemanager.projects.get` | Project Viewer      | Read project info |

For project owners, these permissions are already included.

## Security Best Practices

1. **Use Application Default Credentials** for local development
2. **Use Service Accounts** for CI/CD and automation
3. **Rotate service account keys** regularly
4. **Never commit credentials** to version control
5. **Use Workload Identity Federation** for production CI/CD (avoids long-lived
   keys)

## Additional Resources

- [Google Provider Authentication](https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference#authentication)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
