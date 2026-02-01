// Unit tests for encryption module

import { assertEquals, assertNotEquals, assertRejects } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { encrypt, decrypt, deriveKey } from '../../src/gmail/encryption.ts';

Deno.test('encryption - encrypts and decrypts data correctly', async () => {
  const originalData = 'test-oauth-token-12345';
  const key = await deriveKey('test-encryption-key-for-testing');

  const encrypted = await encrypt(originalData, key);
  const decrypted = await decrypt(encrypted, key);

  assertEquals(decrypted, originalData);
});

Deno.test('encryption - produces different ciphertext for same input (random IV)', async () => {
  const originalData = 'test-oauth-token-12345';
  const key = await deriveKey('test-encryption-key-for-testing');

  const encrypted1 = await encrypt(originalData, key);
  const encrypted2 = await encrypt(originalData, key);

  assertNotEquals(encrypted1, encrypted2);
});

Deno.test('encryption - fails with wrong key', async () => {
  const originalData = 'test-oauth-token-12345';
  const key1 = await deriveKey('test-encryption-key-1');
  const key2 = await deriveKey('test-encryption-key-2');

  const encrypted = await encrypt(originalData, key1);

  await assertRejects(
    () => decrypt(encrypted, key2),
    Error,
  );
});

Deno.test('encryption - handles empty string', async () => {
  const key = await deriveKey('test-encryption-key-for-testing');

  const encrypted = await encrypt('', key);
  const decrypted = await decrypt(encrypted, key);

  assertEquals(decrypted, '');
});

Deno.test('encryption - handles unicode characters', async () => {
  const originalData = 'test-token-日本語-émoji-🔐';
  const key = await deriveKey('test-encryption-key-for-testing');

  const encrypted = await encrypt(originalData, key);
  const decrypted = await decrypt(encrypted, key);

  assertEquals(decrypted, originalData);
});

Deno.test('encryption - handles long strings', async () => {
  const originalData = 'a'.repeat(10000);
  const key = await deriveKey('test-encryption-key-for-testing');

  const encrypted = await encrypt(originalData, key);
  const decrypted = await decrypt(encrypted, key);

  assertEquals(decrypted, originalData);
});

Deno.test('deriveKey - produces consistent key for same input', async () => {
  const key1 = await deriveKey('test-password');
  const key2 = await deriveKey('test-password');

  // Export keys to compare
  const exported1 = await crypto.subtle.exportKey('raw', key1);
  const exported2 = await crypto.subtle.exportKey('raw', key2);

  assertEquals(
    new Uint8Array(exported1),
    new Uint8Array(exported2),
  );
});
