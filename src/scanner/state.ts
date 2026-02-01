// Scan state management

import { getConnection } from '../db/index.ts';

export interface ScanState {
  lastHistoryId: string | null;
  lastEmailId: string | null;
  lastScanAt: Date | null;
  emailsScanned: number;
  emailsProcessed: number;
  isInitialBacklogComplete: boolean;
}

export async function getScanState(): Promise<ScanState> {
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
    WHERE id = 1
  `;

  if (rows.length === 0) {
    throw new Error('Scan state not initialized');
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

export async function updateScanState(updates: Partial<ScanState>): Promise<void> {
  const sql = getConnection();

  await sql`
    UPDATE scan_state SET
      last_history_id = COALESCE(${updates.lastHistoryId ?? null}, last_history_id),
      last_email_id = COALESCE(${updates.lastEmailId ?? null}, last_email_id),
      last_scan_at = COALESCE(${updates.lastScanAt ?? null}, last_scan_at),
      emails_scanned = COALESCE(${updates.emailsScanned ?? null}, emails_scanned),
      emails_processed = COALESCE(${updates.emailsProcessed ?? null}, emails_processed),
      is_initial_backlog_complete = COALESCE(${updates.isInitialBacklogComplete ?? null}, is_initial_backlog_complete),
      updated_at = NOW()
    WHERE id = 1
  `;
}

export async function incrementScanStats(scanned: number, processed: number): Promise<void> {
  const sql = getConnection();

  await sql`
    UPDATE scan_state SET
      emails_scanned = emails_scanned + ${scanned},
      emails_processed = emails_processed + ${processed},
      last_scan_at = NOW(),
      updated_at = NOW()
    WHERE id = 1
  `;
}

// Processed emails tracking for idempotency

export async function isEmailProcessed(emailId: string): Promise<boolean> {
  const sql = getConnection();

  const rows = await sql<{ id: number }[]>`
    SELECT id FROM processed_emails WHERE email_id = ${emailId}
  `;

  return rows.length > 0;
}

export async function markEmailProcessed(emailId: string): Promise<void> {
  const sql = getConnection();

  await sql`
    INSERT INTO processed_emails (email_id)
    VALUES (${emailId})
    ON CONFLICT (email_id) DO NOTHING
  `;
}

export async function getProcessedEmailIds(emailIds: string[]): Promise<Set<string>> {
  if (emailIds.length === 0) {
    return new Set();
  }

  const sql = getConnection();

  const rows = await sql<{ email_id: string }[]>`
    SELECT email_id FROM processed_emails
    WHERE email_id = ANY(${emailIds})
  `;

  return new Set(rows.map((r) => r.email_id));
}
