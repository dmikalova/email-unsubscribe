// Unit tests for allow list functionality

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { matchesAllowPattern } from '../../src/scanner/allowlist.ts';

Deno.test('matchesAllowPattern - matches exact domain', () => {
  const result = matchesAllowPattern('newsletter@example.com', 'example.com');
  assertEquals(result, true);
});

Deno.test('matchesAllowPattern - matches subdomain with wildcard', () => {
  const result = matchesAllowPattern('news@mail.example.com', '*.example.com');
  assertEquals(result, true);
});

Deno.test('matchesAllowPattern - matches exact email', () => {
  const result = matchesAllowPattern('important@example.com', 'important@example.com');
  assertEquals(result, true);
});

Deno.test('matchesAllowPattern - case insensitive matching', () => {
  const result = matchesAllowPattern('NEWSLETTER@EXAMPLE.COM', 'example.com');
  assertEquals(result, true);
});

Deno.test('matchesAllowPattern - does not match different domain', () => {
  const result = matchesAllowPattern('newsletter@other.com', 'example.com');
  assertEquals(result, false);
});

Deno.test('matchesAllowPattern - does not match partial domain', () => {
  const result = matchesAllowPattern('newsletter@notexample.com', 'example.com');
  assertEquals(result, false);
});

Deno.test('matchesAllowPattern - matches sender with display name', () => {
  const result = matchesAllowPattern('Newsletter <newsletter@example.com>', 'example.com');
  assertEquals(result, true);
});

Deno.test('matchesAllowPattern - matches against email patterns', () => {
  const patterns = [
    { pattern: '*@important.com', email: 'anything@important.com', expected: true },
    { pattern: 'admin@*', email: 'admin@example.com', expected: true },
    { pattern: '*billing*', email: 'no-reply-billing@example.com', expected: true },
  ];

  for (const { pattern, email, expected } of patterns) {
    const result = matchesAllowPattern(email, pattern);
    assertEquals(result, expected, `Pattern ${pattern} should${expected ? '' : ' not'} match ${email}`);
  }
});
