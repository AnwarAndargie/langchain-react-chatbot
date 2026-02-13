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
import { useNavigate, useParams } from "react-router-dom";

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
    /** Current tool activity status (e.g. "Searching web..."), or null. */
    toolStatus: string | null;
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
    const navigate = useNavigate();
    const { conversationId: urlConversationId } = useParams();

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
    const [toolStatus, setToolStatus] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const toolsUsedInStreamRef = useRef<string[]>([]);
    const summarizingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasShownSummarizingRef = useRef(false);

    /* Errors */
    const [error, setError] = useState<string | null>(null);
    const clearError = useCallback(() => setError(null), []);

    /* ── Sync URL with active conversation ─────────────────── */

    // When URL params change, update state
    useEffect(() => {
        if (urlConversationId && urlConversationId !== activeConversationId) {
            // Only switch if different (and validated by auth/list, but we trust URL for now)
            setActiveConversationId(urlConversationId);
        } else if (!urlConversationId && activeConversationId) {
            // URL cleared -> clear active
            setActiveConversationId(null);
            setMessages([]);
        }
    }, [urlConversationId, activeConversationId]);

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
            setMessagesLoading(false);
            return;
        }

        let cancelled = false;

        async function load() {
            setMessagesLoading(true);
            try {
                const data = await apiGetMessages(activeConversationId!);
                if (!cancelled) {
                    const normalized = data.messages.map((m) => ({
                        ...m,
                        toolsUsed: (m as Message & { tools_used?: string[] }).tools_used ?? m.toolsUsed,
                    }));
                    setMessages(normalized);
                }
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
        setToolStatus(null);
        setIsStreaming(false);
        setError(null);
        navigate("/chat");
    }, [navigate]);

    /* ── Select existing conversation ──────────────────────── */

    const selectConversation = useCallback((id: string) => {
        if (id === activeConversationId) return;
        abortRef.current?.abort();
        setStreamingContent("");
        setToolStatus(null);
        setIsStreaming(false);
        setError(null);
        navigate(`/chat/${id}`);
    }, [activeConversationId, navigate]);

    const stopStreaming = useCallback(() => {
        abortRef.current?.abort();
        setStreamingContent("");
        setToolStatus(null);
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
        setToolStatus(null);
        toolsUsedInStreamRef.current = [];
        hasShownSummarizingRef.current = false;
        if (summarizingTimeoutRef.current) {
            clearTimeout(summarizingTimeoutRef.current);
            summarizingTimeoutRef.current = null;
        }

        const controller = new AbortController();
        abortRef.current = controller;

        await streamMessage(
            {
                message: trimmed,
                conversation_id: activeConversationId ?? null,
            },
            /* onChunk */
            (content) => {
                // First token after a tool: show "Summarizing…" then clear after a short delay
                if (
                    content &&
                    toolsUsedInStreamRef.current.length > 0 &&
                    !hasShownSummarizingRef.current
                ) {
                    hasShownSummarizingRef.current = true;
                    setToolStatus("Summarizing…");
                    if (summarizingTimeoutRef.current) clearTimeout(summarizingTimeoutRef.current);
                    summarizingTimeoutRef.current = setTimeout(() => {
                        setToolStatus(null);
                        summarizingTimeoutRef.current = null;
                    }, 1400);
                }
                setStreamingContent((prev) => prev + content);
            },
            /* onDone */
            (event) => {
                if (summarizingTimeoutRef.current) {
                    clearTimeout(summarizingTimeoutRef.current);
                    summarizingTimeoutRef.current = null;
                }
                setToolStatus(null);

                // If new conversation, update URL
                if (!activeConversationId) {
                    navigate(`/chat/${event.conversation_id}`, { replace: true });
                }

                const fromBackend = (event.message as Message & { metadata?: { tools_used?: string[] } }).metadata?.tools_used;
                const toolsUsed = fromBackend?.length
                    ? fromBackend
                    : toolsUsedInStreamRef.current.length
                        ? [...toolsUsedInStreamRef.current]
                        : undefined;
                const assistantMessage: Message = {
                    ...event.message,
                    ...(toolsUsed && toolsUsed.length > 0 && { toolsUsed }),
                };

                setMessages((prev) => {
                    const updated = prev.map((m) =>
                        m.id === optimisticUserMsg.id
                            ? { ...m, id: m.id, conversation_id: event.conversation_id }
                            : m
                    );
                    return [...updated, assistantMessage];
                });

                setStreamingContent("");
                setIsStreaming(false);

                refreshConversations();
            },
            /* onError */
            (detail) => {
                if (summarizingTimeoutRef.current) {
                    clearTimeout(summarizingTimeoutRef.current);
                    summarizingTimeoutRef.current = null;
                }
                setError(detail);
                setIsStreaming(false);
                setStreamingContent("");
                setToolStatus(null);
            },
            /* onToolStart */
            (tool) => {
                toolsUsedInStreamRef.current.push(tool);
                let status = `Using ${tool}...`;
                const lower = tool.toLowerCase();
                if (lower.includes("tavily") || lower.includes("search")) {
                    status = "Searching web…";
                } else if (lower.includes("trend")) {
                    status = "Checking trends…";
                }
                setToolStatus(status);
            },
            controller.signal,
        );
    }, [activeConversationId, navigate, refreshConversations]);

    /* ── Memoised context value ────────────────────────────── */

    const value = useMemo<ChatContextValue>(() => ({
        conversations,
        conversationsLoading,
        activeConversationId,
        messages,
        messagesLoading,
        isStreaming,
        streamingContent,
        toolStatus,
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
        toolStatus,
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
