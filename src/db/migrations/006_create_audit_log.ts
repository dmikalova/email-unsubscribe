// Migration: Create audit_log table
// Records significant system events for debugging and compliance

export const name = 'create_audit_log_table';

export const up = `
CREATE TYPE audit_action AS ENUM (
  'unsubscribe_attempt',
  'unsubscribe_success',
  'unsubscribe_failed',
  'allowlist_add',
  'allowlist_remove',
  'session_created',
  'session_expired',
  'oauth_authorized',
  'oauth_refreshed',
  'oauth_revoked',
  'scan_started',
  'scan_completed',
  'pattern_imported',
  'pattern_exported'
);

CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  action audit_action NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_details ON audit_log USING GIN (details);

COMMENT ON TABLE audit_log IS 'Audit trail for significant system events';
`;

export const down = `
DROP TABLE IF EXISTS audit_log;
DROP TYPE IF EXISTS audit_action;
`;
