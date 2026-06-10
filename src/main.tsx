import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './ui/App';
import { AuthClient } from './adapters/auth/AuthClient';
import { ScriptedStoryAdapter } from './adapters/scripted/ScriptedStoryAdapter';
import { StructuredLogger } from './adapters/logger/StructuredLogger';
import { HTTPStorageAdapter } from './adapters/storage/HTTPStorageAdapter';
import { newRequestID } from './adapters/util/requestID';
import { createBrowserSessionStore } from './ui/sessionStore';
import { STORY_CONTENT } from './content';

/**
 * 后端地址。默认 '/api'——生产环境由 vercel.json 的 rewrite 同源代理到 Worker，
 * 浏览器全程只跟当前域名通信（无 CORS、不受 workers.dev 可达性影响）。
 * 本地开发可在 .env.local 覆盖为 http://127.0.0.1:8787 或远程 Worker 地址。
 */
const backendURL = (
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? '/api'
).replace(/\/$/, '');

{
  const logger = new StructuredLogger();
  const sessionStore = createBrowserSessionStore(window.localStorage);
  const getToken = () => sessionStore.get()?.token ?? null;

  const auth = new AuthClient({ baseURL: backendURL });
  const storage = new HTTPStorageAdapter({ baseURL: backendURL, getToken });
  const llm = new ScriptedStoryAdapter(STORY_CONTENT, logger);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App
        deps={{
          llm,
          logger,
          storage,
          auth,
          sessionStore,
          newRequestID,
        }}
      />
    </StrictMode>
  );
}
