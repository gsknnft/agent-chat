/**
 * Parses a raw SSE stream response and returns an async iterator
 * of parsed event objects.
 */
export async function* parseAgentStream(
  response: Response,
): AsyncIterator<AgentStreamEvent> {
  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const raw = trimmed.slice(5).trim();
      if (raw === "[DONE]") return;
      try {
        const ev = JSON.parse(raw) as AgentStreamEvent;
        yield ev;
      } catch {
        // skip malformed lines
      }
    }
  }
}

export type AgentStreamEvent =
  | { type: "delta"; content: string }
  | {
      type: "tool_call";
      name: string;
      args: Record<string, unknown>;
      result: unknown;
    }
  | { type: "error"; message: string }
  | { type: "done" };

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
  streaming?: boolean;
  error?: boolean;
}

export interface AgentChatOptions {
  /** Base URL of the app's backend, e.g. http://localhost:8000 */
  baseUrl: string;
  /** Additional app context injected into every request */
  context?: Record<string, unknown>;
}

export async function sendAgentMessage(
  messages: Array<{ role: string; content: string }>,
  options: AgentChatOptions,
  signal?: AbortSignal,
): Promise<Response> {
  const url = `${options.baseUrl}/api/agent/chat`;
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      messages,
      context: options.context ?? {},
      stream: true,
    }),
    signal,
  });
}
