let counter = 0;

/** 生成简单的链路追踪 id：时间戳 + 计数 + 随机串。 */
export function newRequestID(): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}-${counter}-${rand}`;
}
