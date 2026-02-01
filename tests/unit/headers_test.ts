// Unit tests for email header parsing

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { parseUnsubscribeHeaders, extractOneClickUrl } from '../../src/scanner/headers.ts';

Deno.test('parseUnsubscribeHeaders - parses HTTP URL', () => {
  const headers = {
    'list-unsubscribe': '<https://example.com/unsubscribe?id=123>',
  };

  const result = parseUnsubscribeHeaders(headers);

  assertEquals(result.length, 1);
  assertEquals(result[0].type, 'http');
  assertEquals(result[0].url, 'https://example.com/unsubscribe?id=123');
});

Deno.test('parseUnsubscribeHeaders - parses mailto URL', () => {
  const headers = {
    'list-unsubscribe': '<mailto:unsubscribe@example.com>',
  };

  const result = parseUnsubscribeHeaders(headers);

  assertEquals(result.length, 1);
  assertEquals(result[0].type, 'mailto');
  assertEquals(result[0].url, 'mailto:unsubscribe@example.com');
});

Deno.test('parseUnsubscribeHeaders - parses multiple URLs', () => {
  const headers = {
    'list-unsubscribe': '<https://example.com/unsubscribe>, <mailto:unsubscribe@example.com>',
  };

  const result = parseUnsubscribeHeaders(headers);

  assertEquals(result.length, 2);
  assertEquals(result[0].type, 'http');
  assertEquals(result[1].type, 'mailto');
});

Deno.test('parseUnsubscribeHeaders - handles empty headers', () => {
  const result = parseUnsubscribeHeaders({});
  assertEquals(result.length, 0);
});

Deno.test('parseUnsubscribeHeaders - handles malformed URLs', () => {
  const headers = {
    'list-unsubscribe': 'not a valid url',
  };

  const result = parseUnsubscribeHeaders(headers);
  assertEquals(result.length, 0);
});

Deno.test('extractOneClickUrl - extracts one-click POST URL', () => {
  const headers = {
    'list-unsubscribe': '<https://example.com/unsubscribe?id=123>',
    'list-unsubscribe-post': 'List-Unsubscribe=One-Click',
  };

  const result = extractOneClickUrl(headers);

  assertExists(result);
  assertEquals(result, 'https://example.com/unsubscribe?id=123');
});

Deno.test('extractOneClickUrl - returns null without post header', () => {
  const headers = {
    'list-unsubscribe': '<https://example.com/unsubscribe?id=123>',
  };

  const result = extractOneClickUrl(headers);
  assertEquals(result, null);
});
