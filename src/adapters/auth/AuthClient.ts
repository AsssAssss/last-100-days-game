/**
 * 调后端 /auth/login 的小客户端。
 * 后端首次某 username 自动注册，之后按 PIN 校验。
 */
export interface AuthClientConfig {
  readonly baseURL: string;
  readonly fetchImpl?: typeof fetch;
}

export interface LoginSuccess {
  readonly ok: true;
  readonly userId: string;
  readonly token: string;
  readonly created: boolean;
}

export interface LoginFailure {
  readonly ok: false;
  readonly error: 'invalid_input' | 'wrong_pin' | 'network' | 'server';
  readonly message?: string;
}

export type LoginResult = LoginSuccess | LoginFailure;

export class AuthClient {
  private readonly baseURL: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: AuthClientConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, '');
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async login(username: string, pin: string): Promise<LoginResult> {
    let resp: Response;
    try {
      resp = await this.fetchImpl(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });
    } catch (err) {
      return { ok: false, error: 'network', message: err instanceof Error ? err.message : String(err) };
    }
    if (resp.status === 400) {
      return { ok: false, error: 'invalid_input' };
    }
    if (resp.status === 401) {
      return { ok: false, error: 'wrong_pin' };
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return { ok: false, error: 'server', message: `${resp.status} ${text}` };
    }
    const body = (await resp.json()) as {
      userId: string;
      token: string;
      created: boolean;
    };
    return { ok: true, userId: body.userId, token: body.token, created: body.created };
  }
}
