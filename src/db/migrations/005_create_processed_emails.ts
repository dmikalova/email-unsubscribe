// Migration: Create processed_emails table
// Ensures idempotent processing of emails

export const name = 'create_processed_emails_table';

export const up = `
CREATE TABLE processed_emails (
  id SERIAL PRIMARY KEY,
  email_id TEXT NOT NULL UNIQUE,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_processed_emails_email_id ON processed_emails(email_id);
CREATE INDEX idx_processed_emails_processed_at ON processed_emails(processed_at);

COMMENT ON TABLE processed_emails IS 'Track which emails have been processed to ensure idempotency';
`;
