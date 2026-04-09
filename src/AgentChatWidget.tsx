"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AgentChatOptions, AgentMessage } from "./stream";
import { useAgentChat } from "./useAgentChat";

/* ─────────────────────────────────────────────────────────── */
/* Message bubble                                             */
/* ─────────────────────────────────────────────────────────── */

function ToolCallChip({ name, result }: { name: string; result: unknown }) {
  const [open, setOpen] = useState(false);
  const preview =
    typeof result === "object" && result !== null
      ? JSON.stringify(result).slice(0, 80) +
        (JSON.stringify(result).length > 80 ? "…" : "")
      : String(result);

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="mt-1 w-full rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-left text-[11px] text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-900/40"
    >
      <span className="font-mono font-semibold">{name}</span>
      {open ? (
        <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[10px]">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : (
        <span className="ml-2 text-sky-500 dark:text-sky-400">{preview}</span>
      )}
    </button>
  );
}

function MessageBubble({ msg }: { msg: AgentMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      {!isUser && (
        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] text-white">
          A
        </div>
      )}
      <div
        className={`max-w-[82%] space-y-1 ${isUser ? "items-end" : "items-start"} flex flex-col`}
      >
        <div
          className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
            isUser
              ? "bg-violet-600 text-white"
              : msg.error
                ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
                : "border border-border/50 bg-muted/60 text-foreground"
          }`}
        >
          {msg.content ||
            (msg.streaming ? (
              <span className="animate-pulse opacity-60">●●●</span>
            ) : (
              ""
            ))}
        </div>
        {(msg.toolCalls ?? []).map((tc, i) => (
          <ToolCallChip key={i} name={tc.name} result={tc.result} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Panel                                                       */
/* ─────────────────────────────────────────────────────────── */

interface AgentPanelProps {
  options: AgentChatOptions;
  onClose: () => void;
  title?: string;
  placeholder?: string;
}

function AgentPanel({
  options,
  onClose,
  title = "Agent",
  placeholder = "Ask me anything…",
}: AgentPanelProps) {
  const { messages, busy, error, send, clear } = useAgentChat(options);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || busy) return;
    const text = input;
    setInput("");
    await send(text);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="flex h-full flex-col rounded-[28px] border border-white/50 bg-white/95 shadow-2xl backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-[28px] border-b border-border/45 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-[10px] text-white">
            A
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {busy && (
            <span className="animate-pulse text-[11px] text-muted-foreground">
              thinking…
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={clear}
            className="rounded-full px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="text-2xl">✦</div>
              <p>
                Ask me to guide you through the pipeline,
                <br />
                check coverage, or design a character.
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border/45 px-3 pb-3 pt-2"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-400/30">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            disabled={busy}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="shrink-0 rounded-full bg-violet-600 p-1.5 text-white transition-colors hover:bg-violet-700 disabled:opacity-40"
            aria-label="Send"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 7h10M8 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className="mt-1 text-center text-[10px] text-muted-foreground/60">
          Shift+Enter for new line · Enter to send
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Float button + container                                    */
/* ─────────────────────────────────────────────────────────── */

export interface AgentChatWidgetProps {
  options: AgentChatOptions;
  /** Panel title */
  title?: string;
  /** Textarea placeholder */
  placeholder?: string;
  /**
   * Position of the float button.
   * Defaults to bottom-right.
   */
  position?: "bottom-right" | "bottom-left";
}

/**
 * Drop-in floating agent chat widget.
 *
 * Usage:
 * ```tsx
 * <AgentChatWidget
 *   options={{ baseUrl: "http://localhost:8000", context: { project_id: "xyz" } }}
 *   title="ScanForge Assistant"
 * />
 * ```
 */
export function AgentChatWidget({
  options,
  title = "Assistant",
  placeholder,
  position = "bottom-right",
}: AgentChatWidgetProps) {
  const [open, setOpen] = useState(false);

  const posClass =
    position === "bottom-left" ? "bottom-6 left-6" : "bottom-6 right-6";

  return (
    <>
      {/* Float button */}
      <button
        type="button"
        aria-label="Open agent chat"
        onClick={() => setOpen((v) => !v)}
        className={`fixed ${posClass} z-50 flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg transition-all hover:bg-violet-700 hover:shadow-xl active:scale-95 ${open ? "scale-90 opacity-0 pointer-events-none" : ""}`}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M4 4h12a1 1 0 011 1v8a1 1 0 01-1 1H7l-4 3V5a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Sliding panel */}
      {open && (
        <div
          className={`fixed ${posClass} z-50 h-[520px] w-[360px] transition-all`}
          style={{ bottom: "24px" }}
        >
          <AgentPanel
            options={options}
            onClose={() => setOpen(false)}
            title={title}
            placeholder={placeholder}
          />
        </div>
      )}
    </>
  );
}

export type { AgentChatOptions };
