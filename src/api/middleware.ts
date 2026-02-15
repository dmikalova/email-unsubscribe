// Authentication middleware - validates session from main domain

import { type Context, type Next } from 'hono';

function getSessionDomain(): string {
  return Deno.env.get('SESSION_DOMAIN') || 'cddc39.tech';
}

function getAuthRedirectUrl(): string {
  return `https://${getSessionDomain()}/login`;
}

export interface SessionData {
  userId: string;
  email: string;
  expiresAt: Date;
}

// Middleware to validate session cookie from main domain
export async function authMiddleware(c: Context, next: Next) {
  // Skip auth for health check and OAuth routes
  const path = c.req.path;
  if (path === '/health' || path.startsWith('/oauth/')) {
    return next();
  }

  // In development, skip auth if configured
  if (Deno.env.get('SKIP_AUTH') === 'true') {
    c.set('user', { userId: 'dev', email: 'dev@localhost' });
    return next();
  }

  // Get session cookie from main domain
  const sessionCookie = c.req
    .header('Cookie')
    ?.split(';')
    .find((c) => c.trim().startsWith('session='));

  if (!sessionCookie) {
    // Redirect to main domain login
    return c.redirect(getAuthRedirectUrl());
  }

  const sessionToken = sessionCookie.split('=')[1]?.trim();

  if (!sessionToken) {
    return c.redirect(getAuthRedirectUrl());
  }

  // Validate session with main domain
  // This is a placeholder - actual implementation depends on main domain's auth system
  const session = await validateSession(sessionToken);

  if (!session) {
    return c.redirect(getAuthRedirectUrl());
  }

  // Check session expiration
  if (new Date(session.expiresAt) < new Date()) {
    return c.redirect(getAuthRedirectUrl());
  }

  // Set user in context
  c.set('user', session);

  return next();
}

// Placeholder for session validation
// In production, this would call the main domain's session validation endpoint
function validateSession(token: string): SessionData | null {
  // TODO: Implement actual session validation
  // For now, return a mock session if token exists

  // Example: Call main domain's session endpoint
  // const response = await fetch(`https://${SESSION_DOMAIN}/api/session/validate`, {
  //   headers: { Authorization: `Bearer ${token}` }
  // });
  // if (!response.ok) return null;
  // return response.json();

  // Mock implementation for development
  if (token) {
    return {
      userId: 'user-1',
      email: 'user@example.com',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  return null;
}

// Rate limiting middleware
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

export async function rateLimitMiddleware(c: Context, next: Next) {
  const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown';
  const now = Date.now();

  let entry = requestCounts.get(ip);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_WINDOW };
    requestCounts.set(ip, entry);
  }

  entry.count++;

  if (entry.count > RATE_LIMIT) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  // Add rate limit headers
  c.header('X-RateLimit-Limit', RATE_LIMIT.toString());
  c.header('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT - entry.count).toString());
  c.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000).toString());

  await next();
}

// CSRF protection middleware
export async function csrfMiddleware(c: Context, next: Next) {
  // Skip CSRF for GET requests and OAuth routes
  if (c.req.method === 'GET' || c.req.path.startsWith('/oauth/')) {
    await next();
    return;
  }

  const csrfToken = c.req.header('X-CSRF-Token');
  const cookieToken = c.req
    .header('Cookie')
    ?.split(';')
    .find((c) => c.trim().startsWith('csrf='))
    ?.split('=')[1]
    ?.trim();

  // In development, skip CSRF if configured
  if (Deno.env.get('SKIP_CSRF') === 'true') {
    await next();
    return;
  }

  if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
    return c.json({ error: 'Invalid CSRF token' }, 403);
  }

  await next();
}

// Generate CSRF token
export function generateCsrfToken(): string {
  return crypto.randomUUID();
}

// Secure cookie settings
export function getSecureCookieOptions() {
  const isProduction = Deno.env.get('NODE_ENV') === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
  };
}
