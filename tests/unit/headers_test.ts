// Unit tests for email header parsing

import { assertEquals } from '@std/assert';
import type { GmailHeader } from '../../src/gmail/client.ts';
import { parseListUnsubscribeHeader } from '../../src/scanner/headers.ts';

function makeHeaders(headers: Record<string, string>): GmailHeader[] {
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
}

Deno.test('parseListUnsubscribeHeader - parses HTTP URL', () => {
  const headers = makeHeaders({
    'List-Unsubscribe': '<https://example.com/unsubscribe?id=123>',
  });

  const result = parseListUnsubscribeHeader(headers);

  assertEquals(result.httpUrls.length, 1);
  assertEquals(result.httpUrls[0], 'https://example.com/unsubscribe?id=123');
});

Deno.test('parseListUnsubscribeHeader - parses mailto URL', () => {
  const headers = makeHeaders({
    'List-Unsubscribe': '<mailto:unsubscribe@example.com>',
  });

  const result = parseListUnsubscribeHeader(headers);

  assertEquals(result.mailtoUrl, 'mailto:unsubscribe@example.com');
});

Deno.test('parseListUnsubscribeHeader - parses multiple URLs', () => {
  const headers = makeHeaders({
    'List-Unsubscribe': '<https://example.com/unsubscribe>, <mailto:unsubscribe@example.com>',
  });

  const result = parseListUnsubscribeHeader(headers);

  assertEquals(result.httpUrls.length, 1);
  assertEquals(result.mailtoUrl, 'mailto:unsubscribe@example.com');
});

Deno.test('parseListUnsubscribeHeader - handles empty headers', () => {
  const result = parseListUnsubscribeHeader([]);
  assertEquals(result.httpUrls.length, 0);
  assertEquals(result.mailtoUrl, null);
});

Deno.test('parseListUnsubscribeHeader - detects one-click support', () => {
  const headers = makeHeaders({
    'List-Unsubscribe': '<https://example.com/unsubscribe?id=123>',
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  });

  const result = parseListUnsubscribeHeader(headers);

  assertEquals(result.listUnsubscribePost, true);
  assertEquals(result.oneClickUrl, 'https://example.com/unsubscribe?id=123');
});

Deno.test('parseListUnsubscribeHeader - returns null oneClickUrl without post header', () => {
  const headers = makeHeaders({
    'List-Unsubscribe': '<https://example.com/unsubscribe?id=123>',
  });

  const result = parseListUnsubscribeHeader(headers);
  assertEquals(result.oneClickUrl, null);
  assertEquals(result.listUnsubscribePost, false);
});
