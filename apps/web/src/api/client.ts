import axios from "axios";

export const API_BASE_URL = "/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export interface DocumentInfo {
  id: number;
  filename: string;
  page_count: number;
  preview: string;
  created_at?: string;
  fileUrl?: string;
}

export interface DocumentSummary {
  parties: string[];
  term: string;
  obligations: string[];
  risks: string[];
  plain_summary: string;
}

export interface RedFlag {
  clause_text: string;
  page: number;
  severity: "high" | "med" | "low" | "medium";
  explanation: string;
  suggestion: string;
}

export interface QuestionItem {
  question: string;
  why_it_matters?: string;
}

export interface MessageItem {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  tokens_used?: number;
  created_at: string;
}

export interface UsageLogItem {
  id: number;
  endpoint: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  created_at: string;
}

export interface UsageSummary {
  user_id: number;
  total_tokens_month: number;
  total_cost_usd_month: number;
  daily_tokens_used: number;
  daily_token_cap: number;
  logs: UsageLogItem[];
}

export const documentApi = {
  upload: async (file: File, userId = 1, onProgress?: (pct: number) => void): Promise<DocumentInfo> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<DocumentInfo>(`/documents/upload?user_id=${userId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(pct);
        }
      },
    });
    return res.data;
  },

  list: async (userId = 1): Promise<DocumentInfo[]> => {
    const res = await api.get<DocumentInfo[]>(`/documents?user_id=${userId}`);
    return res.data;
  },

  get: async (id: number, userId = 1): Promise<DocumentInfo> => {
    const res = await api.get<DocumentInfo>(`/documents/${id}?user_id=${userId}`);
    return {
      ...res.data,
      fileUrl: `${API_BASE_URL}/documents/${id}/file?user_id=${userId}`,
    };
  },

  getSummary: async (id: number, userId = 1): Promise<DocumentSummary> => {
    const res = await api.post<{ summary: DocumentSummary }>(`/documents/${id}/summary?user_id=${userId}`);
    return res.data.summary;
  },

  getRedFlags: async (id: number, userId = 1): Promise<RedFlag[]> => {
    const res = await api.post<{ red_flags: RedFlag[] }>(`/documents/${id}/red-flags?user_id=${userId}`);
    return res.data.red_flags;
  },

  getQuestions: async (id: number, userId = 1): Promise<QuestionItem[]> => {
    const res = await api.post<{ questions: QuestionItem[] }>(`/documents/${id}/questions?user_id=${userId}`);
    return res.data.questions;
  },

  getConversation: async (id: number, userId = 1): Promise<{ id: number; document_id: number }> => {
    const res = await api.get<{ id: number; document_id: number }>(`/documents/${id}/conversation?user_id=${userId}`);
    return res.data;
  },

  getMessages: async (convId: number, userId = 1): Promise<MessageItem[]> => {
    const res = await api.get<MessageItem[]>(`/conversations/${convId}/messages?user_id=${userId}`);
    return res.data;
  },

  getUsage: async (userId = 1): Promise<UsageSummary> => {
    const res = await api.get<UsageSummary>(`/usage?user_id=${userId}`);
    return res.data;
  },
};

/**
 * Stream chat message via SSE using fetch and ReadableStream reader.
 * Includes automatic buffer chunking and network drop reconnection handling.
 */
export async function streamChatMessage({
  convId,
  content,
  userId = 1,
  onToken,
  onDone,
  onError,
  signal,
}: {
  convId: number;
  content: string;
  userId?: number;
  onToken: (text: string) => void;
  onDone: (data: { message_id?: number; tokens_used?: number }) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}): Promise<void> {
  let attempt = 0;
  const maxRetries = 2;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${convId}/messages?user_id=${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ content }),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error("No response body received from server");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;

          let eventName = "message";
          let dataStr = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) {
              eventName = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.replace("data:", "").trim();
            }
          }

          if (eventName === "token" && dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                onToken(parsed.text);
              }
            } catch {
              onToken(dataStr);
            }
          } else if (eventName === "done") {
            try {
              const parsed = JSON.parse(dataStr);
              onDone(parsed);
            } catch {
              onDone({});
            }
            return;
          } else if (eventName === "error") {
            try {
              const parsed = JSON.parse(dataStr);
              throw new Error(parsed.error || "Streaming error");
            } catch (e: any) {
              throw new Error(e.message || "Streaming error");
            }
          }
        }
      }

      return;
    } catch (err: any) {
      if (err.name === "AbortError") {
        return;
      }
      attempt++;
      if (attempt > maxRetries) {
        onError(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      // Exponential backoff reconnect
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}
