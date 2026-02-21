// Hono Application Setup

import { Hono } from "hono";
import {
  api,
  authMiddleware,
  csrfMiddleware,
  csrfSetupMiddleware,
  oauth,
  rateLimitMiddleware,
} from "./routes/index.ts";
import type { AppEnv } from "./types.ts";

export const app = new Hono<AppEnv>();

// Apply global middleware
app.use("*", rateLimitMiddleware);
app.use("*", authMiddleware);
app.use("*", csrfSetupMiddleware);
app.use("*", csrfMiddleware);

// Health check endpoint (no auth required)
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// OAuth routes
app.route("/oauth", oauth);

// API routes
app.route("/api", api);

// Serve static files for screenshots
app.get("/screenshots/:filename", async (c) => {
  const filename = c.req.param("filename");
  const screenshotsDir = Deno.env.get("SCREENSHOTS_PATH") ||
    "./data/screenshots";

  try {
    const file = await Deno.readFile(`${screenshotsDir}/${filename}`);
    return new Response(file, {
      headers: { "Content-Type": "image/png" },
    });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

// Serve favicon
app.get("/favicon.svg", async (c) => {
  try {
    const svg = await Deno.readTextFile(
      new URL("./public/favicon.svg", import.meta.url).pathname,
    );
    return new Response(svg, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

// Serve compiled CSS
app.get("/output.css", async (c) => {
  try {
    const css = await Deno.readTextFile(
      new URL("./public/output.css", import.meta.url).pathname,
    );
    return new Response(css, {
      headers: { "Content-Type": "text/css" },
    });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

// Serve built frontend assets
app.get("/assets/*", async (c) => {
  const path = c.req.path;
  const distDir = new URL("./public/dist", import.meta.url).pathname;
  try {
    const file = await Deno.readFile(`${distDir}${path}`);
    const ext = path.split(".").pop();
    const contentType = ext === "js"
      ? "application/javascript"
      : ext === "css"
      ? "text/css"
      : "application/octet-stream";
    return new Response(file, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

// Serve frontend - try built version first, fall back to legacy HTML
app.get("/", async (c) => {
  const distDir = new URL("./public/dist", import.meta.url).pathname;
  try {
    // Try built frontend first
    const html = await Deno.readTextFile(`${distDir}/index.html`);
    return c.html(html);
  } catch {
    // Fall back to legacy single-file HTML
    try {
      const html = await Deno.readTextFile(
        new URL("./public/index.html", import.meta.url).pathname,
      );
      return c.html(html);
    } catch {
      return c.json({ message: "Email Unsubscribe API", version: "0.1.0" });
    }
  }
});
