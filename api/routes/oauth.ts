// OAuth routes for Gmail authorization

import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { deleteAllUserData, exportAllUserData } from '../db/user-data.ts';
import { exchangeCodeForTokens, getAuthorizationUrl } from '../gmail/oauth.ts';
import {
  checkTokenHealth,
  deleteTokens,
  getTokens,
  getValidAccessToken,
  hasValidTokens,
  storeTokens,
  updateConnectedEmail,
} from '../gmail/tokens.ts';
import { logOAuthAuthorized, logOAuthRevoked } from '../tracker/audit.ts';
import type { AppEnv } from '../types.ts';

// Cookie name for Gmail connection state
const GMAIL_COOKIE = 'gmail_connected';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export const oauth = new Hono<AppEnv>();

// Check authorization status
oauth.get('/status', async (c) => {
  const user = c.get('user');
  if (!user?.userId) {
    console.log('[OAuth Status] No user - not authenticated');
    return c.json({ authorized: false, error: 'Not authenticated' });
  }

  console.log(`[OAuth Status] Checking for userId=${user.userId}`);

  // Fast path: check cookie first
  const cookieEmail = getCookie(c, GMAIL_COOKIE);
  console.log(`[OAuth Status] Cookie email=${cookieEmail || 'none'}`);

  if (cookieEmail) {
    // Verify tokens still exist in DB (cookie could be stale)
    const authorized = await hasValidTokens(user.userId);
    console.log(`[OAuth Status] Cookie found, tokens valid=${authorized}`);
    if (authorized) {
      return c.json({
        authorized: true,
        connectedEmail: cookieEmail,
      });
    }
    // Cookie is stale, clear it
    console.log('[OAuth Status] Cookie stale, clearing');
    deleteCookie(c, GMAIL_COOKIE);
  }

  // Slow path: check database
  const authorized = await hasValidTokens(user.userId);
  console.log(`[OAuth Status] DB check: authorized=${authorized}`);

  let tokens = authorized ? await getTokens(user.userId) : null;
  console.log(`[OAuth Status] Tokens from DB: connectedEmail=${tokens?.connectedEmail || 'null'}`);

  // Backfill connected email if missing (for tokens stored before we tracked email)
  if (authorized && tokens && !tokens.connectedEmail) {
    console.log('[OAuth Status] Attempting to backfill email from Gmail API');
    try {
      const accessToken = await getValidAccessToken(user.userId);
      console.log(`[OAuth Status] Got access token: ${accessToken.slice(0, 10)}...`);
      // Use Gmail's getProfile endpoint which works with existing Gmail scopes
      const profileResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      console.log(`[OAuth Status] Gmail profile response: ${profileResponse.status}`);
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        console.log(`[OAuth Status] Gmail profile email: ${profile.emailAddress || 'none'}`);
        if (profile.emailAddress) {
          await updateConnectedEmail(user.userId, profile.emailAddress);
          tokens = { ...tokens, connectedEmail: profile.emailAddress };
          console.log(`[OAuth Status] Updated DB with email: ${profile.emailAddress}`);
        }
      } else {
        const errorText = await profileResponse.text();
        console.log(`[OAuth Status] Gmail API error: ${errorText}`);
      }
    } catch (err) {
      console.log(`[OAuth Status] Backfill error: ${err}`);
      // Non-fatal: proceed without email
    }
  }

  // Set cookie if authorized
  if (authorized && tokens?.connectedEmail) {
    console.log(`[OAuth Status] Setting cookie with email: ${tokens.connectedEmail}`);
    setCookie(c, GMAIL_COOKIE, tokens.connectedEmail, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }

  console.log(
    `[OAuth Status] Returning: authorized=${authorized}, connectedEmail=${
      tokens?.connectedEmail || 'null'
    }`,
  );
  return c.json({
    authorized,
    connectedEmail: tokens?.connectedEmail || null,
  });
});

// Start OAuth flow
oauth.get('/authorize', (c) => {
  const user = c.get('user');
  if (!user?.userId) {
    return c.json({ error: 'Not authenticated' }, 401);
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
oauth.get('/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');
  const stateParam = c.req.query('state');

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
      throw new Error('Missing userId in state');
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
    console.log(`[OAuth Callback] Got tokens for userId=${userId}`);

    // Fetch connected email from Gmail profile (uses existing Gmail scopes)
    let connectedEmail: string | undefined;
    try {
      const profileResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );
      console.log(`[OAuth Callback] Gmail profile response: ${profileResponse.status}`);
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        connectedEmail = profile.emailAddress;
        console.log(`[OAuth Callback] Got email from Gmail: ${connectedEmail}`);
      } else {
        const errorText = await profileResponse.text();
        console.log(`[OAuth Callback] Gmail API error: ${errorText}`);
      }
    } catch (err) {
      console.log(`[OAuth Callback] Error fetching email: ${err}`);
      // Non-fatal: proceed without connected email
    }

    console.log(`[OAuth Callback] Storing tokens with email: ${connectedEmail || 'none'}`);
    await storeTokens(tokens, userId, connectedEmail);
    await logOAuthAuthorized(userId, connectedEmail);

    // Set gmail_connected cookie for persistence across server restarts
    if (connectedEmail) {
      setCookie(c, GMAIL_COOKIE, connectedEmail, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });
    }

    // Redirect immediately to dashboard
    return c.redirect('/');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
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
oauth.post('/revoke', async (c) => {
  const user = c.get('user');
  if (!user?.userId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  await deleteTokens(user.userId);
  await logOAuthRevoked(user.userId);

  // Clear gmail_connected cookie
  deleteCookie(c, GMAIL_COOKIE);

  return c.json({ success: true });
});

// Token health check endpoint
oauth.get('/health', async (c) => {
  const user = c.get('user');
  if (!user?.userId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const health = await checkTokenHealth(user.userId);
  return c.json(health);
});

// Export all user data (GDPR data portability)
oauth.get('/data/export', async (c) => {
  const user = c.get('user');
  if (!user?.userId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const data = await exportAllUserData(user.userId);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="user-data-${
        new Date().toISOString().split('T')[0]
      }.json"`,
    },
  });
});

// Delete all user data (GDPR right to erasure)
oauth.delete('/data', async (c) => {
  const user = c.get('user');
  if (!user?.userId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const result = await deleteAllUserData(user.userId);
  return c.json({
    success: true,
    message: 'All user data has been deleted',
    ...result,
  });
});
