import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Anthropic from '@anthropic-ai/sdk';
import './index.css';
import { App } from './ui/App';
import { ClaudeLLMAdapter } from './adapters/llm/ClaudeLLMAdapter';
import { StructuredLogger } from './adapters/logger/StructuredLogger';
import { LocalStorageAdapter } from './adapters/storage/LocalStorageAdapter';
import { newRequestID } from './adapters/util/requestID';

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
const model = (import.meta.env.VITE_ANTHROPIC_MODEL as string | undefined) ?? 'claude-sonnet-4-6';
const baseURL = import.meta.env.VITE_ANTHROPIC_BASE_URL as string | undefined;

if (!apiKey) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML =
      '<div style="padding:32px;color:#f59e0b;font-family:monospace">' +
      '请在项目根目录创建 <code>.env.local</code>，参考 <code>.env.example</code> 填入 VITE_ANTHROPIC_API_KEY' +
      '</div>';
  }
} else {
  const logger = new StructuredLogger();
  const anthropic = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    ...(baseURL ? { baseURL } : {}),
  });
  const llm = new ClaudeLLMAdapter(anthropic, { model }, logger);
  const storage = new LocalStorageAdapter(window.localStorage);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App deps={{ llm, logger, storage, newRequestID }} />
    </StrictMode>
  );
}
