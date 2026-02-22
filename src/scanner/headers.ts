// Email header parsing utilities

import type { GmailHeader } from "../gmail/index.ts";

export interface UnsubscribeInfo {
  listUnsubscribe: string[];
  listUnsubscribePost: boolean;
  oneClickUrl: string | null;
  mailtoUrl: string | null;
  httpUrls: string[];
}

export function parseListUnsubscribeHeader(
  headers: GmailHeader[],
): UnsubscribeInfo {
  const result: UnsubscribeInfo = {
    listUnsubscribe: [],
    listUnsubscribePost: false,
    oneClickUrl: null,
    mailtoUrl: null,
    httpUrls: [],
  };

  const listUnsubscribe = getHeader(headers, "List-Unsubscribe");
  const listUnsubscribePost = getHeader(headers, "List-Unsubscribe-Post");

  if (!listUnsubscribe) {
    return result;
  }

  // Check for RFC 8058 one-click support
  if (
    listUnsubscribePost?.toLowerCase().includes("list-unsubscribe=one-click")
  ) {
    result.listUnsubscribePost = true;
  }

  // Parse the List-Unsubscribe header
  // Format: <mailto:unsub@example.com>, <https://example.com/unsub>
  const urls = parseListUnsubscribeValue(listUnsubscribe);
  result.listUnsubscribe = urls;

  for (const url of urls) {
    if (url.startsWith("mailto:")) {
      result.mailtoUrl = url;
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      result.httpUrls.push(url);

      // If one-click is supported, the first HTTP URL is the one-click URL
      if (result.listUnsubscribePost && !result.oneClickUrl) {
        result.oneClickUrl = url;
      }
    }
  }

  return result;
}

function parseListUnsubscribeValue(value: string): string[] {
  const urls: string[] = [];
  const regex = /<([^>]+)>/g;
  let match;

  while ((match = regex.exec(value)) !== null) {
    urls.push(match[1].trim());
  }

  return urls;
}

export function getHeader(headers: GmailHeader[], name: string): string | null {
  const header = headers.find((h) =>
    h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value ?? null;
}

export function getSender(headers: GmailHeader[]): string | null {
  // Try From header first, then Sender
  const from = getHeader(headers, "From");
  if (from) {
    return extractEmailAddress(from);
  }

  const sender = getHeader(headers, "Sender");
  if (sender) {
    return extractEmailAddress(sender);
  }

  return null;
}

export function extractEmailAddress(headerValue: string): string | null {
  // Handle formats like:
  // "Name <email@example.com>"
  // "<email@example.com>"
  // "email@example.com"
  const angleMatch = headerValue.match(/<([^>]+)>/);
  if (angleMatch) {
    return normalizeEmail(angleMatch[1]);
  }

  // Try to extract email directly
  const emailMatch = headerValue.match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    return normalizeEmail(emailMatch[0]);
  }

  return null;
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function extractDomain(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) {
    throw new Error(`Invalid email address: ${email}`);
  }
  return parts[1].toLowerCase();
}

export function getSubject(headers: GmailHeader[]): string | null {
  return getHeader(headers, "Subject");
}

export function getDate(headers: GmailHeader[]): Date | null {
  const dateStr = getHeader(headers, "Date");
  if (!dateStr) return null;

  try {
    return new Date(dateStr);
  } catch {
    return null;
  }
}
