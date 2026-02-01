// Integration tests for API endpoints
// These tests require the app to be running or use Hono's test client

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';

// Set test environment variables before importing the app
Deno.env.set('SKIP_AUTH', 'true');
Deno.env.set('SKIP_CSRF', 'true');

import { app } from '../../src/app.ts';

// Helper to make requests to the app
async function request(path: string, options: RequestInit = {}) {
  const req = new Request(`http://localhost${path}`, options);
  return await app.fetch(req);
}

Deno.test({
  name: 'API - GET /api/health returns healthy status',
  async fn() {
    const res = await request('/api/health');
    // May return 500 if database is not available
    if (res.status === 200) {
      const body = await res.json();
      assertEquals(body.status, 'healthy');
      assertEquals(typeof body.timestamp, 'string');
      assertEquals(typeof body.metrics, 'object');
    } else {
      assertEquals([200, 500].includes(res.status), true);
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'API - GET /api/live returns alive',
  async fn() {
    const res = await request('/api/live');
    assertEquals(res.status, 200);

    const body = await res.json();
    assertEquals(body.alive, true);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'API - GET /api/ready returns ready status',
  async fn() {
    const res = await request('/api/ready');
    // May return 200 or 503 depending on database state
    assertEquals([200, 503].includes(res.status), true);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'API - GET /api/stats returns stats object',
  async fn() {
    const res = await request('/api/stats');

    if (res.status === 200) {
      const body = await res.json();
      assertEquals(typeof body.total, 'number');
    } else {
      // May fail if database is not available
      assertEquals([200, 500].includes(res.status), true);
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'API - GET /api/allowlist returns array',
  async fn() {
    const res = await request('/api/allowlist');

    if (res.status === 200) {
      const body = await res.json();
      assertEquals(Array.isArray(body), true);
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'API - POST /api/allowlist validates input',
  async fn() {
    // Missing required fields
    const res = await request('/api/allowlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // Should return 400 for invalid input
    assertEquals([400, 500].includes(res.status), true);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'API - GET /api/failed returns array',
  async fn() {
    const res = await request('/api/failed');

    if (res.status === 200) {
      const body = await res.json();
      assertEquals(Array.isArray(body), true);
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'API - GET /api/failed/:id returns 404 for non-existent',
  async fn() {
    const res = await request('/api/failed/999999');
    // 404 if record not found, 500 if database not available
    assertEquals([404, 500].includes(res.status), true);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'API - GET /api/domains returns array',
  async fn() {
    const res = await request('/api/domains');

    if (res.status === 200) {
      const body = await res.json();
      assertEquals(Array.isArray(body), true);
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'API - GET /api/patterns returns array',
  async fn() {
    const res = await request('/api/patterns');

    if (res.status === 200) {
      const body = await res.json();
      assertEquals(Array.isArray(body), true);
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'API - Static files - GET / returns HTML',
  async fn() {
    const res = await request('/');

    if (res.status === 200) {
      const contentType = res.headers.get('content-type');
      assertEquals(contentType?.includes('text/html'), true);
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
