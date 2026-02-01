// URL validation and sanitization utilities

// Private IP ranges to block (SSRF prevention)
const PRIVATE_IP_RANGES = [
  /^127\./,                    // Loopback
  /^10\./,                     // Class A private
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Class B private
  /^192\.168\./,               // Class C private
  /^169\.254\./,               // Link-local
  /^0\./,                      // Current network
  /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // Carrier-grade NAT
  /^::1$/,                     // IPv6 loopback
  /^fe80:/i,                   // IPv6 link-local
  /^fc00:/i,                   // IPv6 unique local
  /^fd00:/i,                   // IPv6 unique local
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '[::]',
  '[::1]',
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

export function validateUnsubscribeUrl(url: string): ValidationResult {
  // Check if URL is provided
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  // Trim whitespace
  const trimmedUrl = url.trim();

  // Parse URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Validate scheme (HTTP/HTTPS only)
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { valid: false, error: `Invalid scheme: ${parsedUrl.protocol}` };
  }

  // Check for blocked hostnames
  const hostname = parsedUrl.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { valid: false, error: 'Blocked hostname' };
  }

  // Check for private IP addresses
  if (isPrivateIp(hostname)) {
    return { valid: false, error: 'Private IP addresses are not allowed' };
  }

  // Check for IP address in hostname (potential SSRF bypass)
  if (isIpAddress(hostname)) {
    // Allow only if it's not a private IP (already checked above)
    // But log a warning
    console.warn(`Direct IP address in unsubscribe URL: ${hostname}`);
  }

  // Sanitize URL
  const sanitizedUrl = sanitizeUrl(parsedUrl);

  return { valid: true, sanitizedUrl };
}

function isPrivateIp(hostname: string): boolean {
  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(hostname)) {
      return true;
    }
  }
  return false;
}

function isIpAddress(hostname: string): boolean {
  // IPv4
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(hostname)) {
    return true;
  }

  // IPv6 (simplified check)
  if (hostname.includes(':')) {
    return true;
  }

  return false;
}

function sanitizeUrl(url: URL): string {
  // Remove credentials if present
  url.username = '';
  url.password = '';

  // Normalize path
  // Remove double slashes (except in protocol)
  let path = url.pathname.replace(/\/+/g, '/');
  
  // Remove path traversal attempts
  path = path.replace(/\.\./g, '');
  
  url.pathname = path;

  return url.toString();
}

export function validateMailtoUrl(url: string): ValidationResult {
  if (!url.startsWith('mailto:')) {
    return { valid: false, error: 'Not a mailto URL' };
  }

  // Extract email address
  const withoutScheme = url.slice(7);
  const queryStart = withoutScheme.indexOf('?');
  const email = queryStart > -1 ? withoutScheme.slice(0, queryStart) : withoutScheme;

  // Basic email validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { valid: false, error: 'Invalid email address in mailto URL' };
  }

  return { valid: true, sanitizedUrl: url };
}

export function parseMailtoUrl(url: string): { to: string; subject?: string; body?: string } | null {
  if (!url.startsWith('mailto:')) {
    return null;
  }

  const withoutScheme = url.slice(7);
  const queryStart = withoutScheme.indexOf('?');
  
  const to = queryStart > -1 ? withoutScheme.slice(0, queryStart) : withoutScheme;
  
  let subject: string | undefined;
  let body: string | undefined;

  if (queryStart > -1) {
    const params = new URLSearchParams(withoutScheme.slice(queryStart + 1));
    subject = params.get('subject') ?? undefined;
    body = params.get('body') ?? undefined;
  }

  return { to: decodeURIComponent(to), subject, body };
}
