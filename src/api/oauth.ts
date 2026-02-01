// OAuth routes for Gmail authorization

import { Hono } from '@hono/hono';
import { getAuthorizationUrl, exchangeCodeForTokens } from '../gmail/oauth.ts';
import { storeTokens, hasValidTokens } from '../gmail/tokens.ts';
import { logOAuthAuthorized } from '../tracker/audit.ts';

export const oauth = new Hono();

// Check authorization status
oauth.get('/status', async (c) => {
  const authorized = await hasValidTokens();
  return c.json({ authorized });
});

// Start OAuth flow
oauth.get('/authorize', (c) => {
  const state = crypto.randomUUID();
  // In production, store state in session for CSRF protection
  const url = getAuthorizationUrl(state);
  return c.redirect(url);
});

// OAuth callback
oauth.get('/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');

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

  if (!code) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Authorization Failed</title></head>
        <body>
          <h1>Authorization Failed</h1>
          <p>No authorization code received</p>
          <a href="/oauth/authorize">Try again</a>
        </body>
      </html>
    `);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await storeTokens(tokens);
    await logOAuthAuthorized();

    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Authorization Successful</title></head>
        <body>
          <h1>Authorization Successful</h1>
          <p>Gmail access has been authorized. You can close this window.</p>
          <script>
            // Auto-redirect to dashboard after 2 seconds
            setTimeout(() => window.location.href = '/', 2000);
          </script>
        </body>
      </html>
    `);
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
  const { deleteTokens } = await import('../gmail/tokens.ts');
  await deleteTokens();
  return c.json({ success: true });
});
