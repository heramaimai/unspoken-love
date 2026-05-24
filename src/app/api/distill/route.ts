import { NextResponse } from "next/server";
import { hasEnoughMaterial } from "@/lib/material-guide";
import { distillPersonaProfile } from "@/lib/distill-model";
import type { CreatePersonaInput } from "@/lib/types";

export const runtime = "nodejs";

const EMPTY_MATERIAL = {
  catchphrases: "",
  speechTranscript: "",
  personalityTraits: "",
  desiredPresence: "",
  treatmentStyle: "",
  memorableMoments: "",
  audioTranscript: "",
  additionalNotes: "",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePersonaInput;

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const input: CreatePersonaInput = {
      ...EMPTY_MATERIAL,
      ...body,
      name: body.name.trim(),
      relationship: body.relationship?.trim() || "重要的人",
      roleLabel: body.roleLabel?.trim() || body.relationship?.trim() || "重要的人",
      departureType: body.departureType || "other",
      conversationMode: body.conversationMode || "companion",
      materialSourceType: body.materialSourceType || "mixed",
      realismLevel: body.realismLevel || "echo",
      description: body.description?.trim() || "",
      sourceText: body.sourceText?.trim() || "",
    };

    if (!hasEnoughMaterial(input)) {
      return NextResponse.json(
        {
          error:
            "材料还不够具体。请至少填写：说话逐字稿、口头禅、性格特点或相处方式中的一项，并说明你想再次和TA说话的原因。",
        },
        { status: 400 },
      );
    }

    const distilled = await distillPersonaProfile(input);

    return NextResponse.json({ distilled });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "蒸馏失败" },
      { status: 500 },
    );
  }
}
