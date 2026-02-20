// OAuth routes for Gmail authorization

import { Hono } from "hono";
import { deleteAllUserData, exportAllUserData } from "../db/user-data.ts";
import { exchangeCodeForTokens, getAuthorizationUrl } from "../gmail/oauth.ts";
import {
  checkTokenHealth,
  deleteTokens,
  getTokens,
  hasValidTokens,
  storeTokens,
} from "../gmail/tokens.ts";
import { logOAuthAuthorized, logOAuthRevoked } from "../tracker/audit.ts";
import type { AppEnv } from "../types.ts";

export const oauth = new Hono<AppEnv>();

// Check authorization status
oauth.get("/status", async (c) => {
  const user = c.get("user");
  if (!user?.userId) {
    return c.json({ authorized: false, error: "Not authenticated" });
  }

  const authorized = await hasValidTokens(user.userId);
  const tokens = authorized ? await getTokens(user.userId) : null;

  return c.json({
    authorized,
    connectedEmail: tokens?.connectedEmail || null,
  });
});

// Start OAuth flow
oauth.get("/authorize", (c) => {
  const user = c.get("user");
  if (!user?.userId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  // Store userId in state for callback verification
  const state = JSON.stringify({
    csrf: crypto.randomUUID(),
    userId: user.userId,
  });
  const url = getAuthorizationUrl(btoa(state));
  return c.redirect(url);
});

// OAuth callback
oauth.get("/callback", async (c) => {
  const code = c.req.query("code");
  const error = c.req.query("error");
  const stateParam = c.req.query("state");

  if (error) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Authorization Failed</title></head>
        <body>
          <h1>Authorization Failed</h1>
          <p>Error: ${error}</p>
          <a href="/oauth/authorize">Try again</a>
        </body>
      </html>
    `);
  }

  if (!code || !stateParam) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Authorization Failed</title></head>
        <body>
          <h1>Authorization Failed</h1>
          <p>No authorization code or state received</p>
          <a href="/oauth/authorize">Try again</a>
        </body>
      </html>
    `);
  }

  // Validate state and extract userId
  let userId: string;
  try {
    const state = JSON.parse(atob(stateParam));
    userId = state.userId;
    if (!userId) {
      throw new Error("Missing userId in state");
    }
  } catch {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Authorization Failed</title></head>
        <body>
          <h1>Authorization Failed</h1>
          <p>Invalid state parameter</p>
          <a href="/oauth/authorize">Try again</a>
        </body>
      </html>
    `);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // Fetch connected email from Google userinfo
    let connectedEmail: string | undefined;
    try {
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        connectedEmail = userInfo.email;
      }
    } catch {
      // Non-fatal: proceed without connected email
    }

    await storeTokens(tokens, userId, connectedEmail);
    await logOAuthAuthorized(userId, connectedEmail);

    // Redirect immediately to dashboard
    return c.redirect("/");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Authorization Failed</title></head>
        <body>
          <h1>Authorization Failed</h1>
          <p>Error: ${message}</p>
          <a href="/oauth/authorize">Try again</a>
        </body>
      </html>
    `);
  }
});

// Revoke authorization (delete tokens)
oauth.post("/revoke", async (c) => {
  const user = c.get("user");
  if (!user?.userId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  await deleteTokens(user.userId);
  await logOAuthRevoked(user.userId);
  return c.json({ success: true });
});

// Token health check endpoint
oauth.get("/health", async (c) => {
  const user = c.get("user");
  if (!user?.userId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const health = await checkTokenHealth(user.userId);
  return c.json(health);
});

// Export all user data (GDPR data portability)
oauth.get("/data/export", async (c) => {
  const user = c.get("user");
  if (!user?.userId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const data = await exportAllUserData(user.userId);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="user-data-${
        new Date().toISOString().split("T")[0]
      }.json"`,
    },
  });
});

// Delete all user data (GDPR right to erasure)
oauth.delete("/data", async (c) => {
  const user = c.get("user");
  if (!user?.userId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const result = await deleteAllUserData(user.userId);
  return c.json({
    success: true,
    message: "All user data has been deleted",
    ...result,
  });
});
