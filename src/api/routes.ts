// API Routes for the web dashboard

import { Hono } from "hono";
import {
  addToAllowList,
  getAllowList,
  removeFromAllowList,
} from "../scanner/index.ts";
import { isScanInProgress, scanEmails } from "../scanner/scanner.ts";
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
  getDomainStats,
  getFailedAttempts,
  getHistoryByDomain,
  getRecentAttempts,
  getStats,
  getUnsubscribeAttempt,
  incrementRetryCount,
  markAsResolved,
} from "../tracker/index.ts";
import {
  exportPatterns,
  getPatterns,
  importPatterns,
  type PatternExport,
  type PatternType,
} from "../unsubscribe/index.ts";

export const api = new Hono();

// Stats endpoint
api.get("/stats", async (c) => {
  const stats = await getStats();
  return c.json(stats);
});

// Recent activity endpoint
api.get("/recent", async (c) => {
  const limit = parseInt(c.req.query("limit") || "20");
  const recent = await getRecentAttempts(limit);
  return c.json(recent);
});

// Failed unsubscribes list
api.get("/failed", async (c) => {
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");
  const failed = await getFailedAttempts(limit, offset);
  return c.json(failed);
});

// Single failure details
api.get("/failed/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const attempt = await getUnsubscribeAttempt(id);

  if (!attempt) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(attempt);
});

// Download trace file
api.get("/failed/:id/trace", async (c) => {
  const id = parseInt(c.req.param("id"));
  const attempt = await getUnsubscribeAttempt(id);

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
  const id = parseInt(c.req.param("id"));
  const attempt = await getUnsubscribeAttempt(id);

  if (!attempt) {
    return c.json({ error: "Not found" }, 404);
  }

  const retryCount = await incrementRetryCount(id);

  // TODO: Queue the retry job

  return c.json({ success: true, retryCount });
});

// Mark as resolved
api.post("/failed/:id/resolve", async (c) => {
  const id = parseInt(c.req.param("id"));
  const attempt = await getUnsubscribeAttempt(id);

  if (!attempt) {
    return c.json({ error: "Not found" }, 404);
  }

  await markAsResolved(id);

  return c.json({ success: true });
});

// Allow list endpoints
api.get("/allowlist", async (c) => {
  const list = await getAllowList();
  return c.json(list);
});

api.post("/allowlist", async (c) => {
  const body = await c.req.json();
  const { type, value, notes } = body;

  if (!type || !value) {
    return c.json({ error: "type and value are required" }, 400);
  }

  if (type !== "email" && type !== "domain") {
    return c.json({ error: "type must be email or domain" }, 400);
  }

  const entry = await addToAllowList(type, value, notes);
  await logAllowlistAdd(type, value, c.req.header("X-Forwarded-For"));

  return c.json(entry, 201);
});

api.delete("/allowlist/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const entry = await getAllowList().then((list) =>
    list.find((e) => e.id === id)
  );

  if (!entry) {
    return c.json({ error: "Not found" }, 404);
  }

  const removed = await removeFromAllowList(id);

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
  const stats = await getDomainStats();
  return c.json(stats);
});

api.get("/domains/:domain", async (c) => {
  const domain = c.req.param("domain");
  const history = await getHistoryByDomain(domain);
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
  const senders = await getIneffectiveSenders();
  return c.json(senders);
});

api.post("/ineffective/:sender/clear", async (c) => {
  const sender = c.req.param("sender");
  await clearIneffectiveFlag(decodeURIComponent(sender));
  return c.json({ success: true });
});

// Weekly digest data (placeholder)
api.get("/digest", async (c) => {
  const stats = await getStats();
  const recent = await getRecentAttempts(10);
  const failed = await getFailedAttempts(5);
  const ineffective = await getIneffectiveSenders();

  return c.json({
    stats,
    recentActivity: recent,
    recentFailures: failed,
    ineffectiveSenders: ineffective.slice(0, 5),
  });
});

// Unsubscribe history with filtering
api.get("/history", async (c) => {
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");
  const status = c.req.query("status");
  const domain = c.req.query("domain");

  // For now, use the existing functions
  // In a real implementation, you'd add more filtering to the SQL
  if (domain) {
    const history = await getHistoryByDomain(domain);
    return c.json(history.slice(offset, offset + limit));
  }

  if (status === "failed" || status === "uncertain") {
    const failed = await getFailedAttempts(limit, offset);
    return c.json(failed);
  }

  const recent = await getRecentAttempts(limit);
  return c.json(recent);
});

// Health check endpoint with metrics
api.get("/health", async (c) => {
  const startTime = Date.now();
  const stats = await getStats();
  const responseTime = Date.now() - startTime;

  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    uptime: Math.floor(performance.now() / 1000),
    metrics: {
      responseTimeMs: responseTime,
      total: stats.total,
      successRate: stats.successRate.toFixed(2),
      failed: stats.failed,
      pending: stats.pending,
    },
  });
});

// Readiness check (for Kubernetes/container orchestration)
api.get("/ready", async (c) => {
  try {
    // Check database connectivity
    await getStats();
    return c.json({ ready: true });
  } catch {
    return c.json({ ready: false, error: "Database unavailable" }, 503);
  }
});

// Liveness check
api.get("/live", (c) => {
  return c.json({ alive: true });
});

// Scanner endpoints
api.get("/scan/status", (c) => {
  return c.json({ inProgress: isScanInProgress() });
});

api.post("/scan", (c) => {
  if (isScanInProgress()) {
    return c.json({ error: "Scan already in progress" }, 409);
  }

  // Run scan in background, don't block response
  scanEmails().catch((err) => {
    console.error("Scan failed:", err);
  });

  return c.json({ success: true, message: "Scan started" });
});
