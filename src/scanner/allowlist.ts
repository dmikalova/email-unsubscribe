// Allow list checking

import { getConnection } from '../db/index.ts';
import { extractDomain } from './headers.ts';

export interface AllowListEntry {
  id: number;
  type: 'email' | 'domain';
  value: string;
  notes: string | null;
  createdAt: Date;
}

export async function isAllowed(userId: string, email: string): Promise<boolean> {
  const sql = getConnection();
  const normalizedEmail = email.toLowerCase().trim();
  const domain = extractDomain(normalizedEmail);

  // Check for exact email match or domain match
  const rows = await sql<{ id: number }[]>`
    SELECT id FROM allow_list
    WHERE user_id = ${userId}::uuid
      AND ((type = 'email' AND value = ${normalizedEmail})
        OR (type = 'domain' AND value = ${domain}))
    LIMIT 1
  `;

  return rows.length > 0;
}

export async function addToAllowList(
  userId: string,
  type: 'email' | 'domain',
  value: string,
  notes?: string,
): Promise<AllowListEntry> {
  const sql = getConnection();
  const normalizedValue = value.toLowerCase().trim();

  const rows = await sql<AllowListEntry[]>`
    INSERT INTO allow_list (user_id, type, value, notes)
    VALUES (${userId}::uuid, ${type}, ${normalizedValue}, ${notes ?? null})
    ON CONFLICT (user_id, type, value) DO UPDATE SET
      notes = COALESCE(EXCLUDED.notes, allow_list.notes)
    RETURNING id, type, value, notes, created_at as "createdAt"
  `;

  return rows[0];
}

export async function removeFromAllowList(userId: string, id: number): Promise<boolean> {
  const sql = getConnection();

  const result = await sql`
    DELETE FROM allow_list WHERE user_id = ${userId}::uuid AND id = ${id}
  `;

  return result.count > 0;
}

export function getAllowList(userId: string): Promise<AllowListEntry[]> {
  const sql = getConnection();

  return sql<AllowListEntry[]>`
    SELECT id, type, value, notes, created_at as "createdAt"
    FROM allow_list
    WHERE user_id = ${userId}::uuid
    ORDER BY type, value
  `;
}

export async function findInAllowList(
  userId: string,
  value: string,
): Promise<AllowListEntry | null> {
  const sql = getConnection();
  const normalizedValue = value.toLowerCase().trim();

  const rows = await sql<AllowListEntry[]>`
    SELECT id, type, value, notes, created_at as "createdAt"
    FROM allow_list
    WHERE user_id = ${userId}::uuid AND value = ${normalizedValue}
  `;

  return rows[0] ?? null;
}
