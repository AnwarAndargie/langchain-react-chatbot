/**
 * Chat API module.
 *
 * Provides functions for all chat endpoints:
 *  - sendMessage        (non-streaming)
 *  - streamMessage      (SSE streaming)
 *  - listConversations  (sidebar list)
 *  - getMessages        (conversation thread)
 */

import { apiRequest, getApiUrl, getAuthToken } from "@/api/client";
import type {
    GetMessagesResponse,
    ListConversationsResponse,
    PaginationParams,
    SendMessageRequest,
    SendMessageResponse,
    StreamEvent,
} from "@/types/chat";

/* ─── Non-streaming send ─────────────────────────────────── */

export async function sendMessage(
    payload: SendMessageRequest,
): Promise<SendMessageResponse> {
    return apiRequest<SendMessageResponse>("/chat/message", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

/* ─── Streaming send (SSE) ───────────────────────────────── */

/**
 * Opens an SSE stream for a chat message.
 *
 * @param payload   – the message + optional conversation_id
 * @param onChunk   – called for every text chunk (append to UI)
 * @param onDone    – called when the stream finishes with the final message
 * @param onError   – called on stream or network error
 * @param signal    – optional AbortSignal to cancel the stream
 */
export async function streamMessage(
    payload: SendMessageRequest,
    onChunk: (content: string) => void,
    onDone: (event: Extract<StreamEvent, { type: "done" }>) => void,
    onError: (detail: string) => void,
    onToolStart?: (tool: string) => void,
    signal?: AbortSignal,
): Promise<void> {
    const url = getApiUrl("/chat/message/stream");
    const token = getAuthToken();

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let res: Response;
    try {
        res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal,
        });
    } catch (err) {
        if ((err as Error).name === "AbortError") return;
        onError((err as Error).message || "Network error");
        return;
    }

    if (!res.ok) {
        const body = await res.text();
        let detail = body;
        try {
            const json = JSON.parse(body);
            if (json.detail) detail = typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
        } catch {
            /* use raw body */
        }
        onError(detail || `Request failed: ${res.status}`);
        return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
        onError("No response body to read");
        return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Artificial delay to make streaming smoother/visible
            await new Promise((resolve) => setTimeout(resolve, 15));

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop() ?? "";

            for (const part of parts) {
                if (!part.startsWith("data: ")) continue;
                const json = part.slice(6);

                let event: StreamEvent;
                try {
                    event = JSON.parse(json) as StreamEvent;
                } catch {
                    continue;
                }

                switch (event.type) {
                    case "chunk":
                        onChunk(event.content);
                        break;
                    case "tool_start":
                        onToolStart?.(event.tool);
                        break;
                    case "done":
                        onDone(event);
                        break;
                    case "error":
                        onError(event.detail);
                        return;
                }
            }
        }
    } catch (err) {
        if ((err as Error).name === "AbortError") return;
        onError((err as Error).message || "Stream error");
    }
}

/* ─── List conversations ─────────────────────────────────── */

export async function listConversations(
    params?: PaginationParams,
): Promise<ListConversationsResponse> {
    const query = new URLSearchParams();
    if (params?.limit != null) query.set("limit", String(params.limit));
    if (params?.offset != null) query.set("offset", String(params.offset));

    const qs = query.toString();
    const path = `/chat/conversations${qs ? `?${qs}` : ""}`;

    return apiRequest<ListConversationsResponse>(path);
}

/* ─── Get messages for a conversation ────────────────────── */

export async function getMessages(
    conversationId: string,
    params?: PaginationParams,
): Promise<GetMessagesResponse> {
    const query = new URLSearchParams();
    if (params?.limit != null) query.set("limit", String(params.limit));
    if (params?.offset != null) query.set("offset", String(params.offset));

    const qs = query.toString();
    const path = `/chat/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`;

    return apiRequest<GetMessagesResponse>(path);
}
