/**
 * 会话存储抽象：保存登录后拿到的 token + userId。
 * 浏览器实现写 localStorage；测试里可以传任意实现。
 */

export interface Session {
  readonly userId: string;
  readonly token: string;
  readonly username: string;
}

export interface SessionStore {
  get(): Session | null;
  set(session: Session | null): void;
}

const SESSION_KEY = 'last-100-days:session';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createBrowserSessionStore(storage: StorageLike): SessionStore {
  return {
    get() {
      try {
        const raw = storage.getItem(SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as Session;
      } catch {
        return null;
      }
    },
    set(session) {
      try {
        if (session) {
          storage.setItem(SESSION_KEY, JSON.stringify(session));
        } else {
          storage.removeItem(SESSION_KEY);
        }
      } catch {
        /* swallow quota errors */
      }
    },
  };
}
