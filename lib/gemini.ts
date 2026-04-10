type GeminiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const GEMINI_MODEL = "gemini-1.5-mini";
const EMBEDDING_MODEL = "text-embedding-3-small";

const API_KEY = process.env.OPENAI_API_KEY;
const API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";

if (!API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`
};

function parseGeminiText(data: GeminiResponse): string {
  if (data.output_text) return data.output_text.trim();
  if (!data.output) return "";
  return data.output
    .map((item) =>
      item.content
        ?.map((segment) => segment.text ?? "")
        .join("")
        .trim()
    )
    .join("\n")
    .trim();
}

export async function classifyIntent(userMessage: string): Promise<{
  intent: "unrelated" | "lookup_code" | "lookup_description" | "clarification_needed";
  needsClarification: boolean;
  reason: string;
}> {
  const prompt = `
You are a medical coding assistant whose only job is to classify whether a user message is:
- unrelated to medical coding,
- a medical coding lookup,
- a request for description of a known code,
- or a request that needs more clinical clarification.

Return only valid JSON with keys:
- intent
- needsClarification
- reason

Example:
{"intent":"lookup_code","needsClarification":false,"reason":"The user asks for an ICD code for a diagnosis."}

User message:
${JSON.stringify(userMessage)}
`;

  const res = await fetch(`${API_BASE}/responses`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: GEMINI_MODEL,
      input: prompt,
      temperature: 0
    })
  });

  const data = (await res.json()) as GeminiResponse;
  const text = parseGeminiText(data);

  try {
    const parsed = JSON.parse(text);
    return {
      intent:
        parsed.intent === "unrelated"
          ? "unrelated"
          : parsed.intent === "lookup_description"
          ? "lookup_description"
          : parsed.intent === "clarification_needed"
          ? "clarification_needed"
          : "lookup_code",
      needsClarification: Boolean(parsed.needsClarification),
      reason: String(parsed.reason || "")
    };
  } catch {
    return {
      intent: text.includes("unrelated") ? "unrelated" : "lookup_code",
      needsClarification: text.includes("more") || text.includes("clarification"),
      reason: text
    };
  }
}

export async function createEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${API_BASE}/embeddings`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text
    })
  });

  const data = await res.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("Embedding request failed");
  }

  return embedding as number[];
}