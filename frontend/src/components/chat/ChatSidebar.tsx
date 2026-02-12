import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
    Clock,
    Layers,
    LayoutGrid,
    Loader2,
    LogOut,
    MessageSquare,
    MoreHorizontal,
    Plus,
} from "lucide-react"
import { useAuth } from "@/state/AuthContext"
import { useChat } from "@/state/ChatContext"

interface ChatSidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function ChatSidebar({ className }: ChatSidebarProps) {
    const { user, logout } = useAuth()
    const {
        conversations,
        conversationsLoading,
        activeConversationId,
        startNewChat,
        selectConversation,
    } = useChat()
    const navigate = useNavigate()

    async function handleLogout() {
        await logout()
        navigate("/auth", { replace: true })
    }

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
                    onClick={startNewChat}
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

            {/* Scrollable chat history — real data from API */}
            <div className="flex-1 min-h-0 flex flex-col py-2">
                <ScrollArea className="flex-1 px-2">
                    <div className="space-y-0.5 py-1">
                        {conversationsLoading && conversations.length === 0 && (
                            <div className="flex items-center justify-center py-6 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        )}

                        {!conversationsLoading && conversations.length === 0 && (
                            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                                No conversations yet
                            </p>
                        )}

                        {conversations.map((conv) => (
                            <Button
                                key={conv.id}
                                variant="ghost"
                                onClick={() => selectConversation(conv.id)}
                                className={cn(
                                    "w-full justify-start gap-3 rounded-md h-8 px-3 font-normal text-muted-foreground hover:text-foreground",
                                    activeConversationId === conv.id &&
                                    "bg-muted text-foreground"
                                )}
                            >
                                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate text-sm">
                                    {conv.title ?? "Untitled"}
                                </span>
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Bottom: profile with logout */}
            <div className="shrink-0 flex flex-col items-start gap-1 py-3 px-2 border-t border-border">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium shrink-0 hover:opacity-90 transition-opacity"
                            aria-label="Profile"
                        >
                            {user?.email?.charAt(0).toUpperCase() ?? "A"}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top" className="w-56">
                        {user?.email && (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
                                {user.email}
                            </div>
                        )}
                        <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer">
                            <LogOut className="h-4 w-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
