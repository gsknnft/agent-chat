## Agent Chat

Reusable React chat widget + hook for OpenAI-compatible SSE agent backends.

Package: `@gsknnft/agent-chat`

This package follows the same internal package contract used by the reusable workspace libraries:

- build output lives in `dist/`
- `main`, `types`, and `exports` point at built artifacts
- source under `src/` is authoring input, not the runtime entrypoint

## What this package provides

- `AgentChatWidget`: floating UI widget with message stream, tool-call chips, and input panel.
- `useAgentChat`: headless hook for building a custom chat UI.
- `parseAgentStream`: SSE parser for `data: {...}` streaming responses.

## Installation

This package is part of the monorepo workspace.

```bash
pnpm --filter @gsknnft/agent-chat build
```

Peer dependency:

- `react >= 19.2.4`

## Quick start

```tsx
"use client";

import { AgentChatWidget } from "@gsknnft/agent-chat";

export default function Example() {
  return (
    <AgentChatWidget
      title="Picture Lab Assistant"
      placeholder="Ask me about capture quality, recipe tuning, or GLB export..."
      options={{
        baseUrl: "http://localhost:8000",
        context: {
          page: "picture-lab",
          project_id: "project-123",
        },
      }}
    />
  );
}
```

## API

### `AgentChatWidget`

Props:

- `options: AgentChatOptions` (required)
- `title?: string`
- `placeholder?: string`
- `position?: "bottom-right" | "bottom-left"`

### `AgentChatOptions`

- `baseUrl: string`
- `context?: Record<string, unknown>`

Expected backend endpoint:

- `POST {baseUrl}/api/agent/chat`
- request body:

```json
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "context": { "project_id": "project-123" },
  "stream": true
}
```

Expected SSE stream events:

- `{ "type": "delta", "content": "..." }`
- `{ "type": "tool_call", "name": "...", "args": {}, "result": {} }`
- `{ "type": "error", "message": "..." }`
- `{ "type": "done" }`

## Using the hook directly

```tsx
"use client";

import { useAgentChat } from "@gsknnft/agent-chat";

export function CustomChat() {
  const { messages, busy, error, send, clear } = useAgentChat({
    baseUrl: "http://localhost:8000",
    context: { page: "upload" },
  });

  return (
    <div>
      <button onClick={clear}>Clear</button>
      <button disabled={busy} onClick={() => void send("Check my coverage")}>
        Run
      </button>
      {error ? <p>{error}</p> : null}
      <pre>{JSON.stringify(messages, null, 2)}</pre>
    </div>
  );
}
```

## Development

```bash
pnpm --filter @gsknnft/agent-chat typecheck
pnpm --filter @gsknnft/agent-chat test
pnpm --filter @gsknnft/agent-chat build
```

## Troubleshooting

- `HTTP 404/500`: verify backend route `/api/agent/chat` and `baseUrl`.
- No streaming updates: ensure backend returns `text/event-stream` and SSE `data:` lines.
- CORS issues: allow frontend origin in backend CORS configuration.
- Messages not context-aware: pass `options.context` from the host app (project/model/page state).

## Future Enhancements

### Roadmap/Features to Consider:
    - Conversation history and search.
    - User/system prompt customization.
    - Theming (light/dark/custom colors, font size).
    - Message pinning, starring, or tagging.
    - File/code snippet attachments.
    - Inline tool/plugin results (tables, charts, images).
    - Multi-agent or persona switching.
    - Security: redact sensitive info, audit logs, user roles.
    - Efficiency: streaming responses, lazy-load history.
    - Robustness: auto-reconnect, error recovery, offline mode.
    - Accessibility: keyboard navigation, screen reader support.

### Other Model Capabilities:

- Security: input validation, output filtering, user authentication.
- Efficiency: model selection (fast/accurate), resource-aware inference.
- Robustness: fallback to simpler models, retry on failure, diagnostics reporting.
