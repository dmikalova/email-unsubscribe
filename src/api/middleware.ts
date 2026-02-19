// Authentication middleware - validates Supabase JWT from session cookie

import { verify } from "djwt";
import { type Context, type Next } from "hono";

function getSessionDomain(): string {
  return Deno.env.get("SESSION_DOMAIN") || "mklv.tech";
}

function getLoginUrl(returnUrl?: string): string {
  const loginBase = `https://login.${getSessionDomain()}`;
  if (returnUrl) {
    return `${loginBase}?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
  return loginBase;
}

export interface SessionData {
  userId: string;
  email: string;
  expiresAt: Date;
}

// Cached CryptoKey for JWT verification
let jwtKey: CryptoKey | null = null;
let jwtKeyFetchedAt: number = 0;
const KEY_CACHE_TTL = 3600 * 1000; // 1 hour cache

interface JWK {
  kty: string;
  crv: string;
  x: string;
  y: string;
  kid: string;
  alg: string;
}

/**
 * Fetch the JWKS from Supabase and import the ES256 public key.
 * Caches the key for 1 hour to handle key rotation.
 */
async function getJwtKey(): Promise<CryptoKey> {
  const now = Date.now();

  // Return cached key if still valid
  if (jwtKey && now - jwtKeyFetchedAt < KEY_CACHE_TTL) {
    return jwtKey;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL environment variable is required");
  }

  // Fetch JWKS from Supabase
  const jwksUrl = `${
    supabaseUrl.replace(/\/$/, "")
  }/auth/v1/.well-known/jwks.json`;
  const response = await fetch(jwksUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }

  const jwks = (await response.json()) as { keys: JWK[] };

  if (!jwks.keys || jwks.keys.length === 0) {
    throw new Error("No keys found in JWKS");
  }

  // Use the first ES256 key
  const jwk = jwks.keys.find((k: JWK) => k.alg === "ES256");
  if (!jwk) {
    throw new Error("No ES256 key found in JWKS");
  }

  // Import the JWK as a CryptoKey
  jwtKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );

  jwtKeyFetchedAt = now;
  console.log("JWT key fetched from JWKS");

  return jwtKey;
}

/**
 * Validate a Supabase JWT and extract session data.
 *
 * Validates:
 * - Signature using ES256 with Supabase JWKS public key
 * - Audience is "authenticated"
 * - Issuer matches expected Supabase project URL
 * - Token is not expired (with minimal clock skew tolerance)
 */
async function validateSession(token: string): Promise<SessionData | null> {
  try {
    const key = await getJwtKey();

    // Verify and decode the JWT
    const payload = await verify(token, key);

    // Verify audience
    if (payload.aud !== "authenticated") {
      console.warn("JWT validation failed: invalid audience");
      return null;
    }

    // Verify issuer (Supabase project URL)
    const expectedIssuer = Deno.env.get("SUPABASE_URL");
    if (expectedIssuer) {
      const issuerBase = expectedIssuer.replace(/\/$/, "");
      const payloadIssuer = (payload.iss as string)?.replace(/\/$/, "");
      if (payloadIssuer && !payloadIssuer.startsWith(issuerBase)) {
        console.warn("JWT validation failed: invalid issuer");
        return null;
      }
    }

    // Check expiration (djwt already validates exp, but we double-check with minimal skew)
    const exp = payload.exp as number;
    if (!exp) {
      console.warn("JWT validation failed: missing expiration");
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const clockSkewTolerance = 60; // 1 minute tolerance
    if (exp + clockSkewTolerance < now) {
      console.warn("JWT validation failed: token expired");
      return null;
    }

    // Extract user info
    const sub = payload.sub as string;
    const email = payload.email as string;

    if (!sub) {
      console.warn("JWT validation failed: missing subject");
      return null;
    }

    return {
      userId: sub,
      email: email || "",
      expiresAt: new Date(exp * 1000),
    };
  } catch (_err) {
    // Don't log the actual error details to avoid leaking sensitive info
    console.warn("JWT validation failed: verification error");
    return null;
  }
}

/**
 * Authentication middleware - validates session cookie containing Supabase JWT.
 *
 * On invalid/missing session: redirects to login portal with returnUrl.
 */
export async function authMiddleware(c: Context, next: Next) {
  // Skip auth for health check and OAuth routes
  const path = c.req.path;
  if (path === "/health" || path.startsWith("/oauth/")) {
    return next();
  }

  // In development, skip auth if configured
  if (Deno.env.get("SKIP_AUTH") === "true") {
    c.set("user", { userId: "dev", email: "dev@localhost" });
    return next();
  }

  // Build return URL for login redirect
  const protocol = c.req.header("X-Forwarded-Proto") || "https";
  const host = c.req.header("Host") || "";
  const returnUrl = `${protocol}://${host}${c.req.path}`;

  // Get session cookie
  const sessionCookie = c.req
    .header("Cookie")
    ?.split(";")
    .find((cookie) => cookie.trim().startsWith("session="));

  if (!sessionCookie) {
    return c.redirect(getLoginUrl(returnUrl));
  }

  const sessionToken = sessionCookie.split("=")[1]?.trim();
  if (!sessionToken) {
    return c.redirect(getLoginUrl(returnUrl));
  }

  // Validate JWT
  const session = await validateSession(sessionToken);
  if (!session) {
    return c.redirect(getLoginUrl(returnUrl));
  }

  // Set user in context
  c.set("user", session);

  return next();
}

// Rate limiting middleware
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

export async function rateLimitMiddleware(c: Context, next: Next) {
  const ip = c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") ||
    "unknown";
  const now = Date.now();

  let entry = requestCounts.get(ip);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_WINDOW };
    requestCounts.set(ip, entry);
  }

  entry.count++;

  if (entry.count > RATE_LIMIT) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  // Add rate limit headers
  c.header("X-RateLimit-Limit", RATE_LIMIT.toString());
  c.header(
    "X-RateLimit-Remaining",
    Math.max(0, RATE_LIMIT - entry.count).toString(),
  );
  c.header("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000).toString());

  await next();
}

// CSRF protection middleware
export async function csrfMiddleware(c: Context, next: Next) {
  // Skip CSRF for GET requests and OAuth routes
  if (c.req.method === "GET" || c.req.path.startsWith("/oauth/")) {
    await next();
    return;
  }

  const csrfToken = c.req.header("X-CSRF-Token");
  const cookieToken = c.req
    .header("Cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("csrf="))
    ?.split("=")[1]
    ?.trim();

  // In development, skip CSRF if configured
  if (Deno.env.get("SKIP_CSRF") === "true") {
    await next();
    return;
  }

  if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
    return c.json({ error: "Invalid CSRF token" }, 403);
  }

  await next();
}

// Generate CSRF token
export function generateCsrfToken(): string {
  return crypto.randomUUID();
}

// Secure cookie settings
export function getSecureCookieOptions() {
  const isProduction = Deno.env.get("NODE_ENV") === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 24 * 60 * 60, // 24 hours
  };
}
