// Hono Application Setup

import { Hono } from 'hono';
import {
  api,
  authMiddleware,
  csrfMiddleware,
  csrfSetupMiddleware,
  oauth,
  rateLimitMiddleware,
} from './api/index.ts';
import type { AppEnv } from './types.ts';

export const app = new Hono<AppEnv>();

// Apply global middleware
app.use('*', rateLimitMiddleware);
app.use('*', authMiddleware);
app.use('*', csrfSetupMiddleware);
app.use('*', csrfMiddleware);

// Health check endpoint (no auth required)
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth routes
app.route('/oauth', oauth);

// API routes
app.route('/api', api);

// Serve static files for screenshots
app.get('/screenshots/:filename', async (c) => {
  const filename = c.req.param('filename');
  const screenshotsDir = Deno.env.get('SCREENSHOTS_PATH') || './data/screenshots';

  try {
    const file = await Deno.readFile(`${screenshotsDir}/${filename}`);
    return new Response(file, {
      headers: { 'Content-Type': 'image/png' },
    });
  } catch {
    return c.json({ error: 'Not found' }, 404);
  }
});

// Serve favicon
app.get('/favicon.svg', async (c) => {
  try {
    const svg = await Deno.readTextFile(new URL('./public/favicon.svg', import.meta.url).pathname);
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  } catch {
    return c.json({ error: 'Not found' }, 404);
  }
});

// Serve compiled CSS
app.get('/output.css', async (c) => {
  try {
    const css = await Deno.readTextFile(new URL('./public/output.css', import.meta.url).pathname);
    return new Response(css, {
      headers: { 'Content-Type': 'text/css' },
    });
  } catch {
    return c.json({ error: 'Not found' }, 404);
  }
});

// Serve frontend
app.get('/', async (c) => {
  try {
    const html = await Deno.readTextFile(new URL('./public/index.html', import.meta.url).pathname);
    return c.html(html);
  } catch {
    return c.json({ message: 'Email Unsubscribe API', version: '0.1.0' });
  }
});
