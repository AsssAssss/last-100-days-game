/**
 * Cloudflare Worker env 绑定（wrangler.toml 配置 + secret）。
 */
export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  SESSION_SECRET: string;
  LLM_API_KEY: string;
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
}
