# Database schema for email-unsubscribe
# Managed by Atlas CLI - https://atlasgo.io

schema "email_unsubscribe" {}

# Enums

enum "allow_list_type" {
  schema = schema.email_unsubscribe

  values = ["email", "domain"]
}

enum "audit_action" {
  schema = schema.email_unsubscribe

  values = [
    "unsubscribe_attempt",
    "unsubscribe_success",
    "unsubscribe_failed",
    "allowlist_add",
    "allowlist_remove",
    "session_created",
    "session_expired",
    "oauth_authorized",
    "oauth_refreshed",
    "oauth_revoked",
    "scan_started",
    "scan_completed",
    "pattern_imported",
    "pattern_exported"
  ]
}

enum "failure_reason" {
  schema = schema.email_unsubscribe

  values = [
    "timeout",
    "no_button_found",
    "navigation_error",
    "form_error",
    "captcha_detected",
    "login_required",
    "network_error",
    "invalid_url",
    "unknown"
  ]
}

enum "pattern_type" {
  schema = schema.email_unsubscribe

  values = [
    "button_selector",
    "form_selector",
    "success_text",
    "error_text",
    "preference_center"
  ]
}

enum "unsubscribe_method" {
  schema = schema.email_unsubscribe

  values = ["one_click", "mailto", "browser", "manual"]
}

enum "unsubscribe_status" {
  schema = schema.email_unsubscribe

  values = ["success", "failed", "uncertain", "pending"]
}

# Tables

table "allow_list" {
  schema = schema.email_unsubscribe

  column "id" {
    null = false
    type = serial
  }
  column "type" {
    null = false
    type = enum.allow_list_type
  }
  column "value" {
    null = false
    type = text
  }
  column "notes" {
    null = true
    type = text
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_allow_list_type_value" {
    unique  = true
    columns = [column.type, column.value]
  }
  index "idx_allow_list_value" {
    columns = [column.value]
  }
}

table "audit_log" {
  schema = schema.email_unsubscribe

  column "id" {
    null = false
    type = serial
  }
  column "action" {
    null = false
    type = enum.audit_action
  }
  column "details" {
    null = true
    type = jsonb
  }
  column "ip_address" {
    null = true
    type = inet
  }
  column "user_agent" {
    null = true
    type = text
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_audit_log_action" {
    columns = [column.action]
  }
  index "idx_audit_log_created_at" {
    columns = [column.created_at]
  }
  index "idx_audit_log_details" {
    type    = GIN
    columns = [column.details]
  }
}

table "oauth_tokens" {
  schema = schema.email_unsubscribe

  column "id" {
    null = false
    type = serial
  }
  column "user_id" {
    null = false
    type = text
  }
  column "access_token_encrypted" {
    null = false
    type = bytea
  }
  column "refresh_token_encrypted" {
    null = false
    type = bytea
  }
  column "token_type" {
    null    = false
    type    = text
    default = "Bearer"
  }
  column "scope" {
    null = true
    type = text
  }
  column "expires_at" {
    null = false
    type = timestamptz
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  index "oauth_tokens_user_id_key" {
    unique  = true
    columns = [column.user_id]
  }
  index "idx_oauth_tokens_expires_at" {
    columns = [column.expires_at]
  }
  index "idx_oauth_tokens_user_id" {
    columns = [column.user_id]
  }
}

table "patterns" {
  schema = schema.email_unsubscribe

  column "id" {
    null = false
    type = serial
  }
  column "name" {
    null = false
    type = text
  }
  column "type" {
    null = false
    type = enum.pattern_type
  }
  column "selector" {
    null = false
    type = text
  }
  column "priority" {
    null    = false
    type    = integer
    default = 0
  }
  column "match_count" {
    null    = false
    type    = integer
    default = 0
  }
  column "last_matched_at" {
    null = true
    type = timestamptz
  }
  column "is_builtin" {
    null    = false
    type    = boolean
    default = false
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_patterns_match_count" {
    columns = [column.match_count]
  }
  index "idx_patterns_name_type" {
    unique  = true
    columns = [column.name, column.type]
  }
  index "idx_patterns_type" {
    columns = [column.type]
  }
}

table "processed_emails" {
  schema = schema.email_unsubscribe

  column "id" {
    null = false
    type = serial
  }
  column "email_id" {
    null = false
    type = text
  }
  column "processed_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  index "processed_emails_email_id_key" {
    unique  = true
    columns = [column.email_id]
  }
  index "idx_processed_emails_email_id" {
    columns = [column.email_id]
  }
  index "idx_processed_emails_processed_at" {
    columns = [column.processed_at]
  }
}

table "scan_state" {
  schema = schema.email_unsubscribe

  column "id" {
    null = false
    type = serial
  }
  column "last_history_id" {
    null = true
    type = text
  }
  column "last_email_id" {
    null = true
    type = text
  }
  column "last_scan_at" {
    null = true
    type = timestamptz
  }
  column "emails_scanned" {
    null    = false
    type    = integer
    default = 0
  }
  column "emails_processed" {
    null    = false
    type    = integer
    default = 0
  }
  column "is_initial_backlog_complete" {
    null    = false
    type    = boolean
    default = false
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_scan_state_singleton" {
    unique  = true
    columns = [sql("((id IS NOT NULL))")]
  }
}

table "sender_tracking" {
  schema = schema.email_unsubscribe

  column "id" {
    null = false
    type = serial
  }
  column "sender" {
    null = false
    type = text
  }
  column "sender_domain" {
    null = false
    type = text
  }
  column "first_seen_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "last_seen_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "email_count" {
    null    = false
    type    = integer
    default = 1
  }
  column "unsubscribed_at" {
    null = true
    type = timestamptz
  }
  column "emails_after_unsubscribe" {
    null    = false
    type    = integer
    default = 0
  }
  column "last_email_after_unsubscribe_at" {
    null = true
    type = timestamptz
  }
  column "flagged_ineffective" {
    null    = false
    type    = boolean
    default = false
  }
  column "flagged_at" {
    null = true
    type = timestamptz
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_sender_tracking_domain" {
    columns = [column.sender_domain]
  }
  index "idx_sender_tracking_ineffective" {
    columns = [column.flagged_ineffective]
    where   = "flagged_ineffective = true"
  }
  index "idx_sender_tracking_sender" {
    unique  = true
    columns = [column.sender]
  }
  index "idx_sender_tracking_unsubscribed" {
    columns = [column.unsubscribed_at]
    where   = "unsubscribed_at IS NOT NULL"
  }
}

table "unsubscribe_history" {
  schema = schema.email_unsubscribe

  column "id" {
    null = false
    type = serial
  }
  column "email_id" {
    null = false
    type = text
  }
  column "sender" {
    null = false
    type = text
  }
  column "sender_domain" {
    null = false
    type = text
  }
  column "unsubscribe_url" {
    null = true
    type = text
  }
  column "method" {
    null = false
    type = enum.unsubscribe_method
  }
  column "status" {
    null    = false
    type    = enum.unsubscribe_status
    default = "pending"
  }
  column "failure_reason" {
    null = true
    type = enum.failure_reason
  }
  column "failure_details" {
    null = true
    type = text
  }
  column "screenshot_path" {
    null = true
    type = text
  }
  column "trace_path" {
    null = true
    type = text
  }
  column "attempted_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "completed_at" {
    null = true
    type = timestamptz
  }
  column "retry_count" {
    null    = false
    type    = integer
    default = 0
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_unsubscribe_history_attempted_at" {
    columns = [column.attempted_at]
  }
  index "idx_unsubscribe_history_email_id" {
    columns = [column.email_id]
  }
  index "idx_unsubscribe_history_sender" {
    columns = [column.sender]
  }
  index "idx_unsubscribe_history_sender_domain" {
    columns = [column.sender_domain]
  }
  index "idx_unsubscribe_history_status" {
    columns = [column.status]
  }
}
