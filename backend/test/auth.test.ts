import { describe, it, expect } from 'vitest';
import {
  authGuard,
  loginOrRegister,
  validatePin,
  validateUsername,
} from '../src/auth';
import { signToken } from '../src/crypto';
import { createFakeDb } from './fakeDb';

const SECRET = 'unit-test-secret';

describe('validateUsername', () => {
  it.each(['xiaoxue', '小雪', 'user_1', 'A.b-C', '12345', 'a'])('accepts %s', (u) => {
    expect(validateUsername(u)).toBe(true);
  });
  it.each(['', ' ', 'has space', 'has@symbol', 'a'.repeat(33)])(
    'rejects %s',
    (u) => {
      expect(validateUsername(u)).toBe(false);
    }
  );
});

describe('validatePin', () => {
  it.each(['1234', '0000', '9999'])('accepts %s', (p) => {
    expect(validatePin(p)).toBe(true);
  });
  it.each(['', '123', '12345', 'abcd', '12a4'])('rejects %s', (p) => {
    expect(validatePin(p)).toBe(false);
  });
});

describe('loginOrRegister', () => {
  it('creates a new user on first login with that username', async () => {
    const db = createFakeDb();
    const r = await loginOrRegister(
      { username: 'xiaoxue', pin: '1234' },
      { db, secret: SECRET }
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.created).toBe(true);
      expect(r.userId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(r.token).toMatch(/^[^.]+\.[^.]+$/);
    }
  });

  it('returns existing user with same PIN', async () => {
    const db = createFakeDb();
    const a = await loginOrRegister(
      { username: 'xiaoxue', pin: '1234' },
      { db, secret: SECRET }
    );
    const b = await loginOrRegister(
      { username: 'xiaoxue', pin: '1234' },
      { db, secret: SECRET }
    );
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.userId).toBe(b.userId);
      expect(b.created).toBe(false);
    }
  });

  it('rejects login with wrong PIN for existing user', async () => {
    const db = createFakeDb();
    await loginOrRegister(
      { username: 'xiaoxue', pin: '1234' },
      { db, secret: SECRET }
    );
    const r = await loginOrRegister(
      { username: 'xiaoxue', pin: '0000' },
      { db, secret: SECRET }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('wrong_pin');
  });

  it.each([
    [{ username: '', pin: '1234' }],
    [{ username: 'has space', pin: '1234' }],
    [{ username: 'xiaoxue', pin: '12' }],
    [{ username: 'xiaoxue', pin: 'abcd' }],
  ])('rejects invalid input %j', async (input) => {
    const db = createFakeDb();
    const r = await loginOrRegister(input, { db, secret: SECRET });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_input');
  });

  it('uses injected now() so created_at matches', async () => {
    const db = createFakeDb();
    const FIXED = 1_700_000_000_000;
    await loginOrRegister(
      { username: 'xiaoxue', pin: '1234' },
      { db, secret: SECRET, now: () => FIXED }
    );
    const stored = [...db.store.users.values()][0]!;
    expect(stored.created_at).toBe(Math.floor(FIXED / 1000));
  });
});

describe('authGuard', () => {
  async function setupUser() {
    const db = createFakeDb();
    const login = await loginOrRegister(
      { username: 'xiaoxue', pin: '1234' },
      { db, secret: SECRET }
    );
    if (!login.ok) throw new Error('setup failed');
    return { db, userId: login.userId, token: login.token };
  }

  it('passes a fresh Bearer token', async () => {
    const { db, userId, token } = await setupUser();
    const r = await authGuard(`Bearer ${token}`, { db, secret: SECRET });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.userId).toBe(userId);
  });

  it('rejects when Authorization header is missing', async () => {
    const { db } = await setupUser();
    const r = await authGuard(null, { db, secret: SECRET });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing');
  });

  it('rejects malformed Authorization header', async () => {
    const { db } = await setupUser();
    const r = await authGuard('Basic foo', { db, secret: SECRET });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing');
  });

  it('rejects forged or invalid token', async () => {
    const { db } = await setupUser();
    const r = await authGuard('Bearer not.a.token', { db, secret: SECRET });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid');
  });

  it('rejects token whose user no longer exists', async () => {
    const { db } = await setupUser();
    const orphan = await signToken('ghost-user-id', SECRET);
    const r = await authGuard(`Bearer ${orphan}`, { db, secret: SECRET });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('user_gone');
  });
});
