import type { CreatePersonaInput, PersonaMaterialFields } from "./types";

export const AUDIO_RECORDING_GUIDE = `如有 TA 的录音，第一版请先将语音转成文字再粘贴（可用手机自带「语音转文字」或微信语音转写）。

录音建议：
· 时长 1–3 分钟，选日常说话片段，而非朗读
· 背景尽量安静，保留 TA 原本的语速、停顿和语气词
· 若有多段，注明场景（例如：打电话、一起吃饭、睡前闲聊）
· 转写时尽量保留「嗯、啊、呢、吧」等口头习惯，不要过度润色`;

export const MATERIAL_FIELD_GUIDES: Array<{
  key: keyof PersonaMaterialFields;
  label: string;
  placeholder: string;
  hint: string;
  rows?: number;
}> = [
  {
    key: "catchphrases",
    label: "TA 的口头禅与常用表达",
    placeholder: "例如：「没事没事」「你想多了」「吃饭了吗」「别熬夜」",
    hint: "列出 TA 最常挂在嘴边的话、称呼你的方式、习惯用的语气词。",
    rows: 3,
  },
  {
    key: "speechTranscript",
    label: "TA 说话的逐字稿 / 对话片段",
    placeholder: "粘贴真实聊天记录，或你记得的对话。尽量保留 TA 的原话。",
    hint: "这是拟真度最重要的材料。对话越多、越具体，回声越接近 TA 曾经的方式。",
    rows: 6,
  },
  {
    key: "personalityTraits",
    label: "TA 的性格特点",
    placeholder: "例如：外冷内热、爱开玩笑、不太会表达、遇事先安慰人……",
    hint: "描述 TA 平时是怎样的人，而不是你希望 TA 变成怎样。",
    rows: 4,
  },
  {
    key: "desiredPresence",
    label: "你希望 TA 在这里呈现出的样子",
    placeholder: "例如：像从前那样温和地怼我、像最后一次见面那样安静、像写信时的语气……",
    hint: "这不是复活真人，而是你希望这段赛博陪伴保留怎样的温度与距离。",
    rows: 4,
  },
  {
    key: "treatmentStyle",
    label: "TA 通常怎样对待你",
    placeholder: "例如：会先问你有没有吃饭、习惯用玩笑化解尴尬、难过时会沉默陪着……",
    hint: "描述 TA 在你们关系里常见的回应方式与相处习惯。",
    rows: 4,
  },
  {
    key: "memorableMoments",
    label: "印象深刻的相处片段",
    placeholder: "写下几个具体场景：发生了什么、TA 说了什么、你当时什么感受。",
    hint: "具体场景比抽象形容更能帮助 AI 理解你们的关系。",
    rows: 5,
  },
  {
    key: "audioTranscript",
    label: "录音转写（如有）",
    placeholder: "将录音转成文字后粘贴在此。",
    hint: AUDIO_RECORDING_GUIDE,
    rows: 5,
  },
  {
    key: "additionalNotes",
    label: "其他想补充的信息",
    placeholder: "任何你觉得重要的细节：禁忌话题、TA 的价值观、你们之间的特殊默契……",
    hint: "不限于以上字段，任何有助于还原关系回声的内容都可以写。",
    rows: 4,
  },
];

export function buildMaterialBundle(input: CreatePersonaInput): string {
  const sections: string[] = [];

  const append = (title: string, value?: string) => {
    const clean = value?.trim();
    if (clean) {
      sections.push(`【${title}】\n${clean}`);
    }
  };

  append("原始材料 / 上传文本", input.sourceText);
  append("口头禅与常用表达", input.catchphrases);
  append("说话逐字稿", input.speechTranscript);
  append("性格特点", input.personalityTraits);
  append("希望呈现的样子", input.desiredPresence);
  append("对待用户的方式", input.treatmentStyle);
  append("印象深刻片段", input.memorableMoments);
  append("录音转写", input.audioTranscript);
  append("其他补充", input.additionalNotes);

  return sections.join("\n\n");
}

export function hasEnoughMaterial(input: CreatePersonaInput): boolean {
  if (input.description?.trim()) {
    return true;
  }

  const bundle = buildMaterialBundle(input);
  return bundle.replace(/\s/g, "").length >= 40;
}
