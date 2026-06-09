import type { IStoragePort } from '../../application/ports/IStoragePort';
import type { GameState } from '../../domain/entities/GameState';
import type { SlotId, SlotSummary } from '../../domain/entities/SaveSlot';

export interface HTTPStorageConfig {
  readonly baseURL: string;
  /** 返回当前会话 token；返回 null 时所有调用都抛"未登录"错。 */
  readonly getToken: () => string | null;
  /** 注入 fetch，便于测试。 */
  readonly fetchImpl?: typeof fetch;
}

interface SlotPayload {
  readonly id: number;
  readonly isEmpty: boolean;
  readonly stateJson?: string;
  readonly updatedAt?: number;
}

export class HTTPStorageAdapter implements IStoragePort {
  private readonly baseURL: string;
  private readonly getToken: () => string | null;
  private readonly fetchImpl: typeof fetch;

  constructor(config: HTTPStorageConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, '');
    this.getToken = config.getToken;
    this.fetchImpl = config.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  async listSlots(): Promise<readonly SlotSummary[]> {
    const data = await this.request<{ slots: SlotPayload[] }>('GET', '/slots');
    return data.slots.map(payloadToSummary);
  }

  async loadSlot(id: SlotId): Promise<GameState | null> {
    const data = await this.request<{ slot: SlotPayload }>('GET', `/slots/${id}`);
    if (data.slot.isEmpty || !data.slot.stateJson) return null;
    return JSON.parse(data.slot.stateJson) as GameState;
  }

  async saveSlot(id: SlotId, state: GameState): Promise<void> {
    await this.request('PUT', `/slots/${id}`, { stateJson: JSON.stringify(state) });
  }

  async clearSlot(id: SlotId): Promise<void> {
    await this.request('DELETE', `/slots/${id}`);
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = this.getToken();
    if (!token) throw new Error('not_authenticated');
    const resp = await this.fetchImpl(`${this.baseURL}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`${method} ${path} failed: ${resp.status} ${text}`);
    }
    if (resp.status === 204) return undefined as T;
    return (await resp.json()) as T;
  }
}

function payloadToSummary(p: SlotPayload): SlotSummary {
  if (p.isEmpty || !p.stateJson) {
    return { id: p.id, isEmpty: true };
  }
  let state: GameState;
  try {
    state = JSON.parse(p.stateJson) as GameState;
  } catch {
    return { id: p.id, isEmpty: true };
  }
  return {
    id: p.id,
    isEmpty: false,
    day: state.day,
    updatedAt: p.updatedAt ? p.updatedAt * 1000 : undefined,
    isGameOver: state.isGameOver,
    gameOverReason: state.gameOverReason,
  };
}
