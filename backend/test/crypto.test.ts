import { describe, it, expect } from 'vitest';
import {
  hashPin,
  newUserId,
  signToken,
  verifyPin,
  verifyToken,
} from '../src/crypto';

describe('hashPin / verifyPin', () => {
  it('produces matching hash for the same pin+salt', async () => {
    const { salt, hash } = await hashPin('1234');
    expect(await verifyPin('1234', salt, hash)).toBe(true);
  });

  it('rejects wrong pin', async () => {
    const { salt, hash } = await hashPin('1234');
    expect(await verifyPin('9999', salt, hash)).toBe(false);
  });

  it('produces different salts on consecutive calls without provided salt', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('deterministic when salt is provided', async () => {
    const a = await hashPin('1234', '0011223344556677889900aabbccddee');
    const b = await hashPin('1234', '0011223344556677889900aabbccddee');
    expect(a.hash).toBe(b.hash);
  });

  it('throws on odd-length hex salt', async () => {
    await expect(hashPin('1234', 'abc')).rejects.toThrow(/hex/);
  });
});

describe('signToken / verifyToken', () => {
  const SECRET = 'super-secret-test-key';

  it('round-trips user id', async () => {
    const t = await signToken('user-1', SECRET, 1_700_000_000_000);
    const v = await verifyToken(t, SECRET, 1_700_000_000_000);
    expect(v.valid).toBe(true);
    expect(v.payload?.sub).toBe('user-1');
  });

  it('rejects forged signature', async () => {
    const t = await signToken('user-1', SECRET);
    const tampered = t.slice(0, -2) + 'AA';
    const v = await verifyToken(tampered, SECRET);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('bad_signature');
  });

  it('rejects expired token', async () => {
    const past = 1_500_000_000_000;
    const tok = await signToken('user-1', SECRET, past);
    const v = await verifyToken(tok, SECRET, Date.now());
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('expired');
  });

  it.each(['', 'no-dot', 'a.', '.b', 'malformed.payload'])(
    'rejects malformed token %s',
    async (bad) => {
      const v = await verifyToken(bad, SECRET);
      expect(v.valid).toBe(false);
    }
  );

  it('rejects token signed with different secret', async () => {
    const t = await signToken('user-1', SECRET);
    const v = await verifyToken(t, 'other-secret');
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('bad_signature');
  });

  it('rejects payload with non-string sub', async () => {
    // Manually craft a token with a malformed payload (sub is number) but valid HMAC.
    const enc = new TextEncoder();
    const payload = JSON.stringify({ sub: 123, exp: Math.floor(Date.now() / 1000) + 60 });
    const body = btoa(payload)
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)));
    let bin = '';
    for (const b of sig) bin += String.fromCharCode(b);
    const sigB64 = btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const v = await verifyToken(`${body}.${sigB64}`, SECRET);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('malformed');
  });

  it('rejects payload that is not valid JSON', async () => {
    // Sign garbage as body; verification of HMAC will pass, JSON.parse fails → malformed.
    const enc = new TextEncoder();
    const body = btoa('not json{')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)));
    let bin = '';
    for (const b of sig) bin += String.fromCharCode(b);
    const sigB64 = btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const v = await verifyToken(`${body}.${sigB64}`, SECRET);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('malformed');
  });

  it('rejects token with invalid base64url signature', async () => {
    const v = await verifyToken('abc.!!!invalid', SECRET);
    expect(v.valid).toBe(false);
  });
});

describe('newUserId', () => {
  it('returns unique UUID-like strings', () => {
    const a = newUserId();
    const b = newUserId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
