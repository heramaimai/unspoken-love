import { NextResponse } from "next/server";
import { generatePersonaReply } from "@/lib/chat-model";
import type { ChatMessage, PersonaProfile } from "@/lib/types";

export const runtime = "nodejs";

type ChatRequest = {
  persona?: PersonaProfile;
  history?: ChatMessage[];
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const message = body.message?.trim();
    const persona = body.persona;

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    if (!persona) {
      return NextResponse.json({ error: "persona is required" }, { status: 400 });
    }

    const reply = await generatePersonaReply({
      persona,
      history: body.history || [],
      message,
    });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "聊天失败" },
      { status: 500 },
    );
  }
}
