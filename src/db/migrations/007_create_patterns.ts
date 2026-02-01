// Migration: Create patterns table
// Stores reusable patterns for unsubscribe automation

export const name = 'create_patterns_table';

export const up = `
CREATE TYPE pattern_type AS ENUM (
  'button_selector',
  'form_selector',
  'success_text',
  'error_text',
  'preference_center'
);

CREATE TABLE patterns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type pattern_type NOT NULL,
  selector TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  match_count INTEGER NOT NULL DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_patterns_name_type ON patterns(name, type);
CREATE INDEX idx_patterns_type ON patterns(type);
CREATE INDEX idx_patterns_match_count ON patterns(match_count DESC);

COMMENT ON TABLE patterns IS 'Reusable patterns for identifying unsubscribe elements';
COMMENT ON COLUMN patterns.selector IS 'CSS selector or text pattern';
COMMENT ON COLUMN patterns.priority IS 'Higher priority patterns are tried first';
COMMENT ON COLUMN patterns.match_count IS 'Number of times this pattern has matched';
COMMENT ON COLUMN patterns.is_builtin IS 'Built-in patterns cannot be deleted';
`;

export const down = `
DROP TABLE IF EXISTS patterns;
DROP TYPE IF EXISTS pattern_type;
`;
