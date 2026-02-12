import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
    Clock,
    Layers,
    LayoutGrid,
    MoreHorizontal,
    MessageSquare,
    Plus,
} from "lucide-react"

/** Dummy chat history for sidebar. Replace with API/state later. */
const DUMMY_CHAT_HISTORY: { id: string; title: string }[] = [
    { id: "1", title: "Previous Chat 1" },
    { id: "2", title: "Research on AI Agents" },
    { id: "3", title: "React patterns" },
    { id: "4", title: "LangChain tool usage" },
    { id: "5", title: "FastAPI + React setup" },
    { id: "6", title: "Summarize long documents" },
    { id: "7", title: "Compare Next.js vs Remix" },
]

interface ChatSidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function ChatSidebar({ className }: ChatSidebarProps) {
    return (
        <div
            className={cn(
                "flex h-full min-h-0 w-full flex-col",
                className
            )}
        >
            {/* Top: logo + new chat */}
            <div className="shrink-0 px-3 pt-4 pb-2">
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <MessageSquare className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold truncate">Chat</span>
                </div>
                <Button
                    variant="default"
                    className="w-full h-10 rounded-lg gap-2 font-medium shadow-sm hover:shadow-md transition-shadow bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    aria-label="New chat"
                >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>New chat</span>
                </Button>
            </div>

            {/* Nav: History, Discover, Spaces, More */}
            <nav className="shrink-0 flex flex-col gap-0.5 px-2 py-2">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 rounded-md h-9 px-3 font-normal text-foreground"
                >
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">History</span>
                </Button>
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 rounded-md h-9 px-3 font-normal text-foreground"
                >
                    <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">Discover</span>
                </Button>
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 rounded-md h-9 px-3 font-normal text-foreground"
                >
                    <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">Spaces</span>
                </Button>
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 rounded-md h-9 px-3 font-normal text-foreground"
                >
                    <MoreHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">More</span>
                </Button>
            </nav>

            {/* Scrollable chat history */}
            <div className="flex-1 min-h-0 flex flex-col py-2">
                <ScrollArea className="flex-1 px-2">
                    <div className="space-y-0.5 py-1">
                        {DUMMY_CHAT_HISTORY.map((chat) => (
                            <Button
                                key={chat.id}
                                variant="ghost"
                                className="w-full justify-start gap-3 rounded-md h-8 px-3 font-normal text-muted-foreground hover:text-foreground"
                            >
                                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate text-sm">{chat.title}</span>
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Bottom: upload, notifications, profile */}
            <div className="shrink-0 flex flex-col items-start gap-1 py-3 px-2 border-t border-border">
                <button
                    type="button"
                    className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium shrink-0 hover:opacity-90 transition-opacity"
                    aria-label="Profile"
                >
                    A
                </button>
            </div>
        </div>
    )
} 
