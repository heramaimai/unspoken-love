import { getSupabaseAdmin } from "./supabase";
import type { TranscriptSegment } from "./types";

export type TherapistProfile = {
  user_id: string;
  display_name: string;
  transcript_count: number;
  segment_count: number;
  therapist_turn_count: number;
  style_summary: string;
  language_markers: Record<string, unknown>;
  thinking_patterns: Record<string, unknown>;
  response_guidelines: string[];
  sample_quotes: Array<{ content: string; label?: string }>;
  updated_at: string;
};

type PersistedSegment = Pick<TranscriptSegment, "label" | "speaker" | "content">;

const reflectionMarkers = ["我听到", "听起来", "我感觉", "似乎", "好像", "你说"];
const explorationMarkers = ["我们可以", "看看", "也许", "我在想", "能不能", "会不会"];
const relationMarkers = ["我们之间", "你和我", "在这里", "咨询里", "你担心我", "对我"];
const bodyMarkers = ["身体", "感受", "紧张", "害怕", "卡住", "呼吸", "胸口"];
const boundaryMarkers = ["先不急", "不急着", "可以先", "慢一点", "停一下"];
const humanToneMarkers = ["嗯", "啊", "其实", "我在想", "这里", "刚才", "这个地方", "这块儿", "我说实话"];
const confrontationMarkers = ["但是", "可是", "你有没有发现", "问题是", "我说实话", "这不太像", "你一边", "你其实"];

export async function rebuildTherapistProfile(userId: string) {
  const supabase = getSupabaseAdmin();

  const [{ count: transcriptCount, error: transcriptCountError }, { data: segments, error }] =
    await Promise.all([
      supabase
        .from("transcripts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("transcript_segments")
        .select("label,speaker,content")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(800),
    ]);

  if (transcriptCountError) {
    throw transcriptCountError;
  }

  if (error) {
    throw error;
  }

  const profile = analyzeTherapistStyle(userId, transcriptCount || 0, segments || []);
  const { error: upsertError } = await supabase.from("therapist_profiles").upsert(
    {
      user_id: profile.user_id,
      display_name: profile.display_name,
      transcript_count: profile.transcript_count,
      segment_count: profile.segment_count,
      therapist_turn_count: profile.therapist_turn_count,
      style_summary: profile.style_summary,
      language_markers: profile.language_markers,
      thinking_patterns: profile.thinking_patterns,
      response_guidelines: profile.response_guidelines,
      sample_quotes: profile.sample_quotes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    throw upsertError;
  }

  return profile;
}

export async function getTherapistProfile(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("therapist_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as TherapistProfile | null;
}

function analyzeTherapistStyle(
  userId: string,
  transcriptCount: number,
  allSegments: PersistedSegment[],
): TherapistProfile {
  const therapistSegments = allSegments.filter(
    (segment) =>
      segment.speaker === "therapist" ||
      segment.label === "therapist_speech" ||
      segment.label === "style_sample",
  );
  const contents = therapistSegments.map((segment) => segment.content);
  const joined = contents.join("\n");
  const questionRatio = ratio(contents.filter((content) => /[?？]/.test(content)).length, contents.length);
  const avgLength = contents.length
    ? Math.round(contents.reduce((sum, content) => sum + content.length, 0) / contents.length)
    : 0;

  const markers = {
    reflection: countMarkers(joined, reflectionMarkers),
    exploration: countMarkers(joined, explorationMarkers),
    relationship: countMarkers(joined, relationMarkers),
    body: countMarkers(joined, bodyMarkers),
    pacing: countMarkers(joined, boundaryMarkers),
    humanTone: countMarkers(joined, humanToneMarkers),
    confrontation: countMarkers(joined, confrontationMarkers),
    questionRatio,
    averageTurnLength: avgLength,
    frequentOpeners: frequentOpeners(contents),
  };

  const patterns = {
    reflectiveListening: score(markers.reflection.total, contents.length),
    collaborativeExploration: score(markers.exploration.total, contents.length),
    relationshipAttention: score(markers.relationship.total, contents.length),
    bodyAffectTracking: score(markers.body.total, contents.length),
    slowPacing: score(markers.pacing.total, contents.length),
    situatedHumanTone: score(markers.humanTone.total, contents.length),
    confrontation: score(markers.confrontation.total, contents.length),
  };

  return {
    user_id: userId,
    display_name: "麦子的咨询师",
    transcript_count: transcriptCount,
    segment_count: allSegments.length,
    therapist_turn_count: contents.length,
    style_summary: buildSummary(patterns, questionRatio, avgLength),
    language_markers: markers,
    thinking_patterns: patterns,
    response_guidelines: buildGuidelines(patterns, questionRatio),
    sample_quotes: pickSampleQuotes(therapistSegments),
    updated_at: new Date().toISOString(),
  };
}

function countMarkers(text: string, markers: string[]) {
  const byMarker = Object.fromEntries(
    markers.map((marker) => [marker, text.split(marker).length - 1]),
  );
  const total = Object.values(byMarker).reduce((sum, value) => sum + value, 0);
  return { total, byMarker };
}

function frequentOpeners(contents: string[]) {
  const counts = new Map<string, number>();

  for (const content of contents) {
    const opener = content.slice(0, 8).replace(/[，。！？!?、\s]+$/g, "");
    if (opener.length >= 2) {
      counts.set(opener, (counts.get(opener) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([text, count]) => ({ text, count }));
}

function score(count: number, total: number) {
  if (!total) {
    return "unknown";
  }

  const value = count / total;
  if (value >= 0.35) {
    return "high";
  }

  if (value >= 0.15) {
    return "medium";
  }

  return "low";
}

function ratio(value: number, total: number) {
  return total ? Number((value / total).toFixed(2)) : 0;
}

function buildSummary(
  patterns: Record<string, unknown>,
  questionRatio: number,
  avgLength: number,
) {
  const traits = [
    patterns.reflectiveListening !== "low" ? "先反映和命名来访者体验" : "",
    patterns.collaborativeExploration !== "low" ? "用共同探索而非直接建议推进" : "",
    patterns.relationshipAttention !== "low" ? "会把当下关系和咨询关系纳入理解" : "",
    patterns.bodyAffectTracking === "high" ? "会关注身体感受与情绪线索" : "",
    patterns.slowPacing === "high" ? "节奏偏慢，常先暂停评价" : "",
    patterns.confrontation !== "low" ? "会在合适时直接指出矛盾和躲闪" : "",
  ].filter(Boolean);

  const questionStyle = questionRatio >= 0.35 ? "问句使用较多" : "问句使用克制";
  const lengthStyle = avgLength >= 90 ? "单轮回应较长" : "单轮回应较短";

  return [
    traits.length ? traits.join("；") : "当前样本较少，风格画像仍在形成中",
    `${questionStyle}，${lengthStyle}。`,
  ].join("。");
}

function buildGuidelines(patterns: Record<string, unknown>, questionRatio: number) {
  const guidelines = [
    "作为“麦子的咨询师”自然回应，默认不要解释自己是代理、替身或 AI。",
    "只有在麦子明确询问身份、能力边界或出现危机风险时，才简短说明不能替代正式咨询。",
    "优先贴近逐字稿中咨询师的工作方式，不要套用固定咨询话术。",
    "根据麦子当下的话选择共情、面质、澄清或真实反应，不要每次都温柔探索。",
    "不要写成条目、总结、建议清单或 AI 助手口吻；尽量像咨询室里的自然对话。",
    "说话口语一点、北京一点，可以不那么工整，别文艺腔。",
    "不要固定询问身体反应，也不要总说停下来感受；这不是默认动作。",
    "允许短句、停顿和一点真实反应，优先贴住麦子刚说出来的词。",
  ];

  if (patterns.reflectiveListening !== "low") {
    guidelines.push("多使用反映式表达，例如先说“我听到/听起来/好像”。");
  }

  if (patterns.relationshipAttention !== "low") {
    guidelines.push("在合适时把麦子对这个替身、咨询关系或被理解感的反应纳入回应。");
  }

  if (patterns.confrontation !== "low") {
    guidelines.push("可以在合适时面质：指出矛盾、重复模式或麦子正在躲开的地方。");
  }

  if (patterns.bodyAffectTracking === "high") {
    guidelines.push("适度询问身体感受、情绪位置和当下体验。");
  }

  if (questionRatio < 0.25) {
    guidelines.push("控制连续提问数量，避免像问卷。");
  }

  return guidelines;
}

function pickSampleQuotes(segments: PersistedSegment[]) {
  return segments
    .map((segment) => ({ content: segment.content, label: segment.label }))
    .filter((segment) => segment.content.length >= 12)
    .sort((a, b) => Math.abs(90 - a.content.length) - Math.abs(90 - b.content.length))
    .slice(0, 8);
}
