import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
    ArrowUp,
    Bot,
    FileText,
    Loader2,
    Newspaper,
    Scale,
    Search,
    Square,
    TrendingUp,
    User,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import { useChat } from "@/state/ChatContext"
import type { Message } from "@/types/chat"

/* ── Suggested prompts (shown on empty / new chat) ───────── */

const SUGGESTED_PROMPTS = [
    { id: "news", label: "News", icon: Newspaper },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "search", label: "Web search", icon: Search },
    { id: "summarize", label: "Summarize", icon: FileText },
    { id: "compare", label: "Compare", icon: Scale },
] as const

/* ── Single message bubble ───────────────────────────────── */

interface MessageBubbleProps {
    role: Message["role"]
    content: string
    isStreaming?: boolean
}

/* Markdown styling for assistant messages */
const markdownComponents = {
    p: ({ children, ...props }) => <p className="mb-2 last:mb-0 wrap-break-word" {...props}>{children}</p>,
    strong: ({ children, ...props }) => <strong className="font-semibold" {...props}>{children}</strong>,
    ul: ({ children, ...props }) => <ul className="my-2 list-disc pl-5 space-y-0.5 wrap-break-word" {...props}>{children}</ul>,
    ol: ({ children, ...props }) => <ol className="my-2 list-decimal pl-5 space-y-0.5 wrap-break-word" {...props}>{children}</ol>,
    li: ({ children, ...props }) => <li className="leading-relaxed wrap-break-word" {...props}>{children}</li>,
    code: ({ className, children, ...props }) => {
        const isBlock = className?.includes("language-")
        return isBlock ? (
            <code className={cn("block rounded bg-muted-foreground/15 px-3 py-2 text-[0.9em] font-mono whitespace-pre-wrap break-all", className)} {...props}>
                {children}
            </code>
        ) : (
            <code className="rounded bg-muted-foreground/15 px-1.5 py-0.5 text-[0.9em] font-mono break-all" {...props}>
                {children}
            </code>
        )
    },
    pre: ({ children, ...props }) => (
        <pre className="my-2 max-w-full overflow-x-auto rounded bg-muted-foreground/15 px-3 py-2 text-[0.9em] font-mono whitespace-pre" {...props}>
            {children}
        </pre>
    ),
    a: ({ children, ...props }) => (
        <a className="break-all text-primary underline underline-offset-2" {...props}>{children}</a>
    ),
}

function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
    const isUser = role === "user"

    return (
        <div className={cn("flex gap-3 py-4", isUser ? "justify-end" : "justify-start")}>
            {/* Avatar (assistant only) */}
            {!isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                </div>
            )}

            <div
                className={cn(
                    "min-w-0 max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed overflow-hidden",
                    isUser
                        ? "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap wrap-break-word"
                        : "bg-muted text-foreground rounded-bl-md wrap-break-word [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:max-w-full"
                )}
            >
                {isUser ? (
                    content
                ) : (
                    <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
                )}
                {isStreaming && (
                    <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-full bg-current align-text-bottom" />
                )}
            </div>

            {/* Avatar (user only) */}
            {isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                </div>
            )}
        </div>
    )
}

/* ── Chat Area (main component) ──────────────────────────── */

export function ChatArea() {
    const {
        activeConversationId,
        messages,
        messagesLoading,
        isStreaming,
        streamingContent,
        toolStatus,
        error,
        sendMessage,
        stopStreaming,
        clearError,
    } = useChat()

    const [input, setInput] = useState("")
    const scrollRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const hasMessages = messages.length > 0 || isStreaming
    const isEmptyChat = !activeConversationId && !hasMessages

    /* ── Auto-scroll to bottom on new content ────────────── */

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, streamingContent, toolStatus])

    /* ── Send handler ────────────────────────────────────── */

    const handleSend = useCallback(async () => {
        const text = input.trim()
        if (!text || isStreaming) return
        setInput("")
        await sendMessage(text)
        textareaRef.current?.focus()
    }, [input, isStreaming, sendMessage])

    /* ── Keyboard: Enter to send, Shift+Enter for newline ── */

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
            }
        },
        [handleSend],
    )

    /* ── Suggested prompt click ──────────────────────────── */

    const handlePrompt = useCallback(
        (label: string) => {
            setInput(label)
            textareaRef.current?.focus()
        },
        [],
    )

    /* ── Render ──────────────────────────────────────────── */

    return (
        <div className="relative flex h-full flex-col bg-background">
            {/* Top banner */}
            <div className="shrink-0 flex justify-center py-3 px-4">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    News, trends &amp; web search — powered by LangChain
                </span>
            </div>

            {/* Error toast */}
            {error && (
                <div className="mx-auto w-full max-w-2xl px-4">
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                        <span>{error}</span>
                        <button
                            onClick={clearError}
                            className="shrink-0 text-xs font-medium underline underline-offset-2"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* ── Empty state (new chat) ─────────────────── */}
            {isEmptyChat && !messagesLoading && (
                <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
                    <div className="flex w-full max-w-2xl flex-col items-center space-y-8">
                        <h1 className="text-4xl font-semibold tracking-tighter text-center sm:text-5xl md:text-6xl text-foreground">
                            Search, trends &amp; more
                        </h1>

                        {/* Input */}
                        {renderInput()}

                        {/* Suggested prompts */}
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {SUGGESTED_PROMPTS.map(({ id, label, icon: Icon }) => (
                                <Button
                                    key={id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePrompt(label)}
                                    className="h-9 rounded-lg border-border bg-background/80 px-3 gap-2 hover:bg-muted/50"
                                >
                                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Messages view ──────────────────────────── */}
            {(hasMessages || messagesLoading) && (
                <>
                    <ScrollArea className="flex-1 min-h-0">
                        <div
                            ref={scrollRef}
                            className="mx-auto w-full max-w-2xl px-4 py-4"
                        >
                            {messagesLoading && messages.length === 0 && (
                                <div className="flex items-center justify-center py-12 text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            )}

                            {messages.map((msg) => (
                                <MessageBubble
                                    key={msg.id}
                                    role={msg.role}
                                    content={msg.content}
                                />
                            ))}

                            {/* Tool status indicator */}
                            {isStreaming && toolStatus && (
                                <div className="flex justify-start gap-4 py-2 opacity-80">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse bg-muted/50 px-3 py-1.5 rounded-full">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>{toolStatus}</span>
                                    </div>
                                </div>
                            )}

                            {/* Streaming assistant bubble */}
                            {isStreaming && streamingContent && (
                                <MessageBubble
                                    role="assistant"
                                    content={streamingContent}
                                    isStreaming
                                />
                            )}
                        </div>
                    </ScrollArea>

                    {/* Input pinned at the bottom */}
                    <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-sm px-4 py-3">
                        <div className="mx-auto w-full max-w-2xl">
                            {renderInput()}
                        </div>
                    </div>
                </>
            )}
        </div>
    )

    /* ── Shared input widget ─────────────────────────────── */

    function renderInput() {
        return (
            <div className="relative w-full rounded-xl border border-input bg-muted/30 shadow-sm focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search the web, check trends, or ask anything."
                    className="min-h-[56px] max-h-[200px] w-full resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3.5 text-base placeholder:text-muted-foreground"
                    disabled={isStreaming}
                />
                <div className="flex items-center justify-end gap-1 px-3 pb-2.5 pt-0">
                    {isStreaming ? (
                        <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8 rounded-full shrink-0"
                            aria-label="Stop generating"
                            onClick={stopStreaming}
                        >
                            <Square className="h-3.5 w-3.5" />
                        </Button>
                    ) : (
                        <Button
                            size="icon"
                            className="h-8 w-8 rounded-full shrink-0"
                            aria-label="Send"
                            disabled={!input.trim()}
                            onClick={handleSend}
                        >
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        )
    }
}
