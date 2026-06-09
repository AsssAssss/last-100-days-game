/**
 * 测试用的内存版 D1。
 * 不实现全 SQL，只识别我们 db.ts 里写的那几条语句。
 */
import type {
  D1Like,
  D1PreparedStatementLike,
  SlotRow,
  UserRow,
} from '../src/db';

interface FakeStore {
  users: Map<string, UserRow>; // by id
  slots: Map<string, SlotRow>; // by `${user_id}:${slot_id}`
}

function makeStore(): FakeStore {
  return { users: new Map(), slots: new Map() };
}

const SQL_FIND_USER_BY_USERNAME = /SELECT .* FROM users WHERE username = \?1/i;
const SQL_FIND_USER_BY_ID = /SELECT .* FROM users WHERE id = \?1/;
const SQL_INSERT_USER = /INSERT INTO users/;
const SQL_LIST_SLOTS = /SELECT .* FROM slots WHERE user_id = \?1$/m;
const SQL_GET_SLOT = /SELECT .* FROM slots WHERE user_id = \?1 AND slot_id = \?2/;
const SQL_UPSERT_SLOT = /INSERT INTO slots/;
const SQL_DELETE_SLOT = /DELETE FROM slots/;

function makeStatement(store: FakeStore, query: string, args: unknown[] = []): D1PreparedStatementLike {
  const stmt: D1PreparedStatementLike = {
    bind(...values: unknown[]) {
      return makeStatement(store, query, values);
    },
    async first<T = unknown>(): Promise<T | null> {
      if (SQL_FIND_USER_BY_USERNAME.test(query)) {
        const name = (args[0] as string).toLowerCase();
        for (const u of store.users.values()) {
          if (u.username.toLowerCase() === name) return u as unknown as T;
        }
        return null;
      }
      if (SQL_FIND_USER_BY_ID.test(query)) {
        return (store.users.get(args[0] as string) ?? null) as T | null;
      }
      if (SQL_GET_SLOT.test(query)) {
        const key = `${args[0]}:${args[1]}`;
        return (store.slots.get(key) ?? null) as T | null;
      }
      throw new Error(`fakeDb: unsupported first() query: ${query}`);
    },
    async run(): Promise<{ success?: boolean }> {
      if (SQL_INSERT_USER.test(query)) {
        const [id, username, pin_salt, pin_hash, created_at] = args as [
          string, string, string, string, number,
        ];
        if ([...store.users.values()].some((u) => u.username.toLowerCase() === username.toLowerCase())) {
          throw new Error('UNIQUE constraint failed: users.username');
        }
        store.users.set(id, { id, username, pin_salt, pin_hash, created_at });
        return { success: true };
      }
      if (SQL_UPSERT_SLOT.test(query)) {
        const [user_id, slot_id, state_json, updated_at] = args as [
          string, number, string, number,
        ];
        store.slots.set(`${user_id}:${slot_id}`, { user_id, slot_id, state_json, updated_at });
        return { success: true };
      }
      if (SQL_DELETE_SLOT.test(query)) {
        store.slots.delete(`${args[0]}:${args[1]}`);
        return { success: true };
      }
      throw new Error(`fakeDb: unsupported run() query: ${query}`);
    },
    async all<T = unknown>(): Promise<{ results: T[] }> {
      if (SQL_LIST_SLOTS.test(query)) {
        const userId = args[0] as string;
        const rows: SlotRow[] = [];
        for (const r of store.slots.values()) {
          if (r.user_id === userId) rows.push(r);
        }
        return { results: rows as unknown as T[] };
      }
      throw new Error(`fakeDb: unsupported all() query: ${query}`);
    },
  };
  return stmt;
}

export function createFakeDb(): D1Like & { store: FakeStore } {
  const store = makeStore();
  return {
    store,
    prepare(query: string) {
      return makeStatement(store, query);
    },
  };
}
