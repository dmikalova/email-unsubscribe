// Unit tests for URL validation

import { assertEquals } from 'std/assert';
import { validateUnsubscribeUrl } from '../../src/unsubscribe/validation.ts';

Deno.test('validateUnsubscribeUrl - accepts valid HTTPS URL', () => {
  const result = validateUnsubscribeUrl('https://example.com/unsubscribe');
  assertEquals(result.valid, true);
});

Deno.test('validateUnsubscribeUrl - accepts valid HTTP URL', () => {
  const result = validateUnsubscribeUrl('http://example.com/unsubscribe');
  assertEquals(result.valid, true);
});

Deno.test('validateUnsubscribeUrl - rejects localhost URLs (SSRF prevention)', () => {
  const result = validateUnsubscribeUrl('http://localhost/unsubscribe');
  assertEquals(result.valid, false);
  assertEquals(
    result.error?.toLowerCase().includes('blocked') ||
      result.error?.toLowerCase().includes('local'),
    true,
  );
});

Deno.test('validateUnsubscribeUrl - rejects 127.0.0.1 (SSRF prevention)', () => {
  const result = validateUnsubscribeUrl('http://127.0.0.1/unsubscribe');
  assertEquals(result.valid, false);
});

Deno.test('validateUnsubscribeUrl - rejects private IP ranges (SSRF prevention)', () => {
  const privateIps = [
    'http://10.0.0.1/unsubscribe',
    'http://192.168.1.1/unsubscribe',
    'http://172.16.0.1/unsubscribe',
  ];

  for (const url of privateIps) {
    const result = validateUnsubscribeUrl(url);
    assertEquals(result.valid, false, `Should reject ${url}`);
  }
});

Deno.test('validateUnsubscribeUrl - rejects data: URLs', () => {
  const result = validateUnsubscribeUrl('data:text/html,<script>alert(1)</script>');
  assertEquals(result.valid, false);
});

Deno.test('validateUnsubscribeUrl - rejects javascript: URLs', () => {
  const result = validateUnsubscribeUrl('javascript:alert(1)');
  assertEquals(result.valid, false);
});

Deno.test('validateUnsubscribeUrl - rejects file: URLs', () => {
  const result = validateUnsubscribeUrl('file:///etc/passwd');
  assertEquals(result.valid, false);
});

Deno.test('validateUnsubscribeUrl - rejects empty URL', () => {
  const result = validateUnsubscribeUrl('');
  assertEquals(result.valid, false);
});

Deno.test('validateUnsubscribeUrl - rejects malformed URL', () => {
  const result = validateUnsubscribeUrl('not-a-url');
  assertEquals(result.valid, false);
});

Deno.test('validateUnsubscribeUrl - accepts URL with query params', () => {
  const result = validateUnsubscribeUrl('https://example.com/unsubscribe?token=abc123&user=test');
  assertEquals(result.valid, true);
});

Deno.test('validateUnsubscribeUrl - accepts URL with encoded characters', () => {
  const result = validateUnsubscribeUrl('https://example.com/unsubscribe?email=test%40example.com');
  assertEquals(result.valid, true);
});
