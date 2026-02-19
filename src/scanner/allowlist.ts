// Allow list checking

import { getConnection } from "../db/index.ts";
import { extractDomain } from "./headers.ts";

export interface AllowListEntry {
  id: number;
  type: "email" | "domain";
  value: string;
  notes: string | null;
  createdAt: Date;
}

export async function isAllowed(email: string): Promise<boolean> {
  const sql = getConnection();
  const normalizedEmail = email.toLowerCase().trim();
  const domain = extractDomain(normalizedEmail);

  // Check for exact email match or domain match
  const rows = await sql<{ id: number }[]>`
    SELECT id FROM allow_list
    WHERE (type = 'email' AND value = ${normalizedEmail})
       OR (type = 'domain' AND value = ${domain})
    LIMIT 1
  `;

  return rows.length > 0;
}

export async function addToAllowList(
  type: "email" | "domain",
  value: string,
  notes?: string,
): Promise<AllowListEntry> {
  const sql = getConnection();
  const normalizedValue = value.toLowerCase().trim();

  const rows = await sql<AllowListEntry[]>`
    INSERT INTO allow_list (type, value, notes)
    VALUES (${type}, ${normalizedValue}, ${notes ?? null})
    ON CONFLICT (type, value) DO UPDATE SET
      notes = COALESCE(EXCLUDED.notes, allow_list.notes)
    RETURNING id, type, value, notes, created_at as "createdAt"
  `;

  return rows[0];
}

export async function removeFromAllowList(id: number): Promise<boolean> {
  const sql = getConnection();

  const result = await sql`
    DELETE FROM allow_list WHERE id = ${id}
  `;

  return result.count > 0;
}

export function getAllowList(): Promise<AllowListEntry[]> {
  const sql = getConnection();

  return sql<AllowListEntry[]>`
    SELECT id, type, value, notes, created_at as "createdAt"
    FROM allow_list
    ORDER BY type, value
  `;
}

export async function findInAllowList(
  value: string,
): Promise<AllowListEntry | null> {
  const sql = getConnection();
  const normalizedValue = value.toLowerCase().trim();

  const rows = await sql<AllowListEntry[]>`
    SELECT id, type, value, notes, created_at as "createdAt"
    FROM allow_list
    WHERE value = ${normalizedValue}
  `;

  return rows[0] ?? null;
}
