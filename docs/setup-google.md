# Google OAuth Setup

This guide walks through setting up Google OAuth for the Email Unsubscribe
application.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "Email Unsubscribe")
4. Click "Create"

## Step 2: Enable the Gmail API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on "Gmail API" and then "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type (unless you have Google Workspace)
3. Click "Create"
4. Fill in the required information:
   - **App name**: Email Unsubscribe
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"

### Add Scopes

1. Click "Add or Remove Scopes"
2. Find and select these scopes:
   - `https://www.googleapis.com/auth/gmail.readonly` - Read email messages
   - `https://www.googleapis.com/auth/gmail.modify` - Modify email labels
3. Click "Update" then "Save and Continue"

### Test Users (Development)

1. Add your email as a test user
2. Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Configure the client:
   - **Name**: Email Unsubscribe Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:8000` (development)
     - `https://email-unsubscribe.cddc39.tech` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:8000/oauth/callback` (development)
     - `https://email-unsubscribe.cddc39.tech/oauth/callback` (production)
5. Click "Create"
6. Copy the **Client ID** and **Client Secret**

## Step 5: Configure Environment Variables

Add the credentials to your `.env` file:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/oauth/callback
```

For production deployment, use the production redirect URI.

## Step 6: Generate Encryption Key

The application encrypts OAuth tokens at rest. Generate a secure encryption key:

```bash
# Generate a 32-character random string
openssl rand -base64 32
```

Add to your `.env` file:

```bash
ENCRYPTION_KEY=your-generated-encryption-key
```

## Verification (Production)

For production use with users other than yourself, you'll need to verify your
app with Google:

1. Go to "OAuth consent screen"
2. Click "Publish App"
3. Complete the verification process

**Note**: For personal use with only your account, you can skip verification and
add yourself as a test user.

## Troubleshooting

### "Access blocked: Authorization Error"

- Ensure your email is added as a test user
- Verify the redirect URI exactly matches your configuration

### "Invalid scope"

- Make sure the Gmail API is enabled
- Verify the scopes are added to your consent screen

### "Redirect URI mismatch"

- The redirect URI must exactly match (including http vs https)
- Check for trailing slashes

## Security Notes

- Never commit credentials to version control
- Use separate credentials for development and production
- Rotate the encryption key requires re-authenticating all users
- Store production secrets in a secure secrets manager
