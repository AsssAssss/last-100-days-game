import { useState, type FormEvent } from 'react';
import type { LoginResult } from '../../adapters/auth/AuthClient';

interface LoginScreenProps {
  onLogin: (username: string, pin: string) => Promise<LoginResult>;
  /** 测试关闭动画 */
  animate?: boolean;
}

export function LoginScreen({ onLogin, animate = true }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrorMsg(null);
    const result = await onLogin(username.trim(), pin.trim());
    if (!result.ok) {
      setErrorMsg(errorLabel(result));
    }
    setBusy(false);
  }

  const fade = animate ? 'animate-[fadeIn_700ms_ease-out]' : '';

  return (
    <div
      data-testid="login-screen"
      className={`h-screen flex flex-col items-center justify-center bg-black text-neutral-200 gap-10 px-8 ${fade}`}
    >
      <div className="text-center">
        <h1 className="text-amber-500 text-5xl tracking-[0.4em] font-bold mb-3">
          末日 100 天
        </h1>
        <p className="text-neutral-500 text-sm tracking-widest">
          LAST · 100 · DAYS
        </p>
        <p className="text-neutral-600 text-xs mt-6 max-w-md mx-auto leading-relaxed">
          首次输入用户名 + 4 位 PIN 即创建账号。<br />
          下次回来用同样的用户名 + PIN，存档自动同步。
        </p>
      </div>

      <form
        onSubmit={submit}
        data-testid="login-form"
        className="flex flex-col gap-3 w-72"
      >
        <label htmlFor="login-username" className="text-neutral-500 text-xs tracking-wider">
          用户名
        </label>
        <input
          id="login-username"
          data-testid="login-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={32}
          disabled={busy}
          autoFocus
          className="bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded px-3 py-2 text-sm text-neutral-200 focus:outline-none disabled:opacity-50"
        />

        <label htmlFor="login-pin" className="text-neutral-500 text-xs tracking-wider mt-1">
          PIN（4 位数字）
        </label>
        <input
          id="login-pin"
          data-testid="login-pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          autoComplete="current-password"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          disabled={busy}
          className="bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded px-3 py-2 text-sm text-neutral-200 focus:outline-none disabled:opacity-50 tracking-[0.4em]"
        />

        {errorMsg !== null && (
          <div
            data-testid="login-error"
            className="text-red-400 text-xs tracking-wider mt-2"
          >
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          data-testid="login-submit"
          disabled={busy || !username.trim() || pin.length !== 4}
          className="mt-3 px-4 py-2 border border-amber-700 bg-amber-950/30 text-amber-400 hover:bg-amber-900/40 disabled:opacity-30 disabled:cursor-not-allowed rounded text-sm tracking-wider"
        >
          {busy ? '验证中…' : '进入'}
        </button>
      </form>

      <div className="text-neutral-700 text-xs">
        每局都不一样 · 由 Claude 即兴叙事
      </div>
    </div>
  );
}

function errorLabel(result: LoginResult): string {
  if (result.ok) return '';
  switch (result.error) {
    case 'invalid_input':
      return '用户名或 PIN 格式不对。用户名 1-32 字符；PIN 必须 4 位数字。';
    case 'wrong_pin':
      return 'PIN 不对。如果你忘了，请换个用户名重新注册。';
    case 'network':
      return `网络错误：${result.message ?? '未知'}`;
    case 'server':
      return `服务器错误：${result.message ?? '未知'}`;
  }
}
