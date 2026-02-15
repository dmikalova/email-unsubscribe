import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { app } from '../../src/app.ts';

Deno.test('health check returns 200 OK with status and timestamp', async () => {
  const req = new Request('http://localhost/health');
  const res = await app.fetch(req);

  assertEquals(res.status, 200);

  const body = await res.json();
  assertEquals(body.status, 'ok');
  assertEquals(typeof body.timestamp, 'string');
  // Verify timestamp is valid ISO format
  const parsed = new Date(body.timestamp);
  assertEquals(isNaN(parsed.getTime()), false);
});
