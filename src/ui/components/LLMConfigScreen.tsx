import { useState, type FormEvent } from 'react';
import type { BrowserLLMConfig } from '../../adapters/llm/BrowserLLMAdapter';

interface LLMConfigScreenProps {
  initial?: BrowserLLMConfig | null;
  defaults: { readonly baseURL: string; readonly model: string };
  onSave: (config: BrowserLLMConfig) => void;
  onCancel?: () => void;
  username?: string;
}

export function LLMConfigScreen({
  initial,
  defaults,
  onSave,
  onCancel,
  username,
}: LLMConfigScreenProps) {
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '');
  const [baseURL, setBaseURL] = useState(initial?.baseURL ?? defaults.baseURL);
  const [model, setModel] = useState(initial?.model ?? defaults.model);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave({
      apiKey: apiKey.trim(),
      baseURL: baseURL.trim().replace(/\/$/, ''),
      model: model.trim(),
    });
  }

  const valid = apiKey.trim().length > 0 && baseURL.trim().length > 0 && model.trim().length > 0;

  return (
    <div
      data-testid="llm-config-screen"
      className="h-screen flex flex-col items-center justify-center bg-black text-neutral-200 gap-8 px-8"
    >
      <div className="text-center">
        <h1 className="text-amber-500 text-3xl tracking-[0.4em] font-bold mb-3">
          LLM 设置
        </h1>
        {username && (
          <p className="text-neutral-500 text-xs tracking-widest mb-3">{username}</p>
        )}
        <p className="text-neutral-600 text-xs max-w-md mx-auto leading-relaxed">
          因为渠道限制，每位玩家用自己的 API key。<br />
          填一次保存在本浏览器，下次不用再填。<br />
          key 不会上传到任何服务器，只在你浏览器里直接调 LLM。
        </p>
      </div>

      <form
        data-testid="llm-config-form"
        onSubmit={submit}
        className="flex flex-col gap-3 w-96"
      >
        <label htmlFor="llm-key" className="text-neutral-500 text-xs tracking-wider">
          API Key
        </label>
        <input
          id="llm-key"
          data-testid="llm-key"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-xxx 或 sk-ant-xxx"
          className="bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-700 focus:outline-none"
        />

        <label htmlFor="llm-base-url" className="text-neutral-500 text-xs tracking-wider mt-2">
          Base URL（Anthropic 兼容端点的根地址）
        </label>
        <input
          id="llm-base-url"
          data-testid="llm-base-url"
          type="text"
          autoComplete="off"
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          className="bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded px-3 py-2 text-sm text-neutral-200 focus:outline-none"
        />

        <label htmlFor="llm-model" className="text-neutral-500 text-xs tracking-wider mt-2">
          模型名
        </label>
        <input
          id="llm-model"
          data-testid="llm-model"
          type="text"
          autoComplete="off"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded px-3 py-2 text-sm text-neutral-200 focus:outline-none"
        />

        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            data-testid="llm-config-save"
            disabled={!valid}
            className="flex-1 px-4 py-2 border border-amber-700 bg-amber-950/30 text-amber-400 hover:bg-amber-900/40 disabled:opacity-30 disabled:cursor-not-allowed rounded text-sm tracking-wider"
          >
            保存并进入
          </button>
          {onCancel && (
            <button
              type="button"
              data-testid="llm-config-cancel"
              onClick={onCancel}
              className="px-4 py-2 border border-neutral-700 text-neutral-400 hover:text-neutral-200 rounded text-sm tracking-wider"
            >
              取消
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
