// Compliance tracker - records unsubscribe attempts and outcomes

import { withDb } from "../db/index.ts";
import {
  archiveAndLabelSuccess,
  labelMessageAsFailed,
} from "../gmail/index.ts";
import { markEmailProcessed } from "../scanner/state.ts";
import { markSenderUnsubscribed } from "../scanner/tracking.ts";

export type UnsubscribeStatus = "success" | "failed" | "uncertain" | "pending";
export type UnsubscribeMethod = "one_click" | "mailto" | "browser" | "manual";
export type FailureReason =
  | "timeout"
  | "no_button_found"
  | "navigation_error"
  | "form_error"
  | "captcha_detected"
  | "login_required"
  | "network_error"
  | "invalid_url"
  | "unknown";

export interface UnsubscribeAttempt {
  id: number;
  emailId: string;
  sender: string;
  senderDomain: string;
  unsubscribeUrl: string | null;
  method: UnsubscribeMethod;
  status: UnsubscribeStatus;
  failureReason: FailureReason | null;
  failureDetails: string | null;
  screenshotPath: string | null;
  tracePath: string | null;
  attemptedAt: Date;
  completedAt: Date | null;
  retryCount: number;
}

export interface RecordAttemptInput {
  emailId: string;
  sender: string;
  senderDomain: string;
  unsubscribeUrl?: string;
  method: UnsubscribeMethod;
  status: UnsubscribeStatus;
  failureReason?: FailureReason;
  failureDetails?: string;
  screenshotPath?: string;
  tracePath?: string;
}

export async function recordUnsubscribeAttempt(
  userId: string,
  input: RecordAttemptInput,
): Promise<UnsubscribeAttempt> {
  const attempt = await withDb(async (sql) => {
    const rows = await sql<UnsubscribeAttempt[]>`
      INSERT INTO unsubscribe_history (
        user_id, email_id, sender, sender_domain, unsubscribe_url,
        method, status, failure_reason, failure_details,
        screenshot_path, trace_path, completed_at
      ) VALUES (
        ${userId},
        ${input.emailId},
        ${input.sender},
        ${input.senderDomain},
        ${input.unsubscribeUrl ?? null},
        ${input.method},
        ${input.status},
        ${input.failureReason ?? null},
        ${input.failureDetails ?? null},
        ${input.screenshotPath ?? null},
        ${input.tracePath ?? null},
        ${input.status !== "pending" ? new Date() : null}
      )
      RETURNING id, email_id as "emailId", sender, sender_domain as "senderDomain",
                unsubscribe_url as "unsubscribeUrl", method, status,
                failure_reason as "failureReason", failure_details as "failureDetails",
                screenshot_path as "screenshotPath", trace_path as "tracePath",
                attempted_at as "attemptedAt", completed_at as "completedAt",
                retry_count as "retryCount"
    `;

    return rows[0];
  });

  // Handle side effects based on status
  if (input.status === "success") {
    await handleSuccess(userId, input.emailId, input.sender);
  } else if (input.status === "failed") {
    await handleFailure(userId, input.emailId);
  }

  // Mark email as processed
  await markEmailProcessed(userId, input.emailId);

  return attempt;
}

async function handleSuccess(
  userId: string,
  emailId: string,
  sender: string,
): Promise<void> {
  // Mark sender as unsubscribed (for tracking)
  await markSenderUnsubscribed(userId, sender);

  // Label and archive the email
  try {
    await archiveAndLabelSuccess(userId, emailId);
  } catch (error) {
    console.error(`Failed to label/archive email ${emailId}:`, error);
  }
}

async function handleFailure(userId: string, emailId: string): Promise<void> {
  // Label email as failed
  try {
    await labelMessageAsFailed(userId, emailId);
  } catch (error) {
    console.error(`Failed to label email ${emailId}:`, error);
  }
}

export function getUnsubscribeAttempt(
  userId: string,
  id: number,
): Promise<UnsubscribeAttempt | null> {
  return withDb(async (sql) => {
    const rows = await sql<UnsubscribeAttempt[]>`
      SELECT id, email_id as "emailId", sender, sender_domain as "senderDomain",
             unsubscribe_url as "unsubscribeUrl", method, status,
             failure_reason as "failureReason", failure_details as "failureDetails",
             screenshot_path as "screenshotPath", trace_path as "tracePath",
             attempted_at as "attemptedAt", completed_at as "completedAt",
             retry_count as "retryCount"
      FROM unsubscribe_history
      WHERE user_id = ${userId} AND id = ${id}
    `;

    return rows[0] ?? null;
  });
}

export function getFailedAttempts(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<UnsubscribeAttempt[]> {
  return withDb((sql) => {
    return sql<UnsubscribeAttempt[]>`
      SELECT id, email_id as "emailId", sender, sender_domain as "senderDomain",
             unsubscribe_url as "unsubscribeUrl", method, status,
             failure_reason as "failureReason", failure_details as "failureDetails",
             screenshot_path as "screenshotPath", trace_path as "tracePath",
             attempted_at as "attemptedAt", completed_at as "completedAt",
             retry_count as "retryCount"
      FROM unsubscribe_history
      WHERE user_id = ${userId} AND (status = 'failed' OR status = 'uncertain')
      ORDER BY attempted_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  });
}

export function getRecentAttempts(
  userId: string,
  limit = 20,
): Promise<UnsubscribeAttempt[]> {
  return withDb((sql) => {
    return sql<UnsubscribeAttempt[]>`
      SELECT id, email_id as "emailId", sender, sender_domain as "senderDomain",
             unsubscribe_url as "unsubscribeUrl", method, status,
             failure_reason as "failureReason", failure_details as "failureDetails",
             screenshot_path as "screenshotPath", trace_path as "tracePath",
             attempted_at as "attemptedAt", completed_at as "completedAt",
             retry_count as "retryCount"
      FROM unsubscribe_history
      WHERE user_id = ${userId}
      ORDER BY attempted_at DESC
      LIMIT ${limit}
    `;
  });
}

export function markAsResolved(
  userId: string,
  id: number,
): Promise<void> {
  return withDb(async (sql) => {
    await sql`
      UPDATE unsubscribe_history
      SET status = 'success', completed_at = NOW()
      WHERE user_id = ${userId} AND id = ${id}
    `;
  });
}

export function incrementRetryCount(
  userId: string,
  id: number,
): Promise<number> {
  return withDb(async (sql) => {
    const rows = await sql<{ retry_count: number }[]>`
      UPDATE unsubscribe_history
      SET retry_count = retry_count + 1, status = 'pending'
      WHERE user_id = ${userId} AND id = ${id}
      RETURNING retry_count
    `;

    return rows[0]?.retry_count ?? 0;
  });
}

export function updateAttemptStatus(
  userId: string,
  id: number,
  status: UnsubscribeStatus,
  details?: {
    failureReason?: FailureReason;
    failureDetails?: string;
    screenshotPath?: string;
    tracePath?: string;
  },
): Promise<void> {
  return withDb(async (sql) => {
    await sql`
      UPDATE unsubscribe_history
      SET
        status = ${status},
        failure_reason = COALESCE(${
      details?.failureReason ?? null
    }, failure_reason),
        failure_details = COALESCE(${
      details?.failureDetails ?? null
    }, failure_details),
        screenshot_path = COALESCE(${
      details?.screenshotPath ?? null
    }, screenshot_path),
        trace_path = COALESCE(${details?.tracePath ?? null}, trace_path),
        completed_at = ${status !== "pending" ? new Date() : null}
      WHERE user_id = ${userId} AND id = ${id}
    `;
  });
}

export interface UnsubscribeStats {
  total: number;
  success: number;
  failed: number;
  uncertain: number;
  pending: number;
  successRate: number;
}

export function getStats(userId: string): Promise<UnsubscribeStats> {
  return withDb(async (sql) => {
    const rows = await sql<{ status: string; count: string }[]>`
      SELECT status, COUNT(*)::text as count
      FROM unsubscribe_history
      WHERE user_id = ${userId}
      GROUP BY status
    `;

    const stats: UnsubscribeStats = {
      total: 0,
      success: 0,
      failed: 0,
      uncertain: 0,
      pending: 0,
      successRate: 0,
    };

    for (const row of rows) {
      const count = parseInt(row.count);
      stats.total += count;

      switch (row.status) {
        case "success":
          stats.success = count;
          break;
        case "failed":
          stats.failed = count;
          break;
        case "uncertain":
          stats.uncertain = count;
          break;
        case "pending":
          stats.pending = count;
          break;
      }
    }

    if (stats.total > 0) {
      stats.successRate = (stats.success / stats.total) * 100;
    }

    return stats;
  });
}

export function getHistoryByDomain(
  userId: string,
  domain: string,
): Promise<UnsubscribeAttempt[]> {
  return withDb((sql) => {
    return sql<UnsubscribeAttempt[]>`
      SELECT id, email_id as "emailId", sender, sender_domain as "senderDomain",
             unsubscribe_url as "unsubscribeUrl", method, status,
             failure_reason as "failureReason", failure_details as "failureDetails",
             screenshot_path as "screenshotPath", trace_path as "tracePath",
             attempted_at as "attemptedAt", completed_at as "completedAt",
             retry_count as "retryCount"
      FROM unsubscribe_history
      WHERE user_id = ${userId} AND sender_domain = ${domain}
      ORDER BY attempted_at DESC
    `;
  });
}

export function getDomainStats(
  userId: string,
): Promise<
  { domain: string; total: number; success: number; failed: number }[]
> {
  return withDb((sql) => {
    return sql`
      SELECT
        sender_domain as domain,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'success')::int as success,
        COUNT(*) FILTER (WHERE status = 'failed' OR status = 'uncertain')::int as failed
      FROM unsubscribe_history
      WHERE user_id = ${userId}
      GROUP BY sender_domain
      ORDER BY total DESC
      LIMIT 50
    `;
  });
}
