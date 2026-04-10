const CHAT_MODEL = "gpt-5.4-mini";
const EMBEDDING_MODEL = "text-embedding-3-small";

const API_KEY = process.env.OPENAI_API_KEY;
const API_BASE = "https://api.openai.com/v1";

if (!API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`
};

export async function classifyIntent(userMessage: string): Promise<{
  intent: "unrelated" | "lookup_code" | "lookup_description" | "clarification_needed";
  needsClarification: boolean;
  reason: string;
}> {
  const prompt = `You are a medical coding assistant whose only job is to classify whether a user message is:
- unrelated to medical coding
- a medical coding lookup (user wants an ICD code for a diagnosis/symptom)
- a request for description of a known code (user provides an ICD code and wants its meaning)
- a request that needs more clinical clarification

Return ONLY valid JSON with these exact keys:
- intent: one of "unrelated", "lookup_code", "lookup_description", "clarification_needed"
- needsClarification: boolean
- reason: string

User message: ${JSON.stringify(userMessage)}`;

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`OpenAI API error (${res.status}): ${JSON.stringify(data)}`);
  }

  const text: string = data.choices?.[0]?.message?.content ?? "";
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
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
      needsClarification: text.includes("clarification"),
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
  if (!res.ok) {
    throw new Error(`OpenAI embeddings error (${res.status}): ${JSON.stringify(data)}`);
  }

  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("Embedding response missing data");
  }

  return embedding as number[];
}
