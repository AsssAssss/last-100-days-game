/**
 * 登录 / 注册业务逻辑。
 * 首次某个 username 登录自动注册；之后必须 PIN 对得上才能进。
 */
import { hashPin, newUserId, signToken, verifyPin, verifyToken } from './crypto';
import { createUser, findUserById, findUserByUsername, type D1Like } from './db';

const MIN_USERNAME = 1;
const MAX_USERNAME = 32;
const PIN_PATTERN = /^\d{4}$/;
const USERNAME_PATTERN = /^[\w一-龥\-.]+$/;

export interface LoginInput {
  readonly username: string;
  readonly pin: string;
}

export type LoginOutcome =
  | { readonly ok: true; readonly userId: string; readonly token: string; readonly created: boolean }
  | { readonly ok: false; readonly error: 'invalid_input' | 'wrong_pin' };

export interface LoginDeps {
  readonly db: D1Like;
  readonly secret: string;
  readonly now?: () => number;
}

export function validateUsername(username: string): boolean {
  return (
    typeof username === 'string' &&
    username.length >= MIN_USERNAME &&
    username.length <= MAX_USERNAME &&
    USERNAME_PATTERN.test(username)
  );
}

export function validatePin(pin: string): boolean {
  return typeof pin === 'string' && PIN_PATTERN.test(pin);
}

/**
 * 登录-或-注册。若 username 不存在则新建用户并登录；
 * 若已存在则比对 PIN，对得上才发 token，否则拒绝。
 */
export async function loginOrRegister(
  input: LoginInput,
  deps: LoginDeps
): Promise<LoginOutcome> {
  if (!validateUsername(input.username) || !validatePin(input.pin)) {
    return { ok: false, error: 'invalid_input' };
  }

  const nowFn = deps.now ?? (() => Date.now());
  const existing = await findUserByUsername(deps.db, input.username);

  if (existing) {
    const match = await verifyPin(input.pin, existing.pin_salt, existing.pin_hash);
    if (!match) return { ok: false, error: 'wrong_pin' };
    const token = await signToken(existing.id, deps.secret, nowFn());
    return { ok: true, userId: existing.id, token, created: false };
  }

  const { salt, hash } = await hashPin(input.pin);
  const userId = newUserId();
  await createUser(deps.db, {
    id: userId,
    username: input.username,
    pin_salt: salt,
    pin_hash: hash,
    created_at: Math.floor(nowFn() / 1000),
  });
  const token = await signToken(userId, deps.secret, nowFn());
  return { ok: true, userId, token, created: true };
}

export interface AuthGuardDeps {
  readonly db: D1Like;
  readonly secret: string;
  readonly now?: () => number;
}

export type AuthGuardResult =
  | { readonly ok: true; readonly userId: string }
  | { readonly ok: false; readonly reason: 'missing' | 'invalid' | 'user_gone' };

/**
 * 从 Authorization: Bearer <token> 头还原 user。
 * 顺便确认用户记录还在（防止已删账户的 token 还能用）。
 */
export async function authGuard(
  authHeader: string | null,
  deps: AuthGuardDeps
): Promise<AuthGuardResult> {
  if (!authHeader) return { ok: false, reason: 'missing' };
  const m = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!m || !m[1]) return { ok: false, reason: 'missing' };
  const nowFn = deps.now ?? (() => Date.now());
  const verify = await verifyToken(m[1], deps.secret, nowFn());
  if (!verify.valid || !verify.payload) return { ok: false, reason: 'invalid' };
  const user = await findUserById(deps.db, verify.payload.sub);
  if (!user) return { ok: false, reason: 'user_gone' };
  return { ok: true, userId: user.id };
}
