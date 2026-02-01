// Compliance tracker - records unsubscribe attempts and outcomes

import { getConnection } from '../db/index.ts';
import { markSenderUnsubscribed } from '../scanner/tracking.ts';
import { labelMessageAsFailed, archiveAndLabelSuccess } from '../gmail/index.ts';

export type UnsubscribeStatus = 'success' | 'failed' | 'uncertain' | 'pending';
export type UnsubscribeMethod = 'one_click' | 'mailto' | 'browser' | 'manual';
export type FailureReason = 
  | 'timeout'
  | 'no_button_found'
  | 'navigation_error'
  | 'form_error'
  | 'captcha_detected'
  | 'login_required'
  | 'network_error'
  | 'invalid_url'
  | 'unknown';

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

export async function recordUnsubscribeAttempt(input: RecordAttemptInput): Promise<UnsubscribeAttempt> {
  const sql = getConnection();

  const rows = await sql<UnsubscribeAttempt[]>`
    INSERT INTO unsubscribe_history (
      email_id, sender, sender_domain, unsubscribe_url,
      method, status, failure_reason, failure_details,
      screenshot_path, trace_path, completed_at
    ) VALUES (
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
      ${input.status !== 'pending' ? new Date() : null}
    )
    RETURNING id, email_id as "emailId", sender, sender_domain as "senderDomain",
              unsubscribe_url as "unsubscribeUrl", method, status,
              failure_reason as "failureReason", failure_details as "failureDetails",
              screenshot_path as "screenshotPath", trace_path as "tracePath",
              attempted_at as "attemptedAt", completed_at as "completedAt",
              retry_count as "retryCount"
  `;

  const attempt = rows[0];

  // Handle side effects based on status
  if (input.status === 'success') {
    await handleSuccess(input.emailId, input.sender);
  } else if (input.status === 'failed') {
    await handleFailure(input.emailId);
  }

  // Mark email as processed
  await markEmailProcessed(input.emailId);

  return attempt;
}

async function handleSuccess(emailId: string, sender: string): Promise<void> {
  // Mark sender as unsubscribed (for tracking)
  await markSenderUnsubscribed(sender);

  // Label and archive the email
  try {
    await archiveAndLabelSuccess(emailId);
  } catch (error) {
    console.error(`Failed to label/archive email ${emailId}:`, error);
  }
}

async function handleFailure(emailId: string): Promise<void> {
  // Label email as failed
  try {
    await labelMessageAsFailed(emailId);
  } catch (error) {
    console.error(`Failed to label email ${emailId}:`, error);
  }
}

export async function getUnsubscribeAttempt(id: number): Promise<UnsubscribeAttempt | null> {
  const sql = getConnection();

  const rows = await sql<UnsubscribeAttempt[]>`
    SELECT id, email_id as "emailId", sender, sender_domain as "senderDomain",
           unsubscribe_url as "unsubscribeUrl", method, status,
           failure_reason as "failureReason", failure_details as "failureDetails",
           screenshot_path as "screenshotPath", trace_path as "tracePath",
           attempted_at as "attemptedAt", completed_at as "completedAt",
           retry_count as "retryCount"
    FROM unsubscribe_history
    WHERE id = ${id}
  `;

  return rows[0] ?? null;
}

export function getFailedAttempts(limit = 50, offset = 0): Promise<UnsubscribeAttempt[]> {
  const sql = getConnection();

  return sql<UnsubscribeAttempt[]>`
    SELECT id, email_id as "emailId", sender, sender_domain as "senderDomain",
           unsubscribe_url as "unsubscribeUrl", method, status,
           failure_reason as "failureReason", failure_details as "failureDetails",
           screenshot_path as "screenshotPath", trace_path as "tracePath",
           attempted_at as "attemptedAt", completed_at as "completedAt",
           retry_count as "retryCount"
    FROM unsubscribe_history
    WHERE status = 'failed' OR status = 'uncertain'
    ORDER BY attempted_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

export function getRecentAttempts(limit = 20): Promise<UnsubscribeAttempt[]> {
  const sql = getConnection();

  return sql<UnsubscribeAttempt[]>`
    SELECT id, email_id as "emailId", sender, sender_domain as "senderDomain",
           unsubscribe_url as "unsubscribeUrl", method, status,
           failure_reason as "failureReason", failure_details as "failureDetails",
           screenshot_path as "screenshotPath", trace_path as "tracePath",
           attempted_at as "attemptedAt", completed_at as "completedAt",
           retry_count as "retryCount"
    FROM unsubscribe_history
    ORDER BY attempted_at DESC
    LIMIT ${limit}
  `;
}

export async function markAsResolved(id: number): Promise<void> {
  const sql = getConnection();

  await sql`
    UPDATE unsubscribe_history
    SET status = 'success', completed_at = NOW()
    WHERE id = ${id}
  `;
}

export async function incrementRetryCount(id: number): Promise<number> {
  const sql = getConnection();

  const rows = await sql<{ retry_count: number }[]>`
    UPDATE unsubscribe_history
    SET retry_count = retry_count + 1, status = 'pending'
    WHERE id = ${id}
    RETURNING retry_count
  `;

  return rows[0]?.retry_count ?? 0;
}

export async function updateAttemptStatus(
  id: number,
  status: UnsubscribeStatus,
  details?: {
    failureReason?: FailureReason;
    failureDetails?: string;
    screenshotPath?: string;
    tracePath?: string;
  },
): Promise<void> {
  const sql = getConnection();

  await sql`
    UPDATE unsubscribe_history
    SET 
      status = ${status},
      failure_reason = COALESCE(${details?.failureReason ?? null}, failure_reason),
      failure_details = COALESCE(${details?.failureDetails ?? null}, failure_details),
      screenshot_path = COALESCE(${details?.screenshotPath ?? null}, screenshot_path),
      trace_path = COALESCE(${details?.tracePath ?? null}, trace_path),
      completed_at = ${status !== 'pending' ? new Date() : null}
    WHERE id = ${id}
  `;
}

export interface UnsubscribeStats {
  total: number;
  success: number;
  failed: number;
  uncertain: number;
  pending: number;
  successRate: number;
}

export async function getStats(): Promise<UnsubscribeStats> {
  const sql = getConnection();

  const rows = await sql<{ status: string; count: string }[]>`
    SELECT status, COUNT(*)::text as count
    FROM unsubscribe_history
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
      case 'success':
        stats.success = count;
        break;
      case 'failed':
        stats.failed = count;
        break;
      case 'uncertain':
        stats.uncertain = count;
        break;
      case 'pending':
        stats.pending = count;
        break;
    }
  }

  if (stats.total > 0) {
    stats.successRate = (stats.success / stats.total) * 100;
  }

  return stats;
}

export function getHistoryByDomain(domain: string): Promise<UnsubscribeAttempt[]> {
  const sql = getConnection();

  return sql<UnsubscribeAttempt[]>`
    SELECT id, email_id as "emailId", sender, sender_domain as "senderDomain",
           unsubscribe_url as "unsubscribeUrl", method, status,
           failure_reason as "failureReason", failure_details as "failureDetails",
           screenshot_path as "screenshotPath", trace_path as "tracePath",
           attempted_at as "attemptedAt", completed_at as "completedAt",
           retry_count as "retryCount"
    FROM unsubscribe_history
    WHERE sender_domain = ${domain}
    ORDER BY attempted_at DESC
  `;
}

export function getDomainStats(): Promise<{ domain: string; total: number; success: number; failed: number }[]> {
  const sql = getConnection();

  return sql`
    SELECT 
      sender_domain as domain,
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'success')::int as success,
      COUNT(*) FILTER (WHERE status = 'failed' OR status = 'uncertain')::int as failed
    FROM unsubscribe_history
    GROUP BY sender_domain
    ORDER BY total DESC
    LIMIT 50
  `;
}
