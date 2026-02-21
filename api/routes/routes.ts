// API Routes for the web dashboard

import { type Context, Hono } from "hono";
import {
  addToAllowList,
  decodeHtmlEntities,
  getAllowList,
  removeFromAllowList,
} from "../scanner/index.ts";
import {
  getScanProgress,
  isScanInProgress,
  scanEmails,
} from "../scanner/scanner.ts";
import {
  clearIneffectiveFlag,
  getIneffectiveSenders,
} from "../scanner/tracking.ts";
import {
  logAllowlistAdd,
  logAllowlistRemove,
  logPatternExported,
  logPatternImported,
} from "../tracker/audit.ts";
import {
  type FailureReason,
  getDomainStats,
  getFailedAttempts,
  getHistoryByDomain,
  getRecentAttempts,
  getStats,
  getUnsubscribeAttempt,
  getUnsubscribeLogs,
  incrementRetryCount,
  markAsResolved,
  updateAttemptStatus,
} from "../tracker/index.ts";
import type { AppEnv } from "../types.ts";
import {
  exportPatterns,
  getPatterns,
  importPatterns,
  type PatternExport,
  type PatternType,
  performBrowserUnsubscribe,
  performMailtoUnsubscribe,
  performOneClickUnsubscribe,
} from "../unsubscribe/index.ts";

export const api = new Hono<AppEnv>();

// Global error handler for API routes
api.onError((err, c) => {
  console.error("API error:", err.message);
  if (err.message === "User not authenticated") {
    return c.json({ error: "Not authenticated" }, 401);
  }
  return c.json({ error: "Internal server error" }, 500);
});

// Helper to get user ID from context
function getUserId(c: Context<AppEnv>): string {
  const user = c.get("user");
  if (!user?.userId) {
    throw new Error("User not authenticated");
  }
  return user.userId;
}

// Stats endpoint
api.get("/stats", async (c) => {
  const userId = getUserId(c);
  const stats = await getStats(userId);
  return c.json(stats);
});

// Recent activity endpoint
api.get("/recent", async (c) => {
  const userId = getUserId(c);
  const limit = parseInt(c.req.query("limit") || "20");
  const recent = await getRecentAttempts(userId, limit);
  return c.json(recent);
});

// Unsubscribe logs - aggregated by domain with followup tracking
api.get("/unsubscribe-logs", async (c) => {
  const userId = getUserId(c);
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");
  const logs = await getUnsubscribeLogs(userId, limit, offset);
  return c.json(logs);
});

// Failed unsubscribes list
api.get("/failed", async (c) => {
  const userId = getUserId(c);
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");
  const failed = await getFailedAttempts(userId, limit, offset);
  return c.json(failed);
});

// Single failure details
api.get("/failed/:id", async (c) => {
  const userId = getUserId(c);
  const id = parseInt(c.req.param("id"));
  const attempt = await getUnsubscribeAttempt(userId, id);

  if (!attempt) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(attempt);
});

// Download trace file
api.get("/failed/:id/trace", async (c) => {
  const userId = getUserId(c);
  const id = parseInt(c.req.param("id"));
  const attempt = await getUnsubscribeAttempt(userId, id);

  if (!attempt || !attempt.tracePath) {
    return c.json({ error: "Trace not found" }, 404);
  }

  try {
    const file = await Deno.readFile(attempt.tracePath);
    return new Response(file, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="trace-${id}.zip"`,
      },
    });
  } catch {
    return c.json({ error: "Trace file not accessible" }, 404);
  }
});

// Retry unsubscribe
api.post("/failed/:id/retry", async (c) => {
  const userId = getUserId(c);
  const id = parseInt(c.req.param("id"));
  const attempt = await getUnsubscribeAttempt(userId, id);

  if (!attempt) {
    return c.json({ error: "Not found" }, 404);
  }

  if (!attempt.unsubscribeUrl) {
    return c.json({ error: "No unsubscribe URL available" }, 400);
  }

  // Decode HTML entities in URL (fixes old stored URLs with &amp; etc.)
  const unsubscribeUrl = decodeHtmlEntities(attempt.unsubscribeUrl);

  await incrementRetryCount(userId, id);

  try {
    // Perform the unsubscribe based on method
    // Use unique retry ID for traces to avoid overwriting
    const retryTraceId = `${attempt.emailId}-retry-${Date.now()}`;
    let result: {
      success: boolean;
      error?: string;
      uncertain?: boolean;
      screenshotPath?: string;
      tracePath?: string;
    };

    switch (attempt.method) {
      case "one_click":
        result = await performOneClickUnsubscribe(unsubscribeUrl);
        break;
      case "mailto":
        result = await performMailtoUnsubscribe(userId, unsubscribeUrl);
        break;
      case "browser":
      default:
        result = await performBrowserUnsubscribe(unsubscribeUrl, retryTraceId);
        break;
    }

    // Determine status from result
    const status = result.success
      ? "success"
      : result.uncertain
      ? "uncertain"
      : "failed";

    // Map error string to FailureReason
    let failureReason: FailureReason | undefined;
    if (result.error) {
      const err = result.error.toLowerCase();
      if (err.includes("timeout")) failureReason = "timeout";
      else if (err.includes("captcha")) failureReason = "captcha_detected";
      else if (err.includes("login")) failureReason = "login_required";
      else if (err.includes("navigation") || err.includes("navigate")) {
        failureReason = "navigation_error";
      } else if (err.includes("button") || err.includes("form")) {
        failureReason = "form_error";
      } else if (err.includes("network") || err.includes("http")) {
        failureReason = "network_error";
      } else if (err.includes("invalid") || err.includes("url")) {
        failureReason = "invalid_url";
      } else failureReason = "unknown";
    }

    // Update the original record instead of creating a new one
    await updateAttemptStatus(userId, id, status, {
      failureReason,
      failureDetails: result.error,
      screenshotPath: result.screenshotPath,
      tracePath: result.tracePath,
    });

    return c.json({ success: result.success, status });
  } catch (err) {
    // Unexpected error - update status to failed so it doesn't stay pending
    const message = err instanceof Error ? err.message : "Unknown error";
    await updateAttemptStatus(userId, id, "failed", {
      failureReason: "unknown",
      failureDetails: message,
    });
    return c.json({ success: false, status: "failed", error: message });
  }
});

// Mark as resolved
api.post("/failed/:id/resolve", async (c) => {
  const userId = getUserId(c);
  const id = parseInt(c.req.param("id"));
  const attempt = await getUnsubscribeAttempt(userId, id);

  if (!attempt) {
    return c.json({ error: "Not found" }, 404);
  }

  await markAsResolved(userId, id);

  return c.json({ success: true });
});

// Allow list endpoints
api.get("/allowlist", async (c) => {
  const userId = getUserId(c);
  const list = await getAllowList(userId);
  return c.json(list);
});

api.post("/allowlist", async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();
  const { type, value, notes } = body;

  if (!type || !value) {
    return c.json({ error: "type and value are required" }, 400);
  }

  if (type !== "email" && type !== "domain") {
    return c.json({ error: "type must be email or domain" }, 400);
  }

  const entry = await addToAllowList(userId, type, value, notes);
  await logAllowlistAdd(type, value, c.req.header("X-Forwarded-For"));

  return c.json(entry, 201);
});

api.delete("/allowlist/:id", async (c) => {
  const userId = getUserId(c);
  const id = parseInt(c.req.param("id"));
  const entry = await getAllowList(userId).then((list) =>
    list.find((e) => e.id === id)
  );

  if (!entry) {
    return c.json({ error: "Not found" }, 404);
  }

  const removed = await removeFromAllowList(userId, id);

  if (removed) {
    await logAllowlistRemove(
      entry.type,
      entry.value,
      c.req.header("X-Forwarded-For"),
    );
  }

  return c.json({ success: removed });
});

// Domain grouping endpoints
api.get("/domains", async (c) => {
  const userId = getUserId(c);
  const stats = await getDomainStats(userId);
  return c.json(stats);
});

api.get("/domains/:domain", async (c) => {
  const userId = getUserId(c);
  const domain = c.req.param("domain");
  const history = await getHistoryByDomain(userId, domain);
  return c.json(history);
});

// Pattern endpoints
api.get("/patterns", async (c) => {
  const type = c.req.query("type") as PatternType | undefined;
  const patterns = await getPatterns(type);
  return c.json(patterns);
});

api.get("/patterns/export", async (_c) => {
  const exported = await exportPatterns();
  await logPatternExported(exported.patterns.length);

  return new Response(JSON.stringify(exported, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="patterns.json"',
    },
  });
});

api.post("/patterns/import", async (c) => {
  const body = (await c.req.json()) as PatternExport;

  if (!body.patterns || !Array.isArray(body.patterns)) {
    return c.json({ error: "Invalid pattern export format" }, 400);
  }

  const imported = await importPatterns(body);
  await logPatternImported(imported);

  return c.json({ success: true, imported });
});

// Ineffective unsubscribes
api.get("/ineffective", async (c) => {
  const userId = getUserId(c);
  const senders = await getIneffectiveSenders(userId);
  return c.json(senders);
});

api.post("/ineffective/:sender/clear", async (c) => {
  const userId = getUserId(c);
  const sender = c.req.param("sender");
  await clearIneffectiveFlag(userId, decodeURIComponent(sender));
  return c.json({ success: true });
});

// Weekly digest data (placeholder)
api.get("/digest", async (c) => {
  const userId = getUserId(c);
  const stats = await getStats(userId);
  const recent = await getRecentAttempts(userId, 10);
  const failed = await getFailedAttempts(userId, 5);
  const ineffective = await getIneffectiveSenders(userId);

  return c.json({
    stats,
    recentActivity: recent,
    recentFailures: failed,
    ineffectiveSenders: ineffective.slice(0, 5),
  });
});

// Unsubscribe history with filtering
api.get("/history", async (c) => {
  const userId = getUserId(c);
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");
  const status = c.req.query("status");
  const domain = c.req.query("domain");

  // For now, use the existing functions
  // In a real implementation, you'd add more filtering to the SQL
  if (domain) {
    const history = await getHistoryByDomain(userId, domain);
    return c.json(history.slice(offset, offset + limit));
  }

  if (status === "failed" || status === "uncertain") {
    const failed = await getFailedAttempts(userId, limit, offset);
    return c.json(failed);
  }

  const recent = await getRecentAttempts(userId, limit);
  return c.json(recent);
});

// Health check endpoint with metrics
api.get("/health", (c) => {
  // Health check doesn't require authentication - use a dummy user for stats
  const startTime = Date.now();
  const responseTime = Date.now() - startTime;

  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    uptime: Math.floor(performance.now() / 1000),
    metrics: {
      responseTimeMs: responseTime,
    },
  });
});

// Readiness check (for Kubernetes/container orchestration)
api.get("/ready", async (_c) => {
  try {
    // Check database connectivity - just verify we can run a query
    const { getConnection } = await import("../db/connection.ts");
    const sql = getConnection();
    await sql`SELECT 1`;
    return _c.json({ ready: true });
  } catch {
    return _c.json({ ready: false, error: "Database unavailable" }, 503);
  }
});

// Liveness check
api.get("/live", (c) => {
  return c.json({ alive: true });
});

// Scanner endpoints
api.get("/scan/status", (c) => {
  const userId = getUserId(c);
  const progress = getScanProgress(userId);
  if (progress) {
    return c.json(progress);
  }
  return c.json({ inProgress: false });
});

api.post("/scan", (c) => {
  const userId = getUserId(c);
  if (isScanInProgress(userId)) {
    return c.json({ error: "Scan already in progress" }, 409);
  }

  // Run scan in background, don't block response
  scanEmails(userId)
    .then((result) => {
      console.log(
        `[Scan] Completed for user ${userId}: ${result.scanned} scanned, ${result.processed} processed`,
      );
    })
    .catch((err) => {
      console.error(`[Scan] Failed for user ${userId}:`, err);
    });

  return c.json({ success: true, message: "Scan started" });
});
