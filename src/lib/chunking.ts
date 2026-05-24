import type { SegmentLabel, TranscriptSegment } from "./types";

const therapistPrefixes = /^(t|therapist|咨询师|师|咨)[:：]\s*/i;
const clientPrefixes = /^(c|client|来访者|用户|访)[:：]\s*/i;

const relationshipWords = [
  "信任",
  "不信任",
  "关系",
  "边界",
  "迟到",
  "取消",
  "失望",
  "生气",
  "依赖",
  "被理解",
  "没被理解",
  "移情",
  "反移情",
];

const memoryWords = [
  "小时候",
  "父亲",
  "母亲",
  "伴侣",
  "孩子",
  "工作",
  "学校",
  "创伤",
  "诊断",
  "症状",
  "失眠",
  "焦虑",
  "抑郁",
  "家庭",
  "关系史",
];

export function splitTranscript(transcript: string): TranscriptSegment[] {
  const lines = transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rawSegments = lines.length > 1 ? lines : splitLongText(transcript);

  return rawSegments
    .map((raw, index) => normalizeSegment(raw, index))
    .filter((segment) => segment.content.length > 0);
}

function splitLongText(text: string) {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[。！？!?；;])\s*/)
    .map((item) => item.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > 700 && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current}${sentence}` : sentence;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.length ? chunks : [text.trim()];
}

function normalizeSegment(raw: string, index: number): TranscriptSegment {
  const speaker = detectSpeaker(raw);
  const content = raw.replace(therapistPrefixes, "").replace(clientPrefixes, "").trim();
  const label = classify(content, speaker);

  return {
    label,
    speaker,
    content,
    metadata: {
      source: "transcript_upload",
      index,
      classifier: "heuristic-v1",
    },
  };
}

function detectSpeaker(raw: string) {
  if (therapistPrefixes.test(raw)) {
    return "therapist";
  }

  if (clientPrefixes.test(raw)) {
    return "client";
  }

  return null;
}

function classify(content: string, speaker: string | null): SegmentLabel {
  if (hasAny(content, relationshipWords)) {
    return "relationship_event";
  }

  if (speaker === "therapist") {
    if (content.length > 80 || /你可以|我们可以|我听到|听起来|也许|我在想/.test(content)) {
      return "style_sample";
    }

    return "therapist_speech";
  }

  if (hasAny(content, memoryWords)) {
    return "case_memory";
  }

  if (speaker === "client") {
    return "client_speech";
  }

  return content.length > 120 ? "case_memory" : "client_speech";
}

function hasAny(content: string, words: string[]) {
  return words.some((word) => content.includes(word));
}
