// Token storage and retrieval with encryption

import { getConnection, withTransaction } from '../db/index.ts';
import { encrypt, decrypt } from './encryption.ts';
import { refreshAccessToken, type TokenResponse } from './oauth.ts';

export interface StoredTokens {
  userId: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  scope: string | null;
  expiresAt: Date;
}

const DEFAULT_USER_ID = 'default';

export async function storeTokens(
  tokens: TokenResponse,
  userId: string = DEFAULT_USER_ID,
): Promise<void> {
  const accessTokenEncrypted = await encrypt(tokens.access_token);
  const refreshTokenEncrypted = await encrypt(tokens.refresh_token || '');
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  const sql = getConnection();

  await sql`
    INSERT INTO oauth_tokens (
      user_id, access_token_encrypted, refresh_token_encrypted,
      token_type, scope, expires_at, updated_at
    ) VALUES (
      ${userId}, ${accessTokenEncrypted}, ${refreshTokenEncrypted},
      ${tokens.token_type}, ${tokens.scope}, ${expiresAt}, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      access_token_encrypted = EXCLUDED.access_token_encrypted,
      refresh_token_encrypted = CASE
        WHEN EXCLUDED.refresh_token_encrypted != '' THEN EXCLUDED.refresh_token_encrypted
        ELSE oauth_tokens.refresh_token_encrypted
      END,
      token_type = EXCLUDED.token_type,
      scope = EXCLUDED.scope,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
  `;
}

export async function getTokens(userId: string = DEFAULT_USER_ID): Promise<StoredTokens | null> {
  const sql = getConnection();

  const rows = await sql<
    {
      user_id: string;
      access_token_encrypted: Uint8Array;
      refresh_token_encrypted: Uint8Array;
      token_type: string;
      scope: string | null;
      expires_at: Date;
    }[]
  >`
    SELECT user_id, access_token_encrypted, refresh_token_encrypted, 
           token_type, scope, expires_at
    FROM oauth_tokens
    WHERE user_id = ${userId}
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
    expiresAt: row.expires_at,
  };
}

export async function getValidAccessToken(userId: string = DEFAULT_USER_ID): Promise<string> {
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
      await storeTokens(newTokens, userId);
      return newTokens.access_token;
    } catch (error) {
      // If refresh fails, the refresh token may be invalid
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Token refresh failed: ${message}. Please re-authorize the application.`);
    }
  }

  return tokens.accessToken;
}

export async function deleteTokens(userId: string = DEFAULT_USER_ID): Promise<void> {
  const sql = getConnection();
  await sql`DELETE FROM oauth_tokens WHERE user_id = ${userId}`;
}

export async function hasValidTokens(userId: string = DEFAULT_USER_ID): Promise<boolean> {
  try {
    const tokens = await getTokens(userId);
    return tokens !== null && tokens.refreshToken !== '';
  } catch {
    return false;
  }
}
