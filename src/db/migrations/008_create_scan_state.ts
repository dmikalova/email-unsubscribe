// Migration: Create scan_state table
// Tracks scanning progress for resume capability

export const name = 'create_scan_state_table';

export const up = `
CREATE TABLE scan_state (
  id SERIAL PRIMARY KEY,
  last_history_id TEXT,
  last_email_id TEXT,
  last_scan_at TIMESTAMPTZ,
  emails_scanned INTEGER NOT NULL DEFAULT 0,
  emails_processed INTEGER NOT NULL DEFAULT 0,
  is_initial_backlog_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one row exists
CREATE UNIQUE INDEX idx_scan_state_singleton ON scan_state((id IS NOT NULL));

-- Insert initial row
INSERT INTO scan_state (id) VALUES (1);

COMMENT ON TABLE scan_state IS 'Tracks email scanning progress for resume capability';
COMMENT ON COLUMN scan_state.last_history_id IS 'Gmail history ID for incremental sync';
COMMENT ON COLUMN scan_state.last_email_id IS 'Last processed email ID';
COMMENT ON COLUMN scan_state.is_initial_backlog_complete IS 'Whether initial 1000 email backlog has been processed';
`;

export const down = `
DROP TABLE IF EXISTS scan_state;
`;
