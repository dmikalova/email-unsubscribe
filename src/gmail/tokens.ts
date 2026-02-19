// Token storage and retrieval with encryption

import { getConnection } from '../db/index.ts';
import { decrypt, encrypt } from './encryption.ts';
import { refreshAccessToken, type TokenResponse } from './oauth.ts';

export interface StoredTokens {
  userId: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  scope: string | null;
  connectedEmail: string | null;
  expiresAt: Date;
}

export async function storeTokens(
  tokens: TokenResponse,
  userId: string,
  connectedEmail?: string,
): Promise<void> {
  const accessTokenEncrypted = await encrypt(tokens.access_token);
  const refreshTokenEncrypted = await encrypt(tokens.refresh_token || '');
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  const sql = getConnection();

  await sql`
    INSERT INTO oauth_tokens (
      user_id, access_token_encrypted, refresh_token_encrypted,
      token_type, scope, connected_email, expires_at, updated_at
    ) VALUES (
      ${userId}::uuid, ${accessTokenEncrypted}, ${refreshTokenEncrypted},
      ${tokens.token_type}, ${tokens.scope}, ${connectedEmail || null}, ${expiresAt}, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      access_token_encrypted = EXCLUDED.access_token_encrypted,
      refresh_token_encrypted = CASE
        WHEN EXCLUDED.refresh_token_encrypted != '' THEN EXCLUDED.refresh_token_encrypted
        ELSE oauth_tokens.refresh_token_encrypted
      END,
      token_type = EXCLUDED.token_type,
      scope = EXCLUDED.scope,
      connected_email = COALESCE(EXCLUDED.connected_email, oauth_tokens.connected_email),
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
  `;
}

export async function getTokens(userId: string): Promise<StoredTokens | null> {
  const sql = getConnection();

  const rows = await sql<
    {
      user_id: string;
      access_token_encrypted: Uint8Array;
      refresh_token_encrypted: Uint8Array;
      token_type: string;
      scope: string | null;
      connected_email: string | null;
      expires_at: Date;
    }[]
  >`
    SELECT user_id, access_token_encrypted, refresh_token_encrypted,
           token_type, scope, connected_email, expires_at
    FROM oauth_tokens
    WHERE user_id = ${userId}::uuid
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  return {
    userId: row.user_id,
    accessToken: await decrypt(row.access_token_encrypted),
    refreshToken: await decrypt(row.refresh_token_encrypted),
    tokenType: row.token_type,
    scope: row.scope,
    connectedEmail: row.connected_email,
    expiresAt: row.expires_at,
  };
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const tokens = await getTokens(userId);

  if (!tokens) {
    throw new Error('No tokens found. Please authorize the application first.');
  }

  // Check if token is expired or will expire in the next minute
  const expirationBuffer = 60 * 1000; // 1 minute
  if (tokens.expiresAt.getTime() - expirationBuffer <= Date.now()) {
    // Token expired or expiring soon, refresh it
    console.log('Access token expired, refreshing...');

    if (!tokens.refreshToken) {
      throw new Error('Refresh token not available. Please re-authorize the application.');
    }

    try {
      const newTokens = await refreshAccessToken(tokens.refreshToken);
      await storeTokens(newTokens, userId, tokens.connectedEmail || undefined);
      return newTokens.access_token;
    } catch (error) {
      // If refresh fails, the refresh token may be invalid
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Token refresh failed: ${message}. Please re-authorize the application.`);
    }
  }

  return tokens.accessToken;
}

export async function deleteTokens(userId: string): Promise<void> {
  const sql = getConnection();
  await sql`DELETE FROM oauth_tokens WHERE user_id = ${userId}::uuid`;
}

export async function hasValidTokens(userId: string): Promise<boolean> {
  try {
    const tokens = await getTokens(userId);
    return tokens !== null && tokens.refreshToken !== '';
  } catch {
    return false;
  }
}

export interface TokenHealth {
  hasTokens: boolean;
  tokenValid: boolean;
  connectedEmail: string | null;
  expiresAt: Date | null;
  error?: string;
}

/**
 * Check the health of stored OAuth tokens.
 * Attempts to get a valid access token (refreshing if needed) to verify tokens work.
 */
export async function checkTokenHealth(userId: string): Promise<TokenHealth> {
  const tokens = await getTokens(userId);

  if (!tokens) {
    return {
      hasTokens: false,
      tokenValid: false,
      connectedEmail: null,
      expiresAt: null,
    };
  }

  try {
    // Try to get a valid access token (this will refresh if needed)
    await getValidAccessToken(userId);
    return {
      hasTokens: true,
      tokenValid: true,
      connectedEmail: tokens.connectedEmail,
      expiresAt: tokens.expiresAt,
    };
  } catch (err) {
    return {
      hasTokens: true,
      tokenValid: false,
      connectedEmail: tokens.connectedEmail,
      expiresAt: tokens.expiresAt,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
