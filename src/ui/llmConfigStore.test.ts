import { describe, it, expect } from 'vitest';
import { createBrowserLLMConfigStore, type StorageLike } from './llmConfigStore';

function makeMem(): StorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
}

const VALID = {
  apiKey: 'sk',
  baseURL: 'https://onehub.akacm.com/claude',
  model: 'claude-sonnet-4-6',
};

describe('createBrowserLLMConfigStore', () => {
  it('returns null initially', () => {
    expect(createBrowserLLMConfigStore(makeMem()).get()).toBeNull();
  });

  it('round-trips a config', () => {
    const s = createBrowserLLMConfigStore(makeMem());
    s.set(VALID);
    expect(s.get()).toEqual(VALID);
  });

  it('clears on null', () => {
    const s = createBrowserLLMConfigStore(makeMem());
    s.set(VALID);
    s.set(null);
    expect(s.get()).toBeNull();
  });

  it('returns null on corrupt JSON', () => {
    const mem = makeMem();
    mem.store.set('last-100-days:llm-config', '{bad');
    expect(createBrowserLLMConfigStore(mem).get()).toBeNull();
  });

  it.each([
    { baseURL: 'x', model: 'y' }, // missing apiKey
    { apiKey: 'x', model: 'y' },
    { apiKey: 'x', baseURL: 'y' },
    {},
  ])('returns null when stored shape is invalid: %j', (bad) => {
    const mem = makeMem();
    mem.store.set('last-100-days:llm-config', JSON.stringify(bad));
    expect(createBrowserLLMConfigStore(mem).get()).toBeNull();
  });

  it('swallows storage errors on get', () => {
    const mem: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(createBrowserLLMConfigStore(mem).get()).toBeNull();
  });

  it('swallows storage errors on set', () => {
    const mem: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    };
    expect(() => createBrowserLLMConfigStore(mem).set(VALID)).not.toThrow();
  });

  it('swallows storage errors on remove', () => {
    const mem: StorageLike = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {
        throw new Error('x');
      },
    };
    expect(() => createBrowserLLMConfigStore(mem).set(null)).not.toThrow();
  });
});
