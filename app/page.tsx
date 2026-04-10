"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "medical-coding-chat-session";
const WELCOME =
  "Hello! I'm your Medical Coding Assistant. Ask me about ICD codes, diagnoses, or symptoms and I'll help you find the right code.";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as {
        sessionId: string;
        messages: ChatMessage[];
      };
      setSessionId(parsed.sessionId);
      setMessages(parsed.messages || []);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, messages }));
  }, [sessionId, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

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
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

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
          content: "Sorry, something went wrong. Please try again in a moment."
        }
      ]);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <div className="brand-icon">MC</div>
          <div>
            <div className="brand-title">Medical Coding Assistant</div>
            <div className="brand-sub">ICD-10 Code Lookup</div>
          </div>
        </div>
        <button
          className="clear-btn"
          onClick={clearChat}
          disabled={messages.length === 0}
        >
          Clear Chat
        </button>
      </header>

      <main className="chat-body">
        <div className="messages">
          <div className="message-row">
            <div className="avatar ai-avatar">AI</div>
            <div className="bubble ai-bubble">{WELCOME}</div>
          </div>

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`message-row ${msg.role === "user" ? "user-row" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="avatar ai-avatar">AI</div>
              )}
              <div
                className={`bubble ${
                  msg.role === "user" ? "user-bubble" : "ai-bubble"
                }`}
              >
                {msg.content.split("\n").map((line, j, arr) => (
                  <span key={j}>
                    {line}
                    {j < arr.length - 1 && <br />}
                  </span>
                ))}
              </div>
              {msg.role === "user" && (
                <div className="avatar user-avatar">You</div>
              )}
            </div>
          ))}

          {loading && (
            <div className="message-row">
              <div className="avatar ai-avatar">AI</div>
              <div className="bubble ai-bubble typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="input-area">
        <form
          className="input-form"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <textarea
            className="input-box"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about an ICD code or diagnosis... (Enter to send, Shift+Enter for new line)"
            disabled={loading}
            rows={1}
          />
          <button
            className="send-btn"
            type="submit"
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}
