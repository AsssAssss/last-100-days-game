# last-100-days backend

Cloudflare Workers + D1 后端：
- 用户名 + PIN 登录（auto-register）
- 5 槽存档读写删
- LLM 代理（藏 key）

## 首次部署清单（你需要做的）

```bash
cd backend
npm install

# 1. 登录 Cloudflare（浏览器会自动弹）
npx wrangler login

# 2. 创建 D1 数据库
npx wrangler d1 create last-100-days
# 把命令输出的 database_id 复制粘贴到 wrangler.toml 里的 database_id 位置

# 3. 应用 schema 到 local + remote
npm run db:apply:local
npm run db:apply:remote

# 4. 设置 secrets（私密变量，不写在 wrangler.toml）
npx wrangler secret put SESSION_SECRET     # 输入任意长字符串，比如 openssl rand -base64 32
npx wrangler secret put LLM_API_KEY        # 你的 one-hub key

# 5. （可选）设置 LLM base URL / model；默认值就是 onehub.akacm.com/claude + claude-sonnet-4-6
npx wrangler secret put LLM_BASE_URL       # https://onehub.akacm.com/claude
npx wrangler secret put LLM_MODEL          # claude-sonnet-4-6

# 6. 部署
npm run deploy
# 输出会给你一个 https://last-100-days-api.<your-account>.workers.dev 的地址
```

## 本地开发

```bash
npx wrangler dev
# 默认 http://localhost:8787
# /health 试试看
```

## 路由

| Method | Path | Auth | 说明 |
|---|---|---|---|
| GET | `/health` | - | 健康检查 |
| POST | `/auth/login` | - | `{username, pin}` → `{userId, token, created}` |
| GET | `/slots` | Bearer | 列出 5 个 slot |
| GET | `/slots/:id` | Bearer | 读单个 slot |
| PUT | `/slots/:id` | Bearer | `{stateJson}` 写 slot |
| DELETE | `/slots/:id` | Bearer | 删 slot |
| POST | `/llm/messages` | Bearer | 转发到 Anthropic Messages API |

## 测试

```bash
npm test               # 单测
npm run test:coverage  # 覆盖率（强制 100%）
```

## 配置 CORS

`wrangler.toml` 里的 `ALLOWED_ORIGINS` 用逗号分隔的允许 origin 列表。本地开发默认包含 `http://localhost:5174`，生产记得加上你 Vercel 的域名。
