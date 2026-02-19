// Audit logging

import { getConnection } from "../db/index.ts";

export type AuditAction =
  | "unsubscribe_attempt"
  | "unsubscribe_success"
  | "unsubscribe_failed"
  | "allowlist_add"
  | "allowlist_remove"
  | "session_created"
  | "session_expired"
  | "oauth_authorized"
  | "oauth_refreshed"
  | "oauth_revoked"
  | "scan_started"
  | "scan_completed"
  | "pattern_imported"
  | "pattern_exported";

export interface AuditLogEntry {
  id: number;
  userId: string | null;
  action: AuditAction;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface LogInput {
  action: AuditAction;
  userId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function log(input: LogInput): Promise<void> {
  const sql = getConnection();

  await sql`
    INSERT INTO audit_log (user_id, action, details, ip_address, user_agent)
    VALUES (
      ${input.userId ? input.userId : null}::uuid,
      ${input.action},
      ${input.details ? JSON.stringify(input.details) : null},
      ${input.ipAddress ?? null},
      ${input.userAgent ?? null}
    )
  `;
}

export function getAuditLog(
  userId: string,
  options: {
    action?: AuditAction;
    limit?: number;
    offset?: number;
    since?: Date;
  } = {},
): Promise<AuditLogEntry[]> {
  const sql = getConnection();
  const { action, limit = 100, offset = 0, since } = options;

  if (action && since) {
    return sql<AuditLogEntry[]>`
      SELECT id, action, details,
             ip_address as "ipAddress",
             user_agent as "userAgent",
             created_at as "createdAt"
      FROM audit_log
      WHERE user_id = ${userId}::uuid AND action = ${action} AND created_at >= ${since}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  if (action) {
    return sql<AuditLogEntry[]>`
      SELECT id, action, details,
             ip_address as "ipAddress",
             user_agent as "userAgent",
             created_at as "createdAt"
      FROM audit_log
      WHERE user_id = ${userId}::uuid AND action = ${action}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  if (since) {
    return sql<AuditLogEntry[]>`
      SELECT id, action, details,
             ip_address as "ipAddress",
             user_agent as "userAgent",
             created_at as "createdAt"
      FROM audit_log
      WHERE user_id = ${userId}::uuid AND created_at >= ${since}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  return sql<AuditLogEntry[]>`
    SELECT id, action, details,
           ip_address as "ipAddress",
           user_agent as "userAgent",
           created_at as "createdAt"
    FROM audit_log
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

// Convenience functions for common audit events

export async function logUnsubscribeAttempt(
  sender: string,
  url: string | null,
  method: string,
  ipAddress?: string,
): Promise<void> {
  await log({
    action: "unsubscribe_attempt",
    details: { sender, url, method },
    ipAddress,
  });
}

export async function logUnsubscribeSuccess(
  sender: string,
  method: string,
  ipAddress?: string,
): Promise<void> {
  await log({
    action: "unsubscribe_success",
    details: { sender, method },
    ipAddress,
  });
}

export async function logUnsubscribeFailed(
  sender: string,
  reason: string,
  ipAddress?: string,
): Promise<void> {
  await log({
    action: "unsubscribe_failed",
    details: { sender, reason },
    ipAddress,
  });
}

export async function logAllowlistAdd(
  type: string,
  value: string,
  ipAddress?: string,
): Promise<void> {
  await log({
    action: "allowlist_add",
    details: { type, value },
    ipAddress,
  });
}

export async function logAllowlistRemove(
  type: string,
  value: string,
  ipAddress?: string,
): Promise<void> {
  await log({
    action: "allowlist_remove",
    details: { type, value },
    ipAddress,
  });
}

export async function logScanStarted(
  userId: string,
  emailCount?: number,
): Promise<void> {
  await log({
    action: "scan_started",
    userId,
    details: emailCount ? { emailCount } : undefined,
  });
}

export async function logScanCompleted(
  userId: string,
  scanned: number,
  processed: number,
  errors: number,
): Promise<void> {
  await log({
    action: "scan_completed",
    userId,
    details: { scanned, processed, errors },
  });
}

export async function logOAuthAuthorized(
  userId: string,
  email?: string,
): Promise<void> {
  await log({
    action: "oauth_authorized",
    userId,
    details: email ? { email } : undefined,
  });
}

export async function logOAuthRevoked(userId: string): Promise<void> {
  await log({
    action: "oauth_revoked",
    userId,
  });
}

export async function logPatternImported(count: number): Promise<void> {
  await log({
    action: "pattern_imported",
    details: { count },
  });
}

export async function logPatternExported(count: number): Promise<void> {
  await log({
    action: "pattern_exported",
    details: { count },
  });
}
