/// <reference lib="deno.ns" />
// Unit tests for allow list functionality
// Note: These are mostly placeholder tests since allow list requires database

import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';

// Test the extractDomain function from headers.ts which is used by allow list
import type { GmailHeader } from '../../src/gmail/client.ts';
import { extractDomain, getSender } from '../../src/scanner/headers.ts';

function makeHeaders(headers: Record<string, string>): GmailHeader[] {
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
 }

Deno.test('extractDomain - extracts domain from email address', () => {
  const domain = extractDomain('newsletter@example.com');
  assertEquals(domain, 'example.com');
});

Deno.test('extractDomain - handles subdomain', () => {
  const domain = extractDomain('news@mail.example.com');
  assertEquals(domain, 'mail.example.com');
});

Deno.test('extractDomain - is case insensitive', () => {
  const domain = extractDomain('NEWSLETTER@EXAMPLE.COM');
  assertEquals(domain, 'example.com');
});

Deno.test('extractDomain - throws on invalid email', () => {
  assertThrows(() => extractDomain('not-an-email'), Error);
});

Deno.test('getSender - extracts email from display name format', () => {
  const headers = makeHeaders({
    From: 'Newsletter <newsletter@example.com>',
  });
  const sender = getSender(headers);
  assertEquals(sender, 'newsletter@example.com');
});

Deno.test('getSender - handles complex display names', () => {
  const headers = makeHeaders({
    From: '"John Doe" <john@example.org>',
  });
  const sender = getSender(headers);
  assertEquals(sender, 'john@example.org');
});
