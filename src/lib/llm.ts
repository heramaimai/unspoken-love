type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const provider = process.env.AI_PROVIDER || "openai";

export async function chatCompletion(input: {
  messages: ChatMessage[];
  temperature?: number;
}) {
  if (provider === "deepseek") {
    return callProvider({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: "https://api.deepseek.com/chat/completions",
      model: process.env.DEEPSEEK_CHAT_MODEL || "deepseek-chat",
      messages: input.messages,
      temperature: input.temperature ?? 0.7,
      providerName: "DeepSeek",
    });
  }

  if (provider === "doubao") {
    return callProvider({
      apiKey: process.env.DOUBAO_API_KEY,
      baseUrl:
        process.env.DOUBAO_CHAT_BASE_URL ||
        "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      model: process.env.DOUBAO_CHAT_MODEL || "",
      messages: input.messages,
      temperature: input.temperature ?? 0.7,
      providerName: "Doubao",
    });
  }

  return callProvider({
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    messages: input.messages,
    temperature: input.temperature ?? 0.7,
    providerName: "OpenAI",
  });
}

async function callProvider(input: {
  apiKey?: string;
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  providerName: string;
}) {
  if (!input.apiKey) {
    throw new Error(`Missing API key for ${input.providerName}.`);
  }

  if (!input.model) {
    throw new Error(`Missing chat model for ${input.providerName}.`);
  }

  let response: Response;

  try {
    response = await fetch(input.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature,
      }),
    });
  } catch (error) {
    throw new Error(toNetworkErrorMessage(input.providerName, error));
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${input.providerName} chat failed: ${response.status} ${body}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`${input.providerName} chat response did not include content.`);
  }

  return content;
}

function toNetworkErrorMessage(providerName: string, error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined;
  const causeCode =
    cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";

  if (causeCode === "UND_ERR_CONNECT_TIMEOUT") {
    return `连接 ${providerName} 聊天接口超时。请检查本机网络/代理，或确认 API base URL 是否可访问。`;
  }

  return `连接 ${providerName} 聊天接口失败。请检查本机网络/代理、API key、模型名和 base URL。`;
}
