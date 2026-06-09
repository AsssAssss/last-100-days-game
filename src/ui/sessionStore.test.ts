import { describe, it, expect } from 'vitest';
import { createBrowserSessionStore, type StorageLike } from './sessionStore';

function makeMem(): StorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
}

describe('createBrowserSessionStore', () => {
  it('returns null when nothing stored', () => {
    const s = createBrowserSessionStore(makeMem());
    expect(s.get()).toBeNull();
  });

  it('round-trips a session', () => {
    const s = createBrowserSessionStore(makeMem());
    s.set({ userId: 'u', token: 't', username: 'xiaoxue' });
    expect(s.get()).toEqual({ userId: 'u', token: 't', username: 'xiaoxue' });
  });

  it('clears the session when passed null', () => {
    const mem = makeMem();
    const s = createBrowserSessionStore(mem);
    s.set({ userId: 'u', token: 't', username: 'x' });
    s.set(null);
    expect(s.get()).toBeNull();
  });

  it('returns null when storage holds corrupt JSON', () => {
    const mem = makeMem();
    mem.store.set('last-100-days:session', '{bad');
    const s = createBrowserSessionStore(mem);
    expect(s.get()).toBeNull();
  });

  it('swallows read errors', () => {
    const mem: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    const s = createBrowserSessionStore(mem);
    expect(s.get()).toBeNull();
  });

  it('swallows write errors', () => {
    const mem: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    };
    const s = createBrowserSessionStore(mem);
    expect(() => s.set({ userId: 'u', token: 't', username: 'x' })).not.toThrow();
  });

  it('swallows remove errors', () => {
    const mem: StorageLike = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const s = createBrowserSessionStore(mem);
    expect(() => s.set(null)).not.toThrow();
  });
});
