// Hono Application Setup

import { Hono } from '@hono/hono';

export const app = new Hono();

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Placeholder for API routes
app.get('/', (c) => {
  return c.json({ message: 'Email Unsubscribe API' });
});
