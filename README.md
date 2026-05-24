# 咨询间隙陪伴代理

一个最小可运行的 Next.js + Supabase pgvector 原型，用来上传多份咨询逐字稿、切片、生成 embedding、累积咨询师风格画像、检索历史片段，并生成带边界声明的陪伴回应。

## 本地启动

1. 安装依赖：

```bash
npm install
```

2. 在 Supabase SQL Editor 执行：

```bash
supabase/schema.sql
```

如果你已经执行过旧版 schema，只需要补执行：

```bash
supabase/add_therapist_profiles.sql
```

3. 复制环境变量：

```bash
cp .env.example .env
```

4. 填入 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`OPENAI_API_KEY`。

5. 启动：

```bash
npm run dev
```

## API

- `POST /api/transcripts/upload`
  - body: `{ "userId": "demo-user", "title": "第一次咨询", "transcript": "T: ...\nC: ..." }`
  - 或 body: `{ "userId": "demo-user", "transcripts": [{ "title": "A.txt", "transcript": "..." }] }`
  - 返回切片、标签和更新后的咨询师风格画像。

- `POST /api/chat`
  - body: `{ "userId": "demo-user", "message": "我今天又很想逃开" }`
  - 检索相关片段，生成回应，并保存本轮对话为新 memory。

## 重要边界

系统提示词要求模型回应像咨询工作方式，但明确不能声称自己就是咨询师本人，也不能替代危机干预或医疗建议。

## 本地网络连不上 OpenAI 时

如果本机访问 OpenAI 超时，可以先在 `.env` 中使用本地开发 embedding，跑通上传、检索和 Supabase 流程：

```bash
EMBEDDING_PROVIDER=local
```

如果聊天模型也要换成豆包/火山方舟：

```bash
AI_PROVIDER=doubao
DOUBAO_API_KEY=你的火山方舟 API Key
DOUBAO_CHAT_MODEL=你的方舟推理接入点 ID
DOUBAO_CHAT_BASE_URL=https://ark.cn-beijing.volces.com/api/v3/chat/completions
```

注意：`local` embedding 只适合本地验证流程，不适合正式效果评估。正式版本建议统一使用稳定的线上 embedding 模型，并让 Supabase `vector(...)` 维度与该模型输出维度一致。

## Telegram Bot 接入

1. 在 Telegram 找 `@BotFather` 创建 bot，拿到 `TELEGRAM_BOT_TOKEN`。
2. 给 `.env` / Vercel 环境变量增加：

```bash
TELEGRAM_BOT_TOKEN=123456:your-telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=replace-with-a-long-random-secret
TELEGRAM_ALLOWED_USER_IDS=你的 Telegram user id
TELEGRAM_APP_USER_ID=demo-user
```

3. 部署到 Vercel 后，设置 webhook：

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://你的域名/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

4. 第一次不知道自己的 Telegram user id 时，可以先临时不设置 `TELEGRAM_ALLOWED_USER_IDS`，给 bot 发 `/id`，拿到 id 后再填回环境变量。

注意：Telegram 需要公网 HTTPS URL，所以本地 `localhost:3001` 不能直接作为 webhook。开发时可以用 ngrok/cloudflared 暴露本地地址，正式使用建议部署到 Vercel。
