// User data management - deletion and export

import { getConnection } from './connection.ts';

/**
 * Delete all data for a specific user across all tables.
 * This is a GDPR-compliant data deletion that removes:
 * - OAuth tokens
 * - Scan state
 * - Processed emails
 * - Sender tracking data
 * - Allow list entries
 * - Unsubscribe history
 * - Audit logs
 *
 * Note: Does not delete oauth_audit_log entries to maintain compliance audit trail.
 */
export async function deleteAllUserData(userId: string): Promise<{
  deletedTables: string[];
  rowsDeleted: Record<string, number>;
}> {
  const sql = getConnection();
  const rowsDeleted: Record<string, number> = {};
  const deletedTables: string[] = [];

  // Delete in order respecting foreign key constraints
  const tables = [
    'oauth_tokens',
    'scan_state',
    'processed_emails',
    'sender_tracking',
    'allow_list',
    'unsubscribe_history',
    'audit_log',
  ];

  for (const table of tables) {
    const result = await sql.unsafe(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
    const count = result.count;
    if (count > 0) {
      rowsDeleted[table] = count;
      deletedTables.push(table);
    }
  }

  return { deletedTables, rowsDeleted };
}

/**
 * Export all user data for GDPR data portability.
 */
export async function exportAllUserData(userId: string): Promise<{
  unsubscribeHistory: unknown[];
  allowList: unknown[];
  senderTracking: unknown[];
  processedEmails: number;
}> {
  const sql = getConnection();

  const [history, allowList, tracking, processedCount] = await Promise.all([
    sql`
      SELECT email_id, sender, sender_domain, unsubscribe_url, method, status,
             failure_reason, attempted_at, completed_at
      FROM unsubscribe_history
      WHERE user_id = ${userId}::uuid
      ORDER BY attempted_at DESC
    `,
    sql`
      SELECT type, value, notes, created_at
      FROM allow_list
      WHERE user_id = ${userId}::uuid
      ORDER BY created_at DESC
    `,
    sql`
      SELECT sender, sender_domain, seen_count, unsubscribed_at
      FROM sender_tracking
      WHERE user_id = ${userId}::uuid
      ORDER BY seen_count DESC
    `,
    sql<{ count: string }[]>`
      SELECT COUNT(*)::text as count
      FROM processed_emails
      WHERE user_id = ${userId}::uuid
    `,
  ]);

  return {
    unsubscribeHistory: history,
    allowList: allowList,
    senderTracking: tracking,
    processedEmails: parseInt(processedCount[0]?.count || '0'),
  };
}
