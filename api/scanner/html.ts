// HTML body unsubscribe link extraction

export interface ExtractedLink {
  url: string;
  text: string;
  confidence: number;
}

const UNSUBSCRIBE_PATTERNS = [
  /unsubscribe/i,
  /opt[- ]?out/i,
  /remove[- ]?me/i,
  /stop[- ]?emails/i,
  /manage[- ]?preferences/i,
  /email[- ]?preferences/i,
  /subscription[- ]?settings/i,
  /click[- ]?here[- ]?to[- ]?unsubscribe/i,
];

const HIGH_CONFIDENCE_PATTERNS = [/\bunsubscribe\b/i, /\bopt[- ]?out\b/i];

export function extractUnsubscribeLinksFromHtml(html: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];

  // Simple regex-based link extraction
  // Match <a> tags with href
  const linkRegex =
    /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    const text = stripHtmlTags(match[2]).trim();
    const fullMatch = match[0];

    // Skip empty or invalid URLs
    if (!url || !url.startsWith("http")) {
      continue;
    }

    // Check if this looks like an unsubscribe link
    const combinedText = `${url} ${text} ${fullMatch}`;
    const matchesPattern = UNSUBSCRIBE_PATTERNS.some((pattern) =>
      pattern.test(combinedText)
    );

    if (matchesPattern) {
      const confidence = calculateConfidence(url, text, fullMatch);
      links.push({ url, text, confidence });
    }
  }

  // Sort by confidence (highest first)
  links.sort((a, b) => b.confidence - a.confidence);

  // Deduplicate by URL
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.url)) {
      return false;
    }
    seen.add(link.url);
    return true;
  });
}

function calculateConfidence(
  url: string,
  text: string,
  _fullMatch: string,
): number {
  let confidence = 0;

  // Check URL
  if (HIGH_CONFIDENCE_PATTERNS.some((p) => p.test(url))) {
    confidence += 0.4;
  } else if (UNSUBSCRIBE_PATTERNS.some((p) => p.test(url))) {
    confidence += 0.2;
  }

  // Check link text
  if (HIGH_CONFIDENCE_PATTERNS.some((p) => p.test(text))) {
    confidence += 0.4;
  } else if (UNSUBSCRIBE_PATTERNS.some((p) => p.test(text))) {
    confidence += 0.2;
  }

  // Bonus for exact "unsubscribe" text
  if (/^unsubscribe$/i.test(text.trim())) {
    confidence += 0.2;
  }

  // Penalty for very long link text (probably not a dedicated unsubscribe link)
  if (text.length > 100) {
    confidence -= 0.1;
  }

  // Bonus for common unsubscribe URL patterns
  if (/\/unsubscribe|\/unsub|\/optout|\/opt-out/i.test(url)) {
    confidence += 0.2;
  }

  return Math.min(1, Math.max(0, confidence));
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

export function decodeBase64Url(data: string): string {
  // Convert URL-safe base64 to standard base64
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if needed
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  return atob(padded);
}

export function getHtmlBodyFromPayload(payload: {
  mimeType?: string;
  body?: { data?: string };
  parts?: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }[];
}): string | null {
  // Direct HTML body
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Check parts recursively
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }

      // Recursive check for nested parts
      if (part.parts) {
        const nested = getHtmlBodyFromPayload(part as typeof payload);
        if (nested) return nested;
      }
    }
  }

  return null;
}
