import { useEffect, useState, type FormEvent } from 'react';

const STORAGE_KEY = 'last-100-days:passphrase-ok';

interface PassphraseGateProps {
  /** 期望的口令；未设置时不启用门禁。 */
  expected: string | undefined;
  children: React.ReactNode;
}

/**
 * 简单的"口令门"，作为前端嵌 key 部署时的多一层防护。
 * 通过后写 localStorage，本浏览器以后不用再输。
 * 不是真正的安全屏障——绕过只要 F12 读源码就行——只是把 URL 偶然泄露的损失降到最低。
 */
export function PassphraseGate({ expected, children }: PassphraseGateProps) {
  const enabled = !!expected;
  const [unlocked, setUnlocked] = useState(() => {
    if (!enabled) return true;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (unlocked && enabled) {
      try {
        window.localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  }, [unlocked, enabled]);

  if (!enabled || unlocked) return <>{children}</>;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (input === expected) {
      setUnlocked(true);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setInput('');
    }
  }

  return (
    <div
      data-testid="passphrase-gate"
      className="h-screen flex flex-col items-center justify-center bg-black text-neutral-200 gap-8 px-8"
    >
      <div className="text-center">
        <h1 className="text-amber-500 text-3xl tracking-[0.4em] font-bold mb-3">
          末日 100 天
        </h1>
        <p className="text-neutral-600 text-xs tracking-widest">
          INTERNAL TEST · INVITE ONLY
        </p>
      </div>

      <form
        onSubmit={submit}
        className={`flex flex-col gap-3 w-72 ${shake ? 'animate-pulse' : ''}`}
        data-testid="passphrase-form"
      >
        <label htmlFor="passphrase" className="text-neutral-500 text-xs tracking-wider">
          请输入口令
        </label>
        <input
          id="passphrase"
          data-testid="passphrase-input"
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          className="bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded px-3 py-2 text-sm text-neutral-200 focus:outline-none"
        />
        <button
          type="submit"
          data-testid="passphrase-submit"
          className="px-4 py-2 border border-amber-700 bg-amber-950/30 text-amber-400 hover:bg-amber-900/40 rounded text-sm tracking-wider"
        >
          进入
        </button>
      </form>

      <p className="text-neutral-700 text-xs max-w-md text-center leading-relaxed">
        这是一个邀请制内测。如果你应该有口令但忘了，问邀请你来的那位。
      </p>
    </div>
  );
}
