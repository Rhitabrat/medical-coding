"use client";

import { useEffect, useMemo, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "medical-coding-chat-session";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { sessionId: string; messages: ChatMessage[] };
      setSessionId(parsed.sessionId);
      setMessages(parsed.messages || []);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionId, messages })
    );
  }, [sessionId, messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: input.trim() }
    ];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: nextMessages.map((msg) => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setSessionId(data.sessionId);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong. Please try again in a moment."
        }
      ]);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage();
  };

  const welcome = useMemo(
    () =>
      "Hello! Ask me about ICD codes, descriptions, or which code fits a diagnosis."
  , []);

  return (
    <main className="container">
      <section className="chat-window">
        <h1>Medical Coding Assistant</h1>
        <div className="messages">
          <div className="message assistant">{welcome}</div>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role}`}
            >
              <strong>{message.role === "user" ? "You" : "Assistant"}:</strong>{" "}
              {message.content}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="input-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about an ICD code or diagnosis..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? "Thinking..." : "Send"}
          </button>
        </form>
      </section>
    </main>
  );
}