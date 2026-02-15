// Integration tests for database operations
// These tests require a running PostgreSQL instance

import { assertEquals, assertExists } from '@std/assert';

// Skip tests if DATABASE_URL is not set
const DATABASE_URL = Deno.env.get('DATABASE_URL');
const runIntegrationTests = !!DATABASE_URL;

if (runIntegrationTests) {
  // Dynamic imports to avoid errors when database is not available
  const { runMigrations, closeConnection } = await import('../../src/db/index.ts');
  const { addToAllowList, removeFromAllowList, isAllowed } =
    await import('../../src/scanner/allowlist.ts');
  const {
    recordUnsubscribeAttempt,
    getUnsubscribeAttempt,
    markAsResolved,
    getStats,
    getFailedAttempts,
  } = await import('../../src/tracker/tracker.ts');
  const { logScanStarted, logScanCompleted, getAuditLog } =
    await import('../../src/tracker/audit.ts');

  // Setup: Run migrations before tests
  Deno.test({
    name: 'database - setup migrations',
    async fn() {
      await runMigrations();
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });

  // Allow List Tests
  Deno.test({
    name: 'allowlist - add and retrieve entry',
    async fn() {
      const value = `test-${Date.now()}@example.com`;
      const entry = await addToAllowList('email', value, 'Test integration');

      assertExists(entry);
      assertEquals(entry.value, value.toLowerCase());
      assertEquals(entry.type, 'email');

      // Cleanup
      await removeFromAllowList(entry.id);
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });

  Deno.test({
    name: 'allowlist - check if in allow list',
    async fn() {
      const value = `allowed-${Date.now()}@example.com`;
      const entry = await addToAllowList('email', value, 'Test');

      const allowed = await isAllowed(value);
      assertEquals(allowed, true);

      // Cleanup
      await removeFromAllowList(entry.id);
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });

  // Unsubscribe Tracking Tests
  Deno.test({
    name: 'tracker - record and retrieve attempt',
    async fn() {
      const attempt = await recordUnsubscribeAttempt({
        emailId: `test-email-${Date.now()}`,
        sender: 'test@example.com',
        senderDomain: 'example.com',
        method: 'one_click',
        unsubscribeUrl: 'https://example.com/unsubscribe',
        status: 'success',
      });

      assertExists(attempt);
      assertExists(attempt.id);

      const retrieved = await getUnsubscribeAttempt(attempt.id);
      assertExists(retrieved);
      assertEquals(retrieved.sender, 'test@example.com');
      assertEquals(retrieved.status, 'success');
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });

  Deno.test({
    name: 'tracker - mark as resolved',
    async fn() {
      const attempt = await recordUnsubscribeAttempt({
        emailId: `test-email-${Date.now()}`,
        sender: 'failed@example.com',
        senderDomain: 'example.com',
        method: 'browser',
        unsubscribeUrl: 'https://example.com/unsubscribe',
        status: 'failed',
        failureReason: 'timeout',
        failureDetails: 'Test error',
      });

      await markAsResolved(attempt.id);

      const resolved = await getUnsubscribeAttempt(attempt.id);
      assertEquals(resolved?.status, 'success');
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });

  Deno.test({
    name: 'tracker - get stats',
    async fn() {
      const stats = await getStats();

      assertExists(stats);
      assertEquals(typeof stats.total, 'number');
      assertEquals(typeof stats.success, 'number');
      assertEquals(typeof stats.failed, 'number');
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });

  Deno.test({
    name: 'tracker - get failed attempts',
    async fn() {
      // Create a failed attempt
      await recordUnsubscribeAttempt({
        emailId: `test-failed-${Date.now()}`,
        sender: 'fail@example.com',
        senderDomain: 'example.com',
        method: 'browser',
        unsubscribeUrl: 'https://example.com/unsubscribe',
        status: 'failed',
        failureReason: 'timeout',
        failureDetails: 'Test failure',
      });

      const failed = getFailedAttempts(10, 0);

      assertEquals(Array.isArray(await failed), true);
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });

  // Audit Log Tests
  Deno.test({
    name: 'audit - log scan events',
    async fn() {
      await logScanStarted();
      await logScanCompleted(10, 5, 0);

      const logs = await getAuditLog({ limit: 10 });

      assertEquals(Array.isArray(logs), true);
      assertEquals(logs.length >= 2, true);
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });

  // Cleanup: Close database connection
  Deno.test({
    name: 'database - cleanup',
    async fn() {
      await closeConnection();
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });
} else {
  // Placeholder test when database is not available
  Deno.test('database integration tests skipped - DATABASE_URL not set', () => {
    console.log('Skipping database integration tests - set DATABASE_URL to run');
  });
}
