// Unit tests for HTML link extraction

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { extractUnsubscribeLinksFromHtml } from '../../src/scanner/html.ts';

Deno.test('extractUnsubscribeLinksFromHtml - finds unsubscribe link by text', () => {
  const html = `
    <html>
      <body>
        <a href="https://example.com/unsubscribe">Unsubscribe</a>
      </body>
    </html>
  `;

  const links = extractUnsubscribeLinksFromHtml(html);

  assertEquals(links.length, 1);
  assertEquals(links[0].url, 'https://example.com/unsubscribe');
});

Deno.test('extractUnsubscribeLinksFromHtml - finds unsubscribe link by URL pattern', () => {
  const html = `
    <html>
      <body>
        <a href="https://example.com/unsubscribe?id=123">Click here</a>
      </body>
    </html>
  `;

  const links = extractUnsubscribeLinksFromHtml(html);

  assertEquals(links.length, 1);
  assertEquals(links[0].url, 'https://example.com/unsubscribe?id=123');
});

Deno.test('extractUnsubscribeLinksFromHtml - finds opt-out links', () => {
  const html = `
    <html>
      <body>
        <a href="https://example.com/opt-out">Opt out of emails</a>
      </body>
    </html>
  `;

  const links = extractUnsubscribeLinksFromHtml(html);

  assertEquals(links.length, 1);
});

Deno.test('extractUnsubscribeLinksFromHtml - finds manage preferences links', () => {
  const html = `
    <html>
      <body>
        <a href="https://example.com/preferences">Manage email preferences</a>
      </body>
    </html>
  `;

  const links = extractUnsubscribeLinksFromHtml(html);

  assertEquals(links.length >= 1, true);
});

Deno.test('extractUnsubscribeLinksFromHtml - ignores non-unsubscribe links', () => {
  const html = `
    <html>
      <body>
        <a href="https://example.com/">Home</a>
        <a href="https://example.com/about">About Us</a>
        <a href="https://example.com/contact">Contact</a>
      </body>
    </html>
  `;

  const links = extractUnsubscribeLinksFromHtml(html);

  assertEquals(links.length, 0);
});

Deno.test('extractUnsubscribeLinksFromHtml - handles empty HTML', () => {
  const links = extractUnsubscribeLinksFromHtml('');
  assertEquals(links.length, 0);
});

Deno.test('extractUnsubscribeLinksFromHtml - handles malformed HTML', () => {
  const html = '<a href="https://example.com/unsubscribe">Unsubscribe';
  
  const links = extractUnsubscribeLinksFromHtml(html);
  assertEquals(links.length >= 0, true); // Should not throw
});

Deno.test('extractUnsubscribeLinksFromHtml - deduplicates links', () => {
  const html = `
    <html>
      <body>
        <a href="https://example.com/unsubscribe">Unsubscribe</a>
        <a href="https://example.com/unsubscribe">Unsubscribe from emails</a>
      </body>
    </html>
  `;

  const links = extractUnsubscribeLinksFromHtml(html);
  const uniqueUrls = new Set(links.map(l => l.url));

  assertEquals(uniqueUrls.size, links.length);
});
