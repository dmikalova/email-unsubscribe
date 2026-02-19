// Pattern management for unsubscribe automation

import { getConnection } from "../db/index.ts";

export type PatternType =
  | "button_selector"
  | "form_selector"
  | "success_text"
  | "error_text"
  | "preference_center";

export interface Pattern {
  id: number;
  name: string;
  type: PatternType;
  selector: string;
  priority: number;
  matchCount: number;
  lastMatchedAt: Date | null;
  isBuiltin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatternInput {
  name: string;
  type: PatternType;
  selector: string;
  priority?: number;
}

// Default patterns to seed the database
export const DEFAULT_PATTERNS: PatternInput[] = [
  // Button selectors
  {
    name: "Unsubscribe button",
    type: "button_selector",
    selector: 'button:has-text("unsubscribe")',
    priority: 10,
  },
  {
    name: "Unsubscribe link",
    type: "button_selector",
    selector: 'a:has-text("unsubscribe")',
    priority: 9,
  },
  {
    name: "Opt-out button",
    type: "button_selector",
    selector: 'button:has-text("opt out")',
    priority: 8,
  },
  {
    name: "Remove me button",
    type: "button_selector",
    selector: 'button:has-text("remove me")',
    priority: 7,
  },
  {
    name: "Confirm unsubscribe",
    type: "button_selector",
    selector: 'button:has-text("confirm")',
    priority: 6,
  },
  {
    name: "Yes button",
    type: "button_selector",
    selector: 'button:has-text("yes")',
    priority: 5,
  },
  {
    name: "Submit input",
    type: "button_selector",
    selector: 'input[type="submit"]',
    priority: 4,
  },

  // Success text patterns
  {
    name: "Successfully unsubscribed",
    type: "success_text",
    selector: "successfully unsubscribed",
    priority: 10,
  },
  {
    name: "You have been unsubscribed",
    type: "success_text",
    selector: "you have been unsubscribed",
    priority: 10,
  },
  {
    name: "Unsubscribe successful",
    type: "success_text",
    selector: "unsubscribe successful",
    priority: 10,
  },
  {
    name: "Removed from mailing list",
    type: "success_text",
    selector: "removed from our mailing list",
    priority: 9,
  },
  {
    name: "No longer receive",
    type: "success_text",
    selector: "will no longer receive",
    priority: 8,
  },
  {
    name: "Preferences updated",
    type: "success_text",
    selector: "preferences updated",
    priority: 7,
  },

  // Error text patterns
  {
    name: "Link expired",
    type: "error_text",
    selector: "link has expired",
    priority: 10,
  },
  {
    name: "Error occurred",
    type: "error_text",
    selector: "error occurred",
    priority: 9,
  },
  {
    name: "Something went wrong",
    type: "error_text",
    selector: "something went wrong",
    priority: 9,
  },
  {
    name: "Invalid request",
    type: "error_text",
    selector: "invalid request",
    priority: 8,
  },
  {
    name: "Try again",
    type: "error_text",
    selector: "please try again",
    priority: 7,
  },
];

export async function seedDefaultPatterns(): Promise<void> {
  const sql = getConnection();

  // Use a transaction to ensure search_path persists (required for Supavisor transaction pooler)
  await sql.begin(async (tx) => {
    await tx.unsafe(`SET search_path TO email_unsubscribe, public`);

    for (const pattern of DEFAULT_PATTERNS) {
      await tx.unsafe(
        `INSERT INTO patterns (name, type, selector, priority, is_builtin)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (name, type) DO NOTHING`,
        [pattern.name, pattern.type, pattern.selector, pattern.priority ?? 0],
      );
    }
  });

  console.log("Default patterns seeded");
}

export function getPatterns(type?: PatternType): Promise<Pattern[]> {
  const sql = getConnection();

  if (type) {
    return sql<Pattern[]>`
      SELECT id, name, type, selector, priority,
             match_count as "matchCount",
             last_matched_at as "lastMatchedAt",
             is_builtin as "isBuiltin",
             created_at as "createdAt",
             updated_at as "updatedAt"
      FROM patterns
      WHERE type = ${type}
      ORDER BY priority DESC, match_count DESC
    `;
  }

  return sql<Pattern[]>`
    SELECT id, name, type, selector, priority,
           match_count as "matchCount",
           last_matched_at as "lastMatchedAt",
           is_builtin as "isBuiltin",
           created_at as "createdAt",
           updated_at as "updatedAt"
    FROM patterns
    ORDER BY type, priority DESC, match_count DESC
  `;
}

export async function addPattern(input: PatternInput): Promise<Pattern> {
  const sql = getConnection();

  const rows = await sql<Pattern[]>`
    INSERT INTO patterns (name, type, selector, priority)
    VALUES (${input.name}, ${input.type}, ${input.selector}, ${
    input.priority ?? 0
  })
    RETURNING id, name, type, selector, priority,
              match_count as "matchCount",
              last_matched_at as "lastMatchedAt",
              is_builtin as "isBuiltin",
              created_at as "createdAt",
              updated_at as "updatedAt"
  `;

  return rows[0];
}

export async function deletePattern(id: number): Promise<boolean> {
  const sql = getConnection();

  // Don't delete built-in patterns
  const result = await sql`
    DELETE FROM patterns
    WHERE id = ${id} AND is_builtin = FALSE
  `;

  return result.count > 0;
}

export async function incrementPatternMatchCount(id: number): Promise<void> {
  const sql = getConnection();

  await sql`
    UPDATE patterns SET
      match_count = match_count + 1,
      last_matched_at = NOW(),
      updated_at = NOW()
    WHERE id = ${id}
  `;
}

export interface PatternExport {
  version: string;
  exportedAt: string;
  patterns: Omit<PatternInput, "priority">[];
}

export async function exportPatterns(): Promise<PatternExport> {
  const patterns = await getPatterns();

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    patterns: patterns
      .filter((p) => !p.isBuiltin) // Only export custom patterns
      .map((p) => ({
        name: p.name,
        type: p.type,
        selector: p.selector,
      })),
  };
}

export async function importPatterns(data: PatternExport): Promise<number> {
  let imported = 0;

  for (const pattern of data.patterns) {
    try {
      await addPattern({
        name: pattern.name,
        type: pattern.type,
        selector: pattern.selector,
      });
      imported++;
    } catch {
      // Pattern already exists, skip
      continue;
    }
  }

  return imported;
}
