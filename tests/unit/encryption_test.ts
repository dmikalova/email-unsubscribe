// Unit tests for encryption module
// Note: These tests require ENCRYPTION_KEY environment variable to be set

import { assertEquals, assertNotEquals } from '@std/assert';

// Set a test encryption key (32 bytes base64 encoded)
const TEST_KEY = btoa('12345678901234567890123456789012');

Deno.test('encryption - encrypts and decrypts data correctly', async () => {
  Deno.env.set('ENCRYPTION_KEY', TEST_KEY);

  // Dynamic import to use the env var
  const { encrypt, decrypt } = await import('../../src/gmail/encryption.ts');

  const originalData = 'test-oauth-token-12345';
  const encrypted = await encrypt(originalData);
  const decrypted = await decrypt(encrypted);

  assertEquals(decrypted, originalData);
});

Deno.test('encryption - produces different ciphertext for same input (random IV)', async () => {
  Deno.env.set('ENCRYPTION_KEY', TEST_KEY);

  const { encrypt } = await import('../../src/gmail/encryption.ts');

  const originalData = 'test-oauth-token-12345';
  const encrypted1 = await encrypt(originalData);
  const encrypted2 = await encrypt(originalData);

  // They should have different ciphertext due to random IV
  assertNotEquals(Array.from(encrypted1).join(','), Array.from(encrypted2).join(','));
});

Deno.test('encryption - handles empty string', async () => {
  Deno.env.set('ENCRYPTION_KEY', TEST_KEY);

  const { encrypt, decrypt } = await import('../../src/gmail/encryption.ts');

  const encrypted = await encrypt('');
  const decrypted = await decrypt(encrypted);

  assertEquals(decrypted, '');
});

Deno.test('encryption - handles unicode characters', async () => {
  Deno.env.set('ENCRYPTION_KEY', TEST_KEY);

  const { encrypt, decrypt } = await import('../../src/gmail/encryption.ts');

  const originalData = 'test-token-日本語-émoji-🔐';
  const encrypted = await encrypt(originalData);
  const decrypted = await decrypt(encrypted);

  assertEquals(decrypted, originalData);
});

Deno.test('encryption - handles long strings', async () => {
  Deno.env.set('ENCRYPTION_KEY', TEST_KEY);

  const { encrypt, decrypt } = await import('../../src/gmail/encryption.ts');

  const originalData = 'a'.repeat(10000);
  const encrypted = await encrypt(originalData);
  const decrypted = await decrypt(encrypted);

  assertEquals(decrypted, originalData);
});
