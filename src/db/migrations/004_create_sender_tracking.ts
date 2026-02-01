// Migration: Create sender_tracking table
// Tracks sender activity to detect ineffective unsubscribes

export const name = 'create_sender_tracking_table';

export const up = `
CREATE TABLE sender_tracking (
  id SERIAL PRIMARY KEY,
  sender TEXT NOT NULL,
  sender_domain TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_count INTEGER NOT NULL DEFAULT 1,
  unsubscribed_at TIMESTAMPTZ,
  emails_after_unsubscribe INTEGER NOT NULL DEFAULT 0,
  last_email_after_unsubscribe_at TIMESTAMPTZ,
  flagged_ineffective BOOLEAN NOT NULL DEFAULT FALSE,
  flagged_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_sender_tracking_sender ON sender_tracking(sender);
CREATE INDEX idx_sender_tracking_domain ON sender_tracking(sender_domain);
CREATE INDEX idx_sender_tracking_unsubscribed ON sender_tracking(unsubscribed_at) WHERE unsubscribed_at IS NOT NULL;
CREATE INDEX idx_sender_tracking_ineffective ON sender_tracking(flagged_ineffective) WHERE flagged_ineffective = TRUE;

COMMENT ON TABLE sender_tracking IS 'Tracks sender activity to detect ineffective unsubscribes';
COMMENT ON COLUMN sender_tracking.emails_after_unsubscribe IS 'Count of emails received after successful unsubscribe (excluding 24hr grace period)';
COMMENT ON COLUMN sender_tracking.flagged_ineffective IS 'True if sender continues emailing after unsubscribe grace period';
`;
