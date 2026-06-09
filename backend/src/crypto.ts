/**
 * PIN 哈希 + 会话 token 的纯函数集合。
 * 仅依赖 Web Crypto API（Workers 与 Node 20+ 原生支持）。
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 天

const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('invalid hex');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlToBytes(s: string): Uint8Array {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = norm + '='.repeat((4 - (norm.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** 常数时间字符串比较，防止 timing attack。 */
function constantTimeEqual(a: string, b: string): boolean {
  let mismatch = a.length ^ b.length;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export interface PinHashResult {
  readonly salt: string;
  readonly hash: string;
}

export async function hashPin(
  pin: string,
  saltHex?: string
): Promise<PinHashResult> {
  const salt = saltHex
    ? hexToBytes(saltHex)
    : crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      hash: 'SHA-256',
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    256
  );
  return { salt: bytesToHex(salt), hash: bytesToHex(new Uint8Array(bits)) };
}

export async function verifyPin(
  pin: string,
  saltHex: string,
  expectedHashHex: string
): Promise<boolean> {
  const { hash } = await hashPin(pin, saltHex);
  return constantTimeEqual(hash, expectedHashHex);
}

export interface TokenPayload {
  readonly sub: string; // user_id
  readonly exp: number; // unix seconds
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signToken(
  userId: string,
  secret: string,
  now: number = Date.now()
): Promise<string> {
  const payload: TokenPayload = {
    sub: userId,
    exp: Math.floor(now / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(sig))}`;
}

export interface TokenVerifyResult {
  readonly valid: boolean;
  readonly payload?: TokenPayload;
  readonly reason?: 'malformed' | 'bad_signature' | 'expired';
}

export async function verifyToken(
  token: string,
  secret: string,
  now: number = Date.now()
): Promise<TokenVerifyResult> {
  const dot = token.indexOf('.');
  if (dot < 0 || dot === token.length - 1) {
    return { valid: false, reason: 'malformed' };
  }
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const key = await hmacKey(secret);
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64UrlToBytes(sig);
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  const ok = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes as BufferSource,
    encoder.encode(body)
  );
  if (!ok) return { valid: false, reason: 'bad_signature' };
  let payload: TokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as TokenPayload;
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') {
    return { valid: false, reason: 'malformed' };
  }
  if (payload.exp < Math.floor(now / 1000)) {
    return { valid: false, reason: 'expired' };
  }
  return { valid: true, payload };
}

/** 生成新用户 id（UUID v4）。 */
export function newUserId(): string {
  return crypto.randomUUID();
}
