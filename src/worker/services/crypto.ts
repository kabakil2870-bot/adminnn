// Web Crypto API based Security Service (Cloudflare Worker Native)
// No Node.js 'crypto' or 'bcrypt' dependencies used.

const JWT_DEFAULT_SECRET = 'PROPOS_SECURE_WORKER_SECRET_KEY_2026';

/**
 * Generate cryptographically secure random salt hex string
 */
export function generateSalt(length = 16): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash password using Web Crypto API (PBKDF2 with SHA-256)
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordKey = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  return Array.from(new Uint8Array(derivedKey))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify password against stored hash and salt
 */
export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const computedHash = await hashPassword(password, salt);
  return computedHash === hash;
}

/**
 * Sign JWT / HMAC Token using Web Crypto API (HMAC SHA-256)
 */
export async function signJwtToken(payload: Record<string, any>, secretKey: string = JWT_DEFAULT_SECRET, expiresInSeconds = 86400 * 7): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

  const encoder = new TextEncoder();
  const base64UrlHeader = base64UrlEncode(JSON.stringify(header));
  const base64UrlPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const dataToSign = `${base64UrlHeader}.${base64UrlPayload}`;

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(dataToSign)
  );

  const base64UrlSignature = base64UrlEncodeBytes(new Uint8Array(signature));
  return `${dataToSign}.${base64UrlSignature}`;
}

/**
 * Verify JWT Token using Web Crypto API
 */
export async function verifyJwtToken(token: string, secretKey: string = JWT_DEFAULT_SECRET): Promise<Record<string, any> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [base64Header, base64Payload, signature] = parts;
    const dataToVerify = `${base64Header}.${base64Payload}`;

    const encoder = new TextEncoder();
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = base64UrlDecodeBytes(signature);
    const isValid = await globalThis.crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      sigBytes,
      encoder.encode(dataToVerify)
    );

    if (!isValid) return null;

    const payloadObj = JSON.parse(base64UrlDecode(base64Payload));
    if (payloadObj.exp && payloadObj.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payloadObj;
  } catch (err) {
    return null;
  }
}

// Base64URL Helpers
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return base64UrlEncodeBytes(bytes);
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  const bytes = base64UrlDecodeBytes(str);
  return new TextDecoder().decode(bytes);
}

function base64UrlDecodeBytes(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
