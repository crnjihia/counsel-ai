import React, { useState, useEffect, useRef } from "react";
import { useConversationMessages } from "../hooks/useApi";
import { streamChatMessage, MessageItem } from "../api/client";
import StreamingMessage from "./StreamingMessage";
import { Send, Bot, User, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

interface ChatPanelProps {
  conversationId: number;
  onPageClick?: (page: number) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ conversationId, onPageClick }) => {
  const { data: initialMessages, isLoading: isLoadingHistory } = useConversationMessages(conversationId);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync historical messages
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isStreaming) return;

    setError(null);
    setInput("");

    // Append user message immediately
    const userMessage: MessageItem = {
      id: Date.now(),
      conversation_id: conversationId,
      role: "user",
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingContent("");

    let currentTokens = "";

    await streamChatMessage({
      convId: conversationId,
      content: textToSend,
      userId: 1,
      onToken: (token) => {
        currentTokens += token;
        setStreamingContent(currentTokens);
      },
      onDone: (data) => {
        const assistantMessage: MessageItem = {
          id: data.message_id || Date.now() + 1,
          conversation_id: conversationId,
          role: "assistant",
          content: currentTokens,
          tokens_used: data.tokens_used,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent("");
        setIsStreaming(false);
      },
      onError: (err) => {
        console.error("Chat streaming failed:", err);
        setError(err.message || "Connection interrupted. Reconnecting...");
        setIsStreaming(false);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sampleQuestions = [
    "Does this contract have unfair unilateral termination terms?",
    "Explain what obligations I have under Kenyan law.",
    "Can the other party claim damages without proving actual loss?",
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory && (
          <div className="flex items-center justify-center p-8 text-slate-500 text-xs">
            Loading conversation history...
          </div>
        )}

        {messages.length === 0 && !streamingContent && (
          <div className="p-6 text-center space-y-4 max-w-md mx-auto my-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-base">Ask Counsel Anything</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Clarify clauses, test negotiation tactics, and get plain-English explanations with direct page references `[p. N]`.
              </p>
            </div>

            <div className="space-y-2 text-left pt-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Suggested Prompts
              </span>
              {sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="w-full text-left text-xs p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 text-slate-300 hover:text-white transition-colors"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                msg.role === "user"
                  ? "bg-slate-700 text-slate-200"
                  : "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-slate-800 text-slate-100 rounded-tr-sm border border-slate-700/80"
                  : "bg-slate-900/90 text-slate-200 rounded-tl-sm border border-slate-800 shadow-md"
              }`}
            >
              {msg.role === "user" ? (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <StreamingMessage content={msg.content} onPageClick={onPageClick} />
              )}
            </div>
          </div>
        ))}

        {/* Real-time Streaming message */}
        {isStreaming && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-slate-900/90 rounded-tl-sm border border-emerald-900/60 shadow-lg">
              <StreamingMessage
                content={streamingContent || "Analyzing context..."}
                isStreaming={true}
                onPageClick={onPageClick}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <div className="relative flex items-center">
          <input
            id="chat-input-field"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about clauses, liabilities, Kenyan laws..."
            disabled={isStreaming}
            className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 transition-all"
          />
          <button
            id="send-chat-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className="absolute right-2 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
