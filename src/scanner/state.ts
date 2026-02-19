// Scan state management

import { getConnection } from "../db/index.ts";

export interface ScanState {
  lastHistoryId: string | null;
  lastEmailId: string | null;
  lastScanAt: Date | null;
  emailsScanned: number;
  emailsProcessed: number;
  isInitialBacklogComplete: boolean;
}

export async function getScanState(userId: string): Promise<ScanState> {
  const sql = getConnection();

  const rows = await sql<
    {
      last_history_id: string | null;
      last_email_id: string | null;
      last_scan_at: Date | null;
      emails_scanned: number;
      emails_processed: number;
      is_initial_backlog_complete: boolean;
    }[]
  >`
    SELECT last_history_id, last_email_id, last_scan_at,
           emails_scanned, emails_processed, is_initial_backlog_complete
    FROM scan_state
    WHERE user_id = ${userId}::uuid
  `;

  if (rows.length === 0) {
    // Initialize state for new user
    await sql`
      INSERT INTO scan_state (user_id)
      VALUES (${userId}::uuid)
    `;
    return {
      lastHistoryId: null,
      lastEmailId: null,
      lastScanAt: null,
      emailsScanned: 0,
      emailsProcessed: 0,
      isInitialBacklogComplete: false,
    };
  }

  const row = rows[0];
  return {
    lastHistoryId: row.last_history_id,
    lastEmailId: row.last_email_id,
    lastScanAt: row.last_scan_at,
    emailsScanned: row.emails_scanned,
    emailsProcessed: row.emails_processed,
    isInitialBacklogComplete: row.is_initial_backlog_complete,
  };
}

export async function updateScanState(
  userId: string,
  updates: Partial<ScanState>,
): Promise<void> {
  const sql = getConnection();

  await sql`
    INSERT INTO scan_state (user_id)
    VALUES (${userId}::uuid)
    ON CONFLICT (user_id) DO UPDATE SET
      last_history_id = COALESCE(${
    updates.lastHistoryId ?? null
  }, scan_state.last_history_id),
      last_email_id = COALESCE(${
    updates.lastEmailId ?? null
  }, scan_state.last_email_id),
      last_scan_at = COALESCE(${
    updates.lastScanAt ?? null
  }, scan_state.last_scan_at),
      emails_scanned = COALESCE(${
    updates.emailsScanned ?? null
  }, scan_state.emails_scanned),
      emails_processed = COALESCE(${
    updates.emailsProcessed ?? null
  }, scan_state.emails_processed),
      is_initial_backlog_complete = COALESCE(${
    updates.isInitialBacklogComplete ?? null
  }, scan_state.is_initial_backlog_complete),
      updated_at = NOW()
  `;
}

export async function incrementScanStats(
  userId: string,
  scanned: number,
  processed: number,
): Promise<void> {
  const sql = getConnection();

  await sql`
    UPDATE scan_state SET
      emails_scanned = emails_scanned + ${scanned},
      emails_processed = emails_processed + ${processed},
      last_scan_at = NOW(),
      updated_at = NOW()
    WHERE user_id = ${userId}::uuid
  `;
}

// Processed emails tracking for idempotency

export async function isEmailProcessed(
  userId: string,
  emailId: string,
): Promise<boolean> {
  const sql = getConnection();

  const rows = await sql<{ id: number }[]>`
    SELECT id FROM processed_emails
    WHERE user_id = ${userId}::uuid AND email_id = ${emailId}
  `;

  return rows.length > 0;
}

export async function markEmailProcessed(
  userId: string,
  emailId: string,
): Promise<void> {
  const sql = getConnection();

  await sql`
    INSERT INTO processed_emails (user_id, email_id)
    VALUES (${userId}::uuid, ${emailId})
    ON CONFLICT (user_id, email_id) DO NOTHING
  `;
}

export async function getProcessedEmailIds(
  userId: string,
  emailIds: string[],
): Promise<Set<string>> {
  if (emailIds.length === 0) {
    return new Set();
  }

  const sql = getConnection();

  const rows = await sql<{ email_id: string }[]>`
    SELECT email_id FROM processed_emails
    WHERE user_id = ${userId}::uuid AND email_id = ANY(${emailIds})
  `;

  return new Set(rows.map((r) => r.email_id));
}
