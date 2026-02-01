// Migration: Create oauth_tokens table
// Stores encrypted OAuth access and refresh tokens

export const name = 'create_oauth_tokens_table';

export const up = `
CREATE TABLE oauth_tokens (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  access_token_encrypted BYTEA NOT NULL,
  refresh_token_encrypted BYTEA NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);

COMMENT ON TABLE oauth_tokens IS 'Encrypted OAuth tokens for Gmail API access';
COMMENT ON COLUMN oauth_tokens.access_token_encrypted IS 'AES-256-GCM encrypted access token';
COMMENT ON COLUMN oauth_tokens.refresh_token_encrypted IS 'AES-256-GCM encrypted refresh token';
`;
