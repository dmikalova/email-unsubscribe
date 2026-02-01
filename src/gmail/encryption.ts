// Token encryption utilities using AES-256-GCM

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Uint8Array {
  const keyBase64 = Deno.env.get('ENCRYPTION_KEY');
  if (!keyBase64) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  if (keyBytes.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits) base64 encoded');
  }

  return keyBytes;
}

async function getCryptoKey(): Promise<CryptoKey> {
  const keyBytes = getEncryptionKey();
  return await crypto.subtle.importKey('raw', keyBytes, { name: ALGORITHM }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encrypt(plaintext: string): Promise<Uint8Array> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encodedText);

  // Combine IV + ciphertext (which includes auth tag)
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv);
  result.set(new Uint8Array(ciphertext), iv.length);

  return result;
}

export async function decrypt(encrypted: Uint8Array): Promise<string> {
  const key = await getCryptoKey();

  // Extract IV and ciphertext
  const iv = encrypted.slice(0, IV_LENGTH);
  const ciphertext = encrypted.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);

  return new TextDecoder().decode(decrypted);
}
