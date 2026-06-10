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

const backendURL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '');

if (!backendURL) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML =
      '<div style="padding:32px;color:#f59e0b;font-family:monospace;line-height:1.6">' +
      '请在项目根目录创建 <code>.env.local</code>，填入 <code>VITE_BACKEND_URL</code>。<br/>' +
      '本地开发：<code>http://127.0.0.1:8787</code>（wrangler dev）<br/>' +
      '生产：<code>https://your-worker.workers.dev</code>' +
      '</div>';
  }
} else {
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
