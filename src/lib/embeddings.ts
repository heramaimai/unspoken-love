const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const dimensions = 1536;

export async function createEmbedding(input: string) {
  if (process.env.EMBEDDING_PROVIDER === "local") {
    return createLocalEmbedding(input);
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Embeddings require OpenAI for this prototype.");
  }

  let response: Response;

  try {
    response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: embeddingModel,
        input,
      }),
    });
  } catch (error) {
    throw new Error(toNetworkErrorMessage(error));
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI embedding failed: ${response.status} ${body}`);
  }

  const json = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };

  const embedding = json.data[0]?.embedding;
  if (!embedding) {
    throw new Error("OpenAI embedding response did not include an embedding.");
  }

  return embedding;
}

export async function createEmbeddings(inputs: string[]) {
  if (process.env.EMBEDDING_PROVIDER === "local") {
    return inputs.map(createLocalEmbedding);
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Embeddings require OpenAI for this prototype.");
  }

  if (inputs.length === 0) {
    return [];
  }

  let response: Response;

  try {
    response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: embeddingModel,
        input: inputs,
      }),
    });
  } catch (error) {
    throw new Error(toNetworkErrorMessage(error));
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI embeddings failed: ${response.status} ${body}`);
  }

  const json = (await response.json()) as {
    data: Array<{ index: number; embedding: number[] }>;
  };

  return json.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

function createLocalEmbedding(input: string) {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = input.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [input];

  for (const token of tokens) {
    const index = hashToken(token) % dimensions;
    vector[index] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

function hashToken(token: string) {
  let hash = 2166136261;

  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function toNetworkErrorMessage(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined;
  const causeCode =
    cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";

  if (causeCode === "UND_ERR_CONNECT_TIMEOUT") {
    return "连接 OpenAI embeddings 接口超时。请检查本机网络/代理，或临时在 .env 中设置 EMBEDDING_PROVIDER=local 先跑通本地流程。";
  }

  return "连接 OpenAI embeddings 接口失败。请检查本机网络/代理，或临时在 .env 中设置 EMBEDDING_PROVIDER=local 先跑通本地流程。";
}
