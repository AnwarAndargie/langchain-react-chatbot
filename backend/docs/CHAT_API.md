# Chat API — Frontend Integration

Base path for all chat endpoints: **`/chat`**  
Example base URL: `http://localhost:8000` (or your backend origin).

All chat endpoints **require authentication**. Send the Supabase access token (from `/auth/login` or `/auth/register`) in the `Authorization` header.

---

## Headers (all chat endpoints)

| Header             | Required | Value |
|--------------------|----------|--------|
| `Authorization`    | Yes      | `Bearer <access_token>` |
| `Content-Type`     | Yes (POST) | `application/json` |

---

## 1. Send message (non-stream)

Get the full assistant reply in one response after the backend finishes.

### Request

- **Method:** `POST`
- **Path:** `/chat/message`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body:**

```json
{
  "message": "Your message text (required, non-empty)",
  "conversation_id": "uuid-or-null"
}
```

| Field              | Type   | Required | Description |
|--------------------|--------|----------|-------------|
| `message`          | string | Yes      | User message. Min length 1, leading/trailing whitespace is stripped. |
| `conversation_id`  | UUID   | No       | Omit or `null` to start a new conversation. Set to an existing conversation UUID to continue the thread. |

### Response

- **Status:** `200 OK`
- **Body:**

```json
{
  "conversation_id": "6096a23f-268c-4aeb-9126-a6cd4faef701",
  "message": {
    "id": "f5a56793-6fa8-41a7-88b0-6828bc75d90a",
    "conversation_id": "6096a23f-268c-4aeb-9126-a6cd4faef701",
    "role": "assistant",
    "content": "Full assistant reply text.",
    "timestamp": "2026-02-12T11:28:29.162999Z"
  }
}
```

| Field                    | Type   | Description |
|--------------------------|--------|-------------|
| `conversation_id`        | UUID   | Conversation this message belongs to (use for follow-up requests). |
| `message.id`             | UUID   | Unique message ID. |
| `message.conversation_id`| UUID   | Same as top-level `conversation_id`. |
| `message.role`           | string | Always `"assistant"` for this endpoint. |
| `message.content`        | string | Full reply text. |
| `message.timestamp`      | string | ISO 8601 datetime. |

### Error responses

| Status | When |
|--------|------|
| `400`  | Invalid body (e.g. empty `message`). |
| `401`  | Missing or invalid `Authorization` header. |
| `404`  | `conversation_id` not found or not owned by the user. |
| `500`  | Server/agent error. |

---

## 2. Send message (stream)

Stream the assistant reply in real time (SSE). Use for a typing/streaming effect like GPT or Grok.

### Request

- **Method:** `POST`
- **Path:** `/chat/message/stream`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body:** Same as non-stream.

```json
{
  "message": "Your message text",
  "conversation_id": "uuid-or-null"
}
```

### Response

- **Status:** `200 OK`
- **Content-Type:** `text/event-stream`
- **Body:** Server-Sent Events. Each event is a line starting with `data: ` followed by a JSON object and then `\n\n`.

**Event types:**

| Type     | When        | Payload |
|----------|-------------|---------|
| `chunk`  | Each token/fragment of the reply | `{ "type": "chunk", "content": "..." }` — append `content` to the displayed text. |
| `done`   | Stream finished | `{ "type": "done", "conversation_id": "...", "message_id": "...", "message": { ... } }` — same `message` shape as non-stream response. |
| `error`  | Validation or server error | `{ "type": "error", "detail": "..." }` |

**Example stream (conceptual):**

```
data: {"type":"chunk","content":"Hello"}

data: {"type":"chunk","content":"!"}

data: {"type":"done","conversation_id":"...","message_id":"...","message":{"id":"...","conversation_id":"...","role":"assistant","content":"Hello!","timestamp":"..."}}

```

### Frontend: consuming the stream

1. `fetch(url, { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ message, conversation_id }) })`.
2. Read the body: `response.body.getReader()` and decode with `TextDecoder`.
3. Buffer incoming bytes; split by `\n\n` to get event lines.
4. For each line that starts with `data: `, parse the rest as JSON.
5. If `event.type === "chunk"`: append `event.content` to the assistant message in state/UI.
6. If `event.type === "done"`: store `conversation_id`, `message_id`, and `message`; stop loading.
7. If `event.type === "error"`: show `event.detail`.

**Minimal example (JavaScript/TypeScript):**

```ts
const res = await fetch(`${API_URL}/chat/message/stream`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    message: userInput,
    conversation_id: currentConversationId ?? null,
  }),
});

const reader = res.body?.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (reader) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const event = JSON.parse(line.slice(6));
    if (event.type === "chunk") setAssistantText((t) => t + (event.content ?? ""));
    if (event.type === "done") setMessage(event.message);
    if (event.type === "error") setError(event.detail);
  }
}
```

---

## 3. List conversations

Get the current user’s conversations for the sidebar (newest first).

### Request

- **Method:** `GET`
- **Path:** `/chat/conversations`
- **Headers:** `Authorization: Bearer <token>`
- **Query parameters:**

| Parameter | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `limit`   | number | 50      | Number of conversations to return (1–100). |
| `offset`  | number | 0       | Number to skip for pagination (≥ 0). |

**Example:** `GET /chat/conversations?limit=20&offset=0`

### Response

- **Status:** `200 OK`
- **Body:**

```json
{
  "conversations": [
    {
      "id": "6096a23f-268c-4aeb-9126-a6cd4faef701",
      "title": "First message preview...",
      "created_at": "2026-02-12T10:00:00Z",
      "updated_at": "2026-02-12T11:30:00Z"
    }
  ]
}
```

| Field                | Type   | Description |
|----------------------|--------|-------------|
| `conversations`      | array  | List of conversation summaries. |
| `conversations[].id` | UUID   | Use as `conversation_id` when loading messages or sending a new message. |
| `conversations[].title` | string \| null | Preview title (often first message). |
| `conversations[].created_at` | string | ISO 8601. |
| `conversations[].updated_at` | string | ISO 8601. |

### Error responses

| Status | When |
|--------|------|
| `400`  | `limit` not in 1–100 or `offset` &lt; 0. |
| `401`  | Missing or invalid token. |

---

## 4. Get messages in a conversation

Load the message thread for a conversation (e.g. when user selects a chat).

### Request

- **Method:** `GET`
- **Path:** `/chat/conversations/{conversation_id}/messages`
- **Headers:** `Authorization: Bearer <token>`
- **Path parameter:** `conversation_id` — UUID of the conversation.
- **Query parameters:**

| Parameter | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `limit`   | number | 100     | Max messages to return (1–200). |
| `offset`  | number | 0       | Number to skip (≥ 0). |

**Example:** `GET /chat/conversations/6096a23f-268c-4aeb-9126-a6cd4faef701/messages?limit=50&offset=0`

### Response

- **Status:** `200 OK`
- **Body:**

```json
{
  "messages": [
    {
      "id": "msg-uuid-1",
      "conversation_id": "6096a23f-268c-4aeb-9126-a6cd4faef701",
      "role": "user",
      "content": "Hello",
      "timestamp": "2026-02-12T10:00:00Z"
    },
    {
      "id": "msg-uuid-2",
      "conversation_id": "6096a23f-268c-4aeb-9126-a6cd4faef701",
      "role": "assistant",
      "content": "Hi! How can I help?",
      "timestamp": "2026-02-12T10:00:05Z"
    }
  ],
  "conversation_id": "6096a23f-268c-4aeb-9126-a6cd4faef701"
}
```

| Field           | Type   | Description |
|-----------------|--------|-------------|
| `messages`      | array  | Messages in chronological order (oldest first). |
| `messages[].id` | UUID   | Message ID. |
| `messages[].conversation_id` | UUID | Conversation ID. |
| `messages[].role` | string | `"user"` or `"assistant"` (or `"system"`). |
| `messages[].content` | string | Message text. |
| `messages[].timestamp` | string | ISO 8601. |
| `conversation_id` | UUID | Echo of the requested conversation. |

### Error responses

| Status | When |
|--------|------|
| `400`  | `limit` not in 1–200 or `offset` &lt; 0. |
| `401`  | Missing or invalid token. |
| `404`  | Conversation not found or not owned by the user. |

---

## Summary

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/chat/message` | Send message; get full reply (single JSON response). |
| `POST` | `/chat/message/stream` | Send message; get reply as SSE stream (real-time). |
| `GET`  | `/chat/conversations` | List user’s conversations (sidebar). |
| `GET`  | `/chat/conversations/{id}/messages` | Get messages for one conversation (thread). |

**Auth:** Use the **Supabase access token** from `POST /auth/login` or `POST /auth/register` as `Authorization: Bearer <token>` on every chat request.
