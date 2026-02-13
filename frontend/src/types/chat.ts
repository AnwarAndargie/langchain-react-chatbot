/* ── Chat Domain Types ────────────────────────────────────── */

/** A single message in a conversation. */
export interface Message {
    id: string;
    conversation_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
}

/** Conversation summary returned by the list endpoint. */
export interface Conversation {
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
}

/* ── Request / Response shapes ───────────────────────────── */

export interface SendMessageRequest {
    message: string;
    conversation_id?: string | null;
}

export interface SendMessageResponse {
    conversation_id: string;
    message: Message;
}

export interface ListConversationsResponse {
    conversations: Conversation[];
}

export interface GetMessagesResponse {
    messages: Message[];
    conversation_id: string;
}

/* ── SSE stream event types ──────────────────────────────── */

export interface StreamChunkEvent {
    type: "chunk";
    content: string;
}

export interface StreamDoneEvent {
    type: "done";
    conversation_id: string;
    message_id: string | null;
    message: Message;
}

export interface StreamErrorEvent {
    type: "error";
    detail: string;
}

export interface StreamToolStartEvent {
    type: "tool_start";
    tool: string;
}

export type StreamEvent = StreamChunkEvent | StreamDoneEvent | StreamErrorEvent | StreamToolStartEvent;

/* ── Pagination params ───────────────────────────────────── */

export interface PaginationParams {
    limit?: number;
    offset?: number;
}
