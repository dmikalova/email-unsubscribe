# Google Cloud OAuth Setup with OpenTofu
#
# This automates most of the Google Cloud setup.
# OAuth client credentials must still be created manually in the console.
#
# Prerequisites:
#   See docs/terraform-auth.md for authenticating with Google Cloud
#
# Usage:
#   tofu init
#   tofu apply

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "email-unsubscribe-prd"
}

variable "project_name" {
  description = "Human-readable project name"
  type        = string
  default     = "Email Unsubscribe"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-west1"
}

variable "support_email" {
  description = "Support email for OAuth consent screen"
  type        = string
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "gmail" {
  service            = "gmail.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "oauth" {
  service            = "iamcredentials.googleapis.com"
  disable_on_destroy = false
}

# Note: OAuth consent screen and credentials for web apps cannot be fully
# automated via Terraform. The google_iap_brand resource is for IAP only.
#
# You must manually:
# 1. Go to https://console.cloud.google.com/apis/credentials/consent
# 2. Configure OAuth consent screen (External, app name, support email)
# 3. Add scopes: gmail.readonly, gmail.modify, gmail.labels
# 4. Add your email as a test user
# 5. Create OAuth 2.0 Client ID (Web application type)
# 6. Set redirect URI: http://localhost:8000/oauth/callback
# 7. Copy Client ID and Client Secret to Bitwarden

output "next_steps" {
  value = <<-EOT

    ✅ Gmail API enabled for project: ${var.project_id}

    Next, complete these manual steps:

    1. Configure OAuth consent screen:
       https://console.cloud.google.com/apis/credentials/consent?project=${var.project_id}
       - User Type: External
       - App name: ${var.project_name}
       - Support email: ${var.support_email}
       - Scopes: gmail.readonly, gmail.modify, gmail.labels
       - Test users: Add your email

    2. Create OAuth credentials:
       https://console.cloud.google.com/apis/credentials?project=${var.project_id}
       - Create Credentials → OAuth client ID
       - Application type: Web application
       - Redirect URI: http://localhost:8000/oauth/callback

    3. Store credentials:
       deno task setup-secrets

  EOT
}
