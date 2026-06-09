/**
 * LLM 配置存储——玩家在 UI 里填的 API key / base URL / model。
 * 仅存这一个浏览器，不同步到后端（key 永远不离开玩家自己的设备）。
 */

import type { BrowserLLMConfig } from '../adapters/llm/BrowserLLMAdapter';

export interface LLMConfigStore {
  get(): BrowserLLMConfig | null;
  set(config: BrowserLLMConfig | null): void;
}

const STORAGE_KEY = 'last-100-days:llm-config';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createBrowserLLMConfigStore(storage: StorageLike): LLMConfigStore {
  return {
    get() {
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<BrowserLLMConfig>;
        if (
          typeof parsed.apiKey !== 'string' ||
          typeof parsed.baseURL !== 'string' ||
          typeof parsed.model !== 'string'
        ) {
          return null;
        }
        return parsed as BrowserLLMConfig;
      } catch {
        return null;
      }
    },
    set(config) {
      try {
        if (config) {
          storage.setItem(STORAGE_KEY, JSON.stringify(config));
        } else {
          storage.removeItem(STORAGE_KEY);
        }
      } catch {
        /* swallow */
      }
    },
  };
}
