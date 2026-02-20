// Sender tracking for ineffective unsubscribe detection

import { withDb } from "../db/index.ts";
import { extractDomain } from "./headers.ts";

export interface SenderTracking {
  id: number;
  sender: string;
  senderDomain: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  emailCount: number;
  unsubscribedAt: Date | null;
  emailsAfterUnsubscribe: number;
  lastEmailAfterUnsubscribeAt: Date | null;
  flaggedIneffective: boolean;
  flaggedAt: Date | null;
}

const GRACE_PERIOD_HOURS = 24;

export async function trackSender(
  userId: string,
  sender: string,
): Promise<SenderTracking> {
  const normalizedSender = sender.toLowerCase().trim();
  const domain = extractDomain(normalizedSender);

  // Check if sender was previously unsubscribed
  const existing = await getSenderTracking(userId, normalizedSender);

  if (existing?.unsubscribedAt) {
    // Check if we're past the grace period
    const gracePeriodEnd = new Date(
      existing.unsubscribedAt.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000,
    );

    if (new Date() > gracePeriodEnd) {
      // This is an email after the grace period - flag as ineffective
      return withDb(async (sql) => {
        const rows = await sql<SenderTracking[]>`
          UPDATE sender_tracking SET
            last_seen_at = NOW(),
            email_count = email_count + 1,
            emails_after_unsubscribe = emails_after_unsubscribe + 1,
            last_email_after_unsubscribe_at = NOW(),
            flagged_ineffective = TRUE,
            flagged_at = COALESCE(flagged_at, NOW())
          WHERE user_id = ${userId}::uuid AND sender = ${normalizedSender}
          RETURNING id, sender, sender_domain as "senderDomain",
                    first_seen_at as "firstSeenAt", last_seen_at as "lastSeenAt",
                    email_count as "emailCount", unsubscribed_at as "unsubscribedAt",
                    emails_after_unsubscribe as "emailsAfterUnsubscribe",
                    last_email_after_unsubscribe_at as "lastEmailAfterUnsubscribeAt",
                    flagged_ineffective as "flaggedIneffective", flagged_at as "flaggedAt"
        `;
        return rows[0];
      });
    }
  }

  // Normal tracking - upsert sender record
  return withDb(async (sql) => {
    const rows = await sql<SenderTracking[]>`
      INSERT INTO sender_tracking (user_id, sender, sender_domain)
      VALUES (${userId}::uuid, ${normalizedSender}, ${domain})
      ON CONFLICT (user_id, sender) DO UPDATE SET
        last_seen_at = NOW(),
        email_count = sender_tracking.email_count + 1
      RETURNING id, sender, sender_domain as "senderDomain",
                first_seen_at as "firstSeenAt", last_seen_at as "lastSeenAt",
                email_count as "emailCount", unsubscribed_at as "unsubscribedAt",
                emails_after_unsubscribe as "emailsAfterUnsubscribe",
                last_email_after_unsubscribe_at as "lastEmailAfterUnsubscribeAt",
                flagged_ineffective as "flaggedIneffective", flagged_at as "flaggedAt"
    `;

    return rows[0];
  });
}

export function getSenderTracking(
  userId: string,
  sender: string,
): Promise<SenderTracking | null> {
  const normalizedSender = sender.toLowerCase().trim();

  return withDb(async (sql) => {
    const rows = await sql<SenderTracking[]>`
      SELECT id, sender, sender_domain as "senderDomain",
             first_seen_at as "firstSeenAt", last_seen_at as "lastSeenAt",
             email_count as "emailCount", unsubscribed_at as "unsubscribedAt",
             emails_after_unsubscribe as "emailsAfterUnsubscribe",
             last_email_after_unsubscribe_at as "lastEmailAfterUnsubscribeAt",
             flagged_ineffective as "flaggedIneffective", flagged_at as "flaggedAt"
      FROM sender_tracking
      WHERE user_id = ${userId}::uuid AND sender = ${normalizedSender}
    `;

    return rows[0] ?? null;
  });
}

export function markSenderUnsubscribed(
  userId: string,
  sender: string,
): Promise<void> {
  const normalizedSender = sender.toLowerCase().trim();
  const domain = extractDomain(normalizedSender);

  return withDb(async (sql) => {
    await sql`
      INSERT INTO sender_tracking (user_id, sender, sender_domain, unsubscribed_at)
      VALUES (${userId}::uuid, ${normalizedSender}, ${domain}, NOW())
      ON CONFLICT (user_id, sender) DO UPDATE SET
        unsubscribed_at = NOW(),
        emails_after_unsubscribe = 0,
        flagged_ineffective = FALSE,
        flagged_at = NULL
    `;
  });
}

export function getIneffectiveSenders(
  userId: string,
): Promise<SenderTracking[]> {
  return withDb((sql) => {
    return sql<SenderTracking[]>`
      SELECT id, sender, sender_domain as "senderDomain",
             first_seen_at as "firstSeenAt", last_seen_at as "lastSeenAt",
             email_count as "emailCount", unsubscribed_at as "unsubscribedAt",
             emails_after_unsubscribe as "emailsAfterUnsubscribe",
             last_email_after_unsubscribe_at as "lastEmailAfterUnsubscribeAt",
             flagged_ineffective as "flaggedIneffective", flagged_at as "flaggedAt"
      FROM sender_tracking
      WHERE user_id = ${userId}::uuid AND flagged_ineffective = TRUE
      ORDER BY flagged_at DESC
    `;
  });
}

export function clearIneffectiveFlag(
  userId: string,
  sender: string,
): Promise<void> {
  const normalizedSender = sender.toLowerCase().trim();

  return withDb(async (sql) => {
    await sql`
      UPDATE sender_tracking SET
        flagged_ineffective = FALSE,
        flagged_at = NULL,
        emails_after_unsubscribe = 0
      WHERE user_id = ${userId}::uuid AND sender = ${normalizedSender}
    `;
  });
}
