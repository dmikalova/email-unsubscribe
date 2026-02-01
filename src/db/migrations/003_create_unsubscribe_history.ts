// Migration: Create unsubscribe_history table
// Records all unsubscribe attempts with outcomes and debugging info

export const name = 'create_unsubscribe_history_table';

export const up = `
CREATE TYPE unsubscribe_status AS ENUM ('success', 'failed', 'uncertain', 'pending');
CREATE TYPE unsubscribe_method AS ENUM ('one_click', 'mailto', 'browser', 'manual');
CREATE TYPE failure_reason AS ENUM (
  'timeout',
  'no_button_found',
  'navigation_error',
  'form_error',
  'captcha_detected',
  'login_required',
  'network_error',
  'invalid_url',
  'unknown'
);

CREATE TABLE unsubscribe_history (
  id SERIAL PRIMARY KEY,
  email_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  sender_domain TEXT NOT NULL,
  unsubscribe_url TEXT,
  method unsubscribe_method NOT NULL,
  status unsubscribe_status NOT NULL DEFAULT 'pending',
  failure_reason failure_reason,
  failure_details TEXT,
  screenshot_path TEXT,
  trace_path TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_unsubscribe_history_sender ON unsubscribe_history(sender);
CREATE INDEX idx_unsubscribe_history_sender_domain ON unsubscribe_history(sender_domain);
CREATE INDEX idx_unsubscribe_history_status ON unsubscribe_history(status);
CREATE INDEX idx_unsubscribe_history_attempted_at ON unsubscribe_history(attempted_at);
CREATE INDEX idx_unsubscribe_history_email_id ON unsubscribe_history(email_id);

COMMENT ON TABLE unsubscribe_history IS 'Record of all unsubscribe attempts';
COMMENT ON COLUMN unsubscribe_history.screenshot_path IS 'Path to screenshot captured during attempt';
COMMENT ON COLUMN unsubscribe_history.trace_path IS 'Path to Playwright trace file for debugging';
`;
