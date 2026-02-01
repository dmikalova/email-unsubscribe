// Hono Application Setup

import { Hono } from '@hono/hono';
import { api, oauth, authMiddleware, rateLimitMiddleware, csrfMiddleware } from './api/index.ts';

export const app = new Hono();

// Apply global middleware
app.use('*', rateLimitMiddleware);
app.use('*', authMiddleware);
app.use('*', csrfMiddleware);

// Health check endpoint (no auth required)
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth routes
app.route('/oauth', oauth);

// API routes
app.route('/api', api);

// Root endpoint
app.get('/', (c) => {
  return c.json({ message: 'Email Unsubscribe API', version: '0.1.0' });
});
