import { buildDistillationPrompt } from "./persona-prompts";
import { chatCompletion } from "./llm";
import type { CreatePersonaInput, DistilledProfileFields } from "./types";

export async function distillPersonaProfile(
  input: CreatePersonaInput,
): Promise<DistilledProfileFields> {
  const content = await chatCompletion({
    messages: [
      {
        role: "system",
        content: buildDistillationPrompt(input),
      },
      {
        role: "user",
        content: "请根据上述信息生成回声档案 JSON。",
      },
    ],
    temperature: 0.4,
  });

  return parseDistilledProfile(content, input);
}

function parseDistilledProfile(
  content: string,
  input: CreatePersonaInput,
): DistilledProfileFields {
  const jsonText = extractJson(content);
  const parsed = JSON.parse(jsonText) as Partial<DistilledProfileFields>;

  const memoryReminder =
    input.materialSourceType === "memory" || input.materialSourceType === "mixed"
      ? "部分风格来自用户的主观回忆，不等同于TA真实说过的话。"
      : "";

  const boundaries = [parsed.boundaries, memoryReminder].filter(Boolean).join(" ");

  return {
    transcriptSummary: parsed.transcriptSummary || "材料已整理为回声档案。",
    languageStyle: parsed.languageStyle || "温和、具体、贴近日常说话。",
    emotionalPattern: parsed.emotionalPattern || "保留关系中的情绪温度。",
    relationshipPattern:
      parsed.relationshipPattern || `${input.name}与用户的${input.relationship}关系。`,
    typicalResponses: parsed.typicalResponses || "以陪伴和回应为主，不急着给结论。",
    unfinishedWords: parsed.unfinishedWords || input.description || "仍有未说完的话。",
    boundaries: boundaries || "这是赛博陪伴，不是真人复活。",
    systemPrompt: parsed.systemPrompt || "",
  };
}

function extractJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return content.slice(start, end + 1);
  }

  throw new Error("蒸馏结果未包含有效 JSON。");
}
