import { NextResponse } from "next/server";
import { classifyIntent } from "@/lib/gemini";
import { findExactCode, searchCode } from "@/lib/vectorStore";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type RequestBody = {
  sessionId?: string;
  messages: ChatMessage[];
};

function buildAnswer(record: { icd_code: string; description: string }) {
  return `ICD code ${record.icd_code}: ${record.description}`;
}

function buildChoiceMessage(results: { record: { icd_code: string; description: string }; score: number }[]) {
  return [
    "I found multiple likely matches. Please choose the best option or provide more details:",
    ...results.map(
      (item, index) =>
        `${index + 1}. ${item.record.icd_code} — ${item.record.description}`
    )
  ].join("\n");
}

export async function POST(request: Request) {
  const body: RequestBody = await request.json();
  const lastMessage = body.messages?.slice(-1)[0];

  if (!lastMessage || lastMessage.role !== "user") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userText = lastMessage.content.trim();

  const exact = findExactCode(userText);
  if (exact) {
    return NextResponse.json({
      sessionId: body.sessionId || crypto.randomUUID(),
      reply: buildAnswer(exact),
      followUp: "Do you want information for another ICD code?"
    });
  }

  let intent;
  try {
    intent = await classifyIntent(userText);
  } catch (err) {
    console.error("[chat] classifyIntent failed:", err);
    return NextResponse.json({ error: "classifyIntent failed" }, { status: 500 });
  }
  if (intent.intent === "unrelated") {
    return NextResponse.json({
      sessionId: body.sessionId || crypto.randomUUID(),
      reply:
        "This assistant only helps with medical coding. Please ask about an ICD code, diagnosis, or how to classify a medical condition."
    });
  }

  if (intent.needsClarification || intent.intent === "clarification_needed") {
    return NextResponse.json({
      sessionId: body.sessionId || crypto.randomUUID(),
      reply:
        "I need a bit more information to choose the correct code. Please describe the symptoms, location, duration, or any other clinical detail."
    });
  }

  const results = await searchCode(userText, 3);
  const best = results[0];

  if (best.score >= 0.88) {
    return NextResponse.json({
      sessionId: body.sessionId || crypto.randomUUID(),
      reply: buildAnswer(best.record),
      followUp:
        "If you want to verify or ask about another code, just type it."
    });
  }

  return NextResponse.json({
    sessionId: body.sessionId || crypto.randomUUID(),
    reply: buildChoiceMessage(results),
    choices: results.map((item) => item.record.icd_code)
  });
}