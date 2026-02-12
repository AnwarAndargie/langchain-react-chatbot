/**
 * Chat state management via React Context.
 *
 * Provides:
 *  - conversation list (sidebar)
 *  - active conversation & its messages
 *  - send message with streaming
 *  - new chat / select chat
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    getMessages as apiGetMessages,
    listConversations as apiListConversations,
    streamMessage,
} from "@/api/chat";
import type { Conversation, Message } from "@/types/chat";
import { useAuth } from "@/state/AuthContext";

/* ── Context shape ───────────────────────────────────────── */

interface ChatContextValue {
    /** Sidebar conversation list (newest first). */
    conversations: Conversation[];
    /** Whether the conversation list is loading. */
    conversationsLoading: boolean;
    /** The currently active conversation ID, or null for a new chat. */
    activeConversationId: string | null;
    /** Messages for the active conversation. */
    messages: Message[];
    /** Whether messages are loading for the active conversation. */
    messagesLoading: boolean;
    /** Whether the assistant is currently streaming a reply. */
    isStreaming: boolean;
    /** The in-progress assistant text while streaming. */
    streamingContent: string;
    /** Error from the last operation. */
    error: string | null;
    /** Start a brand-new conversation (clears active). */
    startNewChat: () => void;
    /** Select an existing conversation. */
    selectConversation: (id: string) => void;
    /** Send a user message (with streaming reply). */
    sendMessage: (text: string) => Promise<void>;
    /** Stop the current stream (if any). */
    stopStreaming: () => void;
    /** Clear the current error. */
    clearError: () => void;
    /** Refresh the conversation list. */
    refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

/* ── Provider ────────────────────────────────────────────── */

export function ChatProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();

    /* Conversation list */
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [conversationsLoading, setConversationsLoading] = useState(false);

    /* Active conversation */
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);

    /* Streaming state */
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const abortRef = useRef<AbortController | null>(null);

    /* Errors */
    const [error, setError] = useState<string | null>(null);
    const clearError = useCallback(() => setError(null), []);

    /* ── Refresh conversation list ─────────────────────────── */

    const refreshConversations = useCallback(async () => {
        setConversationsLoading(true);
        try {
            const data = await apiListConversations({ limit: 50 });
            setConversations(data.conversations);
        } catch (err) {
            setError((err as Error).message || "Failed to load conversations");
        } finally {
            setConversationsLoading(false);
        }
    }, []);

    /* Fetch conversations on mount (when authenticated) */
    useEffect(() => {
        if (isAuthenticated) {
            refreshConversations();
        } else {
            setConversations([]);
            setActiveConversationId(null);
            setMessages([]);
        }
    }, [isAuthenticated, refreshConversations]);

    /* ── Load messages when active conversation changes ────── */

    useEffect(() => {
        if (!activeConversationId) {
            setMessages([]);
            return;
        }

        let cancelled = false;

        async function load() {
            setMessagesLoading(true);
            try {
                const data = await apiGetMessages(activeConversationId!);
                if (!cancelled) setMessages(data.messages);
            } catch (err) {
                if (!cancelled) setError((err as Error).message || "Failed to load messages");
            } finally {
                if (!cancelled) setMessagesLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [activeConversationId]);

    /* ── Start a new chat ──────────────────────────────────── */

    const startNewChat = useCallback(() => {
        // Cancel any in-flight stream
        abortRef.current?.abort();
        setActiveConversationId(null);
        setMessages([]);
        setStreamingContent("");
        setIsStreaming(false);
        setError(null);
    }, []);

    /* ── Select existing conversation ──────────────────────── */

    const selectConversation = useCallback((id: string) => {
        if (id === activeConversationId) return;
        abortRef.current?.abort();
        setStreamingContent("");
        setIsStreaming(false);
        setError(null);
        setActiveConversationId(id);
    }, [activeConversationId]);

    const stopStreaming = useCallback(() => {
        abortRef.current?.abort();
        setStreamingContent("");
        setIsStreaming(false);
    }, []);

    /* ── Send message with streaming ───────────────────────── */

    const sendMsg = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        setError(null);

        // Optimistically add user message
        const optimisticUserMsg: Message = {
            id: `temp-${Date.now()}`,
            conversation_id: activeConversationId ?? "",
            role: "user",
            content: trimmed,
            timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticUserMsg]);

        // Start streaming
        setIsStreaming(true);
        setStreamingContent("");

        const controller = new AbortController();
        abortRef.current = controller;

        await streamMessage(
            {
                message: trimmed,
                conversation_id: activeConversationId ?? null,
            },
            /* onChunk */
            (content) => {
                setStreamingContent((prev) => prev + content);
            },
            /* onDone */
            (event) => {
                // If this was a new conversation, set the active ID
                if (!activeConversationId) {
                    setActiveConversationId(event.conversation_id);
                }

                // Replace optimistic user msg ID & append the final assistant message
                setMessages((prev) => {
                    const updated = prev.map((m) =>
                        m.id === optimisticUserMsg.id
                            ? { ...m, id: m.id, conversation_id: event.conversation_id }
                            : m
                    );
                    return [...updated, event.message];
                });

                setStreamingContent("");
                setIsStreaming(false);

                // Refresh sidebar so the new/updated conversation shows
                refreshConversations();
            },
            /* onError */
            (detail) => {
                setError(detail);
                setIsStreaming(false);
                setStreamingContent("");
            },
            controller.signal,
        );
    }, [activeConversationId, refreshConversations]);

    /* ── Memoised context value ────────────────────────────── */

    const value = useMemo<ChatContextValue>(() => ({
        conversations,
        conversationsLoading,
        activeConversationId,
        messages,
        messagesLoading,
        isStreaming,
        streamingContent,
        error,
        startNewChat,
        selectConversation,
        sendMessage: sendMsg,
        stopStreaming,
        clearError,
        refreshConversations,
    }), [
        conversations,
        conversationsLoading,
        activeConversationId,
        messages,
        messagesLoading,
        isStreaming,
        streamingContent,
        error,
        startNewChat,
        selectConversation,
        sendMsg,
        stopStreaming,
        clearError,
        refreshConversations,
    ]);

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/* ── Hook ────────────────────────────────────────────────── */

export function useChat(): ChatContextValue {
    const ctx = useContext(ChatContext);
    if (!ctx) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return ctx;
}
