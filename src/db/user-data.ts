// User data management - deletion and export

import { withDb } from "./connection.ts";

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
export function deleteAllUserData(userId: string): Promise<{
  deletedTables: string[];
  rowsDeleted: Record<string, number>;
}> {
  return withDb(async (sql) => {
    const rowsDeleted: Record<string, number> = {};
    const deletedTables: string[] = [];

    // Delete in order respecting foreign key constraints
    const deletes = [
      sql`DELETE FROM oauth_tokens WHERE user_id = ${userId}::uuid`,
      sql`DELETE FROM scan_state WHERE user_id = ${userId}::uuid`,
      sql`DELETE FROM processed_emails WHERE user_id = ${userId}::uuid`,
      sql`DELETE FROM sender_tracking WHERE user_id = ${userId}::uuid`,
      sql`DELETE FROM allow_list WHERE user_id = ${userId}::uuid`,
      sql`DELETE FROM unsubscribe_history WHERE user_id = ${userId}::uuid`,
      sql`DELETE FROM audit_log WHERE user_id = ${userId}::uuid`,
    ];

    const tables = [
      "oauth_tokens",
      "scan_state",
      "processed_emails",
      "sender_tracking",
      "allow_list",
      "unsubscribe_history",
      "audit_log",
    ];

    for (let i = 0; i < deletes.length; i++) {
      const result = await deletes[i];
      const count = result.count;
      if (count > 0) {
        rowsDeleted[tables[i]] = count;
        deletedTables.push(tables[i]);
      }
    }

    return { deletedTables, rowsDeleted };
  });
}

/**
 * Export all user data for GDPR data portability.
 */
export function exportAllUserData(userId: string): Promise<{
  unsubscribeHistory: unknown[];
  allowList: unknown[];
  senderTracking: unknown[];
  processedEmails: number;
}> {
  return withDb(async (sql) => {
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
      processedEmails: parseInt(processedCount[0]?.count || "0"),
    };
  });
}
