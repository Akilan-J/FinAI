"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/stores/auth-store";
import { fetchApi, getAccessToken } from "@/lib/api-client";
import { Sparkles, Receipt, Coffee, Layers, TrendingUp, Send } from "lucide-react";

interface Message {
  role: "user" | "model";
  content: string;
}

const SUGGESTED_PROMPTS = [
  {
    label: "Show recent expenses",
    text: "Show my recent expenses logs",
    icon: "Receipt",
    description: "Lists your latest logged transactions",
  },
  {
    label: "Log a coffee expense",
    text: "Log coffee expense of ₹180 at Starbucks",
    icon: "Coffee",
    description: "Quick-adds a coffee log to your expenses",
  },
  {
    label: "Verify active budgets",
    text: "What are my active budgets?",
    icon: "Layers",
    description: "Check status of budget caps for current period",
  },
  {
    label: "Analyze monthly summary",
    text: "Show monthly summary analytics",
    icon: "TrendingUp",
    description: "View total income, expenses, and savings rates",
  },
];

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history from the last 7 days on component mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetchApi("/chat/history");
        if (response && response.success && Array.isArray(response.data)) {
          const loadedMessages: Message[] = response.data.map((msg: any) => ({
            role: msg.role === "model" ? "model" : "user",
            content: msg.content,
          }));
          setMessages(loadedMessages);
        }
      } catch (err) {
        console.error("Failed to load chat history", err);
      }
    };
    loadHistory();
  }, []);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: "user", content: textToSend };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    // Add empty placeholder assistant message for streaming
    const assistantMessagePlaceholder: Message = { role: "model", content: "" };
    setMessages([...updatedMessages, assistantMessagePlaceholder]);

    try {
      const token = getAccessToken();
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${baseUrl}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) {
        throw new Error("Failed to start chat stream");
      }

      if (!response.body) {
        throw new Error("No response body available");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        
        // SSE parsing
        const lines = chunk.split("\n\n");
        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            try {
              const dataStr = line.replace(/^data:\s*/, "").trim();
              const json = JSON.parse(dataStr);
              if (json.content) {
                accumulatedText += json.content;
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  if (newMsgs.length > 0) {
                    newMsgs[newMsgs.length - 1] = {
                      role: "model",
                      content: accumulatedText,
                    };
                  }
                  return newMsgs;
                });
              } else if (json.error) {
                accumulatedText += `\n\n⚠️ *Error*: ${json.error}`;
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  if (newMsgs.length > 0) {
                    newMsgs[newMsgs.length - 1] = {
                      role: "model",
                      content: accumulatedText,
                    };
                  }
                  return newMsgs;
                });
              }
            } catch (err) {
              // Ignore partial JSON parsing errors during stream splits
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => {
        const newMsgs = [...prev];
        if (newMsgs.length > 0) {
          newMsgs[newMsgs.length - 1] = {
            role: "model",
            content: `⚠️ Failed to get response: ${err.message || "Unknown error"}. Please ensure backend is running.`,
          };
        }
        return newMsgs;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6 h-full min-h-[calc(100vh-8rem)] relative">
      {/* Decorative Blur BG */}
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none" />

      {/* Suggested actions Panel */}
      <div className="w-full md:w-80 flex flex-col gap-4 flex-shrink-0 z-10">
        <div className="border border-neutral-900 bg-neutral-950/60 backdrop-blur-md p-5 rounded-2xl">
          <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-violet-500" />
            Suggested Actions
          </h3>
          <p className="text-xs text-neutral-500 mb-4">
            Click any prompt shortcut to query your personal data assistant
          </p>

          <div className="space-y-2.5">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                onClick={() => handleSend(prompt.text)}
                disabled={loading}
                className="w-full text-left p-3 rounded-xl border border-neutral-900 bg-neutral-900/10 hover:bg-neutral-900/40 hover:border-neutral-800 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 group-hover:text-violet-400 transition-colors">
                  <span className="p-1 rounded-md bg-neutral-900/60 border border-neutral-800/40 text-neutral-400 group-hover:text-violet-400 group-hover:border-violet-500/20 transition-all">
                    {prompt.icon === "Receipt" && <Receipt className="w-3.5 h-3.5" />}
                    {prompt.icon === "Coffee" && <Coffee className="w-3.5 h-3.5" />}
                    {prompt.icon === "Layers" && <Layers className="w-3.5 h-3.5" />}
                    {prompt.icon === "TrendingUp" && <TrendingUp className="w-3.5 h-3.5" />}
                  </span>
                  {prompt.label}
                </div>
                <div className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
                  {prompt.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Feed */}
      <div className="flex-1 flex flex-col border border-neutral-900 bg-neutral-950/40 backdrop-blur-md rounded-2xl overflow-hidden z-10">
        {/* Chat Feed Header */}
        <div className="px-6 py-4 border-b border-neutral-900 bg-neutral-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/10">
              <Sparkles className="w-4.5 h-4.5 text-neutral-50" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-200">FinAI Chat Assistant</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-neutral-500 font-semibold">Active Session</span>
              </div>
            </div>
          </div>
        </div>

        {/* Message Container */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-22rem)]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="w-16 h-16 rounded-2xl bg-neutral-900/40 border border-neutral-800/60 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-neutral-500" />
              </div>
              <h3 className="text-neutral-300 font-bold">Ask your FinAI Assistant</h3>
              <p className="text-xs text-neutral-500 max-w-sm mt-1">
                Query expenses, compare monthly limits, or log new entries instantly using natural language commands.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={index}
                  className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase ${
                      isUser
                        ? "bg-violet-600/10 border border-violet-500/20 text-violet-400"
                        : "bg-emerald-600/10 border border-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {isUser ? user?.full_name?.slice(0, 2) || "ME" : "AI"}
                  </div>
                  <div
                    className={`rounded-2xl p-4 text-xs leading-relaxed border shadow-sm ${
                      isUser
                        ? "bg-violet-600/10 border-violet-500/20 text-neutral-100 rounded-tr-none"
                        : "bg-neutral-900/40 border-neutral-800 text-neutral-200 rounded-tl-none"
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.content === "" && loading && index === messages.length - 1 ? (
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-neutral-900 bg-neutral-950/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask FinAI to query logs or record limits..."
              disabled={loading}
              className="flex-1 bg-neutral-900/50 border border-neutral-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-600 transition outline-none text-xs disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-neutral-50 font-semibold p-3 rounded-xl transition duration-300 shadow-md shadow-violet-500/10 cursor-pointer flex items-center justify-center disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
