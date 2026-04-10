import { CODES, CodeRecord } from "./codes";
import { createEmbedding } from "./gemini";

export type RankedResult = {
  record: CodeRecord;
  score: number;
};

const codeRecords = CODES.map((item) => ({
  ...item,
  text: `${item.icd_code} - ${item.description}`
}));

let cachedEmbeddings: number[][] | null = null;

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

async function ensureEmbeddings() {
  if (cachedEmbeddings) return;
  const embeddings = await Promise.all(
    codeRecords.map((doc) => createEmbedding(doc.text))
  );
  cachedEmbeddings = embeddings;
}

export async function searchCode(
  query: string,
  topK = 3
): Promise<RankedResult[]> {
  await ensureEmbeddings();

  const queryEmbedding = await createEmbedding(query);
  const results: RankedResult[] = [];

  for (let i = 0; i < codeRecords.length; i++) {
    const score = cosineSimilarity(queryEmbedding, cachedEmbeddings![i]);
    results.push({ record: codeRecords[i], score });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function findExactCode(query: string): CodeRecord | undefined {
  const normalized = query.toUpperCase();
  return CODES.find((item) => normalized.includes(item.icd_code.toUpperCase()));
}