// Integration tests for database operations
// These tests require a running PostgreSQL instance

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';

// Skip tests if DATABASE_URL is not set
const DATABASE_URL = Deno.env.get('DATABASE_URL');
const runIntegrationTests = !!DATABASE_URL;

if (runIntegrationTests) {
  // Dynamic imports to avoid errors when database is not available
  const { runMigrations, closeConnection } = await import('../../src/db/index.ts');
  const { addToAllowList, removeFromAllowList, getAllowList, isInAllowList } = await import('../../src/scanner/allowlist.ts');
  const { recordUnsubscribeAttempt, getUnsubscribeAttempt, markAsResolved, getStats, getFailedAttempts } = await import('../../src/tracker/tracker.ts');
  const { logScanStarted, logScanCompleted, getAuditLog } = await import('../../src/tracker/audit.ts');

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
      const pattern = `test-${Date.now()}@example.com`;
      await addToAllowList(pattern, 'Test integration');
      
      const list = await getAllowList();
      const entry = list.find(e => e.pattern === pattern);
      
      assertExists(entry);
      assertEquals(entry.reason, 'Test integration');
      
      // Cleanup
      await removeFromAllowList(entry.id);
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });

  Deno.test({
    name: 'allowlist - check if in allow list',
    async fn() {
      const pattern = `allowed-${Date.now()}@example.com`;
      await addToAllowList(pattern, 'Test');
      
      const isAllowed = await isInAllowList(pattern);
      assertEquals(isAllowed, true);
      
      const list = await getAllowList();
      const entry = list.find(e => e.pattern === pattern);
      if (entry) await removeFromAllowList(entry.id);
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });

  // Unsubscribe Tracking Tests
  Deno.test({
    name: 'tracker - record and retrieve attempt',
    async fn() {
      const id = await recordUnsubscribeAttempt({
        emailId: `test-email-${Date.now()}`,
        sender: 'test@example.com',
        senderDomain: 'example.com',
        subject: 'Test Email',
        method: 'one-click',
        url: 'https://example.com/unsubscribe',
        status: 'success',
      });
      
      assertExists(id);
      
      const attempt = await getUnsubscribeAttempt(id);
      assertExists(attempt);
      assertEquals(attempt.sender, 'test@example.com');
      assertEquals(attempt.status, 'success');
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });

  Deno.test({
    name: 'tracker - mark as resolved',
    async fn() {
      const id = await recordUnsubscribeAttempt({
        emailId: `test-email-${Date.now()}`,
        sender: 'failed@example.com',
        senderDomain: 'example.com',
        subject: 'Failed Test',
        method: 'browser',
        url: 'https://example.com/unsubscribe',
        status: 'failed',
        errorMessage: 'Test error',
      });
      
      await markAsResolved(id);
      
      const attempt = await getUnsubscribeAttempt(id);
      assertEquals(attempt?.resolved, true);
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });

  Deno.test({
    name: 'tracker - get stats',
    async fn() {
      const stats = await getStats();
      
      assertExists(stats);
      assertEquals(typeof stats.totalProcessed, 'number');
      assertEquals(typeof stats.successCount, 'number');
      assertEquals(typeof stats.failedCount, 'number');
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
        subject: 'Failed',
        method: 'browser',
        url: 'https://example.com/unsubscribe',
        status: 'failed',
        errorMessage: 'Test failure',
      });
      
      const failed = await getFailedAttempts(10, 0);
      
      assertEquals(Array.isArray(failed), true);
    },
    sanitizeOps: false,
    sanitizeResources: false,
  });

  // Audit Log Tests
  Deno.test({
    name: 'audit - log scan events',
    async fn() {
      await logScanStarted();
      await logScanCompleted(10, 5);
      
      const logs = await getAuditLog(10);
      
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
