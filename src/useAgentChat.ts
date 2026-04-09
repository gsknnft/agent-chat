"use client";

import { useCallback, useRef, useState } from "react";
import {
  type AgentChatOptions,
  type AgentMessage,
  AgentStreamEvent,
  parseAgentStream,
  sendAgentMessage,
} from "./stream";

let _msgCounter = 0;
function nextId() {
  return `msg-${Date.now()}-${++_msgCounter}`;
}

export interface UseAgentChatReturn {
  messages: AgentMessage[];
  busy: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  clear: () => void;
}

export function useAgentChat(options: AgentChatOptions): UseAgentChatReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      if (busy || !text.trim()) return;

      const userMsg: AgentMessage = {
        id: nextId(),
        role: "user",
        content: text.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setBusy(true);
      setError(null);

      const abortController = new AbortController();
      abortRef.current = abortController;

      const assistantId = nextId();
      const assistantMsg: AgentMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
        toolCalls: [],
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Build history for the API call (no previous assistant streaming stubs)
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const response = await sendAgentMessage(
          history,
          options,
          abortController.signal,
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const stream = parseAgentStream(response);
        const toolCallsAccum: AgentMessage["toolCalls"] = [];

        const iter = stream as AsyncIterator<AgentStreamEvent>;

        while (true) {
          const { value: ev, done } = await iter.next();
          if (done || !ev) break;

          if (ev.type === "delta") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + ev.content } : m,
              ),
            );
          } else if (ev.type === "tool_call") {
            toolCallsAccum.push({
              name: ev.name,
              args: ev.args,
              result: ev.result,
            });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, toolCalls: [...toolCallsAccum] } : m,
              ),
            );
          } else if (ev.type === "error") {
            setError(ev.message);
            break;
          } else if (ev.type === "done") {
            break;
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // User cancelled — leave partial message visible
        } else {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setError(msg);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, error: true, streaming: false }
                : m,
            ),
          );
        }
      } finally {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m,
          ),
        );
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, messages, options],
  );

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setBusy(false);
  }, []);

  return { messages, busy, error, send, clear };
}
