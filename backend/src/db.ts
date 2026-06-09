/**
 * D1 数据访问层。所有 SQL 都集中在这里，业务层只看得到普通 async 函数。
 */

export interface UserRow {
  id: string;
  username: string;
  pin_salt: string;
  pin_hash: string;
  created_at: number;
}

export interface SlotRow {
  user_id: string;
  slot_id: number;
  state_json: string;
  updated_at: number;
}

/** D1Database 的最小子集，方便测试时 mock。 */
export interface D1Like {
  prepare(query: string): D1PreparedStatementLike;
}

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ success?: boolean }>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

export async function findUserByUsername(
  db: D1Like,
  username: string
): Promise<UserRow | null> {
  return db
    .prepare('SELECT id, username, pin_salt, pin_hash, created_at FROM users WHERE username = ?1 COLLATE NOCASE')
    .bind(username)
    .first<UserRow>();
}

export async function findUserById(db: D1Like, id: string): Promise<UserRow | null> {
  return db
    .prepare('SELECT id, username, pin_salt, pin_hash, created_at FROM users WHERE id = ?1')
    .bind(id)
    .first<UserRow>();
}

export async function createUser(
  db: D1Like,
  row: UserRow
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO users (id, username, pin_salt, pin_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5)'
    )
    .bind(row.id, row.username, row.pin_salt, row.pin_hash, row.created_at)
    .run();
}

export async function listSlotsByUser(
  db: D1Like,
  userId: string
): Promise<SlotRow[]> {
  const result = await db
    .prepare('SELECT user_id, slot_id, state_json, updated_at FROM slots WHERE user_id = ?1')
    .bind(userId)
    .all<SlotRow>();
  return result.results;
}

export async function getSlot(
  db: D1Like,
  userId: string,
  slotId: number
): Promise<SlotRow | null> {
  return db
    .prepare('SELECT user_id, slot_id, state_json, updated_at FROM slots WHERE user_id = ?1 AND slot_id = ?2')
    .bind(userId, slotId)
    .first<SlotRow>();
}

export async function upsertSlot(
  db: D1Like,
  row: SlotRow
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO slots (user_id, slot_id, state_json, updated_at)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(user_id, slot_id) DO UPDATE SET
         state_json = excluded.state_json,
         updated_at = excluded.updated_at`
    )
    .bind(row.user_id, row.slot_id, row.state_json, row.updated_at)
    .run();
}

export async function deleteSlot(
  db: D1Like,
  userId: string,
  slotId: number
): Promise<void> {
  await db
    .prepare('DELETE FROM slots WHERE user_id = ?1 AND slot_id = ?2')
    .bind(userId, slotId)
    .run();
}
