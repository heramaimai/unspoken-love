import { NextResponse } from "next/server";
import { runLegacyChatTurn } from "@/lib/chat-service";

export const runtime = "nodejs";
export const maxDuration = 30;

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

type TelegramMessage = {
  message_id: number;
  chat: {
    id: number;
    type: string;
  };
  from?: {
    id: number;
    is_bot?: boolean;
    first_name?: string;
    username?: string;
  };
  text?: string;
};

export async function GET() {
  return NextResponse.json({ ok: true, service: "telegram webhook" });
}

export async function POST(request: Request) {
  try {
    validateTelegramSecret(request);

    const update = (await request.json()) as TelegramUpdate;
    const message = update.message;

    if (!message?.text || !message.from || message.from.is_bot) {
      return NextResponse.json({ ok: true });
    }

    if (!isAllowedTelegramUser(message.from.id)) {
      await sendTelegramMessage(
        message.chat.id,
        `这个未竟之言 Bot 是私人的。你的 Telegram user id 是 ${message.from.id}，如果要开通，把这个 id 加到 TELEGRAM_ALLOWED_USER_IDS。`,
      );
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();
    if (text === "/start") {
      await sendTelegramMessage(message.chat.id, "我在。你可以像平时那样跟我说。");
      return NextResponse.json({ ok: true });
    }

    if (text === "/id") {
      await sendTelegramMessage(message.chat.id, `你的 Telegram user id 是 ${message.from.id}`);
      return NextResponse.json({ ok: true });
    }

    await sendTelegramChatAction(message.chat.id, "typing");

    const result = await runLegacyChatTurn({
      message: text,
    });

    await sendTelegramMessage(message.chat.id, result.reply);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown Telegram error" },
      { status: 500 },
    );
  }
}

function validateTelegramSecret(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expected) {
    return;
  }

  const actual = request.headers.get("x-telegram-bot-api-secret-token");
  if (actual !== expected) {
    throw new Error("Invalid Telegram webhook secret.");
  }
}

function isAllowedTelegramUser(userId: number) {
  const allowed = process.env.TELEGRAM_ALLOWED_USER_IDS;

  if (!allowed) {
    return true;
  }

  return allowed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(String(userId));
}

async function sendTelegramMessage(chatId: number, text: string) {
  return telegramApi("sendMessage", {
    chat_id: chatId,
    text: truncateTelegramText(text),
  });
}

async function sendTelegramChatAction(chatId: number, action: "typing") {
  return telegramApi("sendChatAction", {
    chat_id: chatId,
    action,
  });
}

async function telegramApi(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Telegram ${method} failed: ${response.status} ${errorBody}`);
  }

  return response.json();
}

function truncateTelegramText(text: string) {
  const limit = 3900;
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}
