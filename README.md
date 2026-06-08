# 末日 100 天

LLM 驱动的文字冒险游戏。丧尸末日，100 天生存。剧情、NPC、事件、结局完全由 Claude Sonnet 4.6 即兴生成，引擎只负责硬约束（资源消耗、死亡判定、防止 LLM 乱发物资）。每局都不一样。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置 API key（DO NOT commit）
cp .env.example .env.local
# 编辑 .env.local，填入你的 VITE_ANTHROPIC_API_KEY
# 在 https://console.anthropic.com/ 申请

# 3. 启动
npm run dev
# 打开 http://localhost:5174
```

> ⚠️ 这是一款"自己玩"的本地应用——前端直连 Claude API，key 嵌在前端 bundle 中。**不要直接部署到公网**。后续如需分享，应加一层后端（Cloudflare Workers / Vercel）藏住 key 并做限额。

## 玩法

- 每天会出现一个情境，3 个快捷选项 + 一个自由输入框
- 资源（HP / 精神 / 食物 / 水 / 弹药）任一归零即死
- 活到 Day 100 通关
- 存档自动写 localStorage，刷新页面继续

## 项目结构

```
src/
├── domain/         # 业务实体 + 规则（无外部依赖，可纯单测）
├── application/    # Use Cases + ports
├── adapters/       # LLM/存储/日志的实现
└── ui/             # React 组件与 hook
```

依赖方向：`ui → application → domain`；`adapters` 实现 `application/ports` 暴露的接口。详见 `~/.claude/clean-architecture.md`。

## 命令

| 命令 | 用途 |
|---|---|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产包 |
| `npm test` | 跑单测 + DOM 测试 (vitest + jsdom) |
| `npm run test:coverage` | 跑测试 + 覆盖率（强制 100% 分支/函数/行/语句） |
| `npm run test:e2e` | 跑 Playwright 端到端测试（首次需 `npx playwright install`） |
| `npm run lint` | ESLint |

## 测试策略

- **单元测试** (`*.test.ts`): 覆盖 `domain` + `application` + `adapters` 全部分支
- **React 组件 DOM 测试** (`*.test.tsx`): 用 `@testing-library/react` 在 jsdom 中渲染并断言
- **Playwright E2E** (`tests/e2e/*.spec.ts`): 在真实 Chromium 中跑，拦截 Anthropic API 返回 mock

## 调试 LLM 调用

每次 LLM 调用都会在浏览器 Console 打 structured debug log（含 `requestID` / `feature` / `action` / `req` / `resp`）。打开 DevTools → Console 即可查看。

如果发现 LLM 给出不合理的状态变化（如凭空 +HP），会自动 clamp 并在 console 打 `warn` 日志。

## 设计文档

设计与决策见 `~/.claude/plans/linear-singing-pixel.md`。
