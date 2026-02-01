// Migration: Create allow_list table
// Stores senders and domains that should not be unsubscribed

export const name = 'create_allow_list_table';

export const up = `
CREATE TYPE allow_list_type AS ENUM ('email', 'domain');

CREATE TABLE allow_list (
  id SERIAL PRIMARY KEY,
  type allow_list_type NOT NULL,
  value TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_allow_list_type_value ON allow_list(type, value);
CREATE INDEX idx_allow_list_value ON allow_list(value);

COMMENT ON TABLE allow_list IS 'Senders and domains to exclude from unsubscribe processing';
COMMENT ON COLUMN allow_list.type IS 'Whether this is an email address or domain';
COMMENT ON COLUMN allow_list.value IS 'The email address or domain to allow';
`;
