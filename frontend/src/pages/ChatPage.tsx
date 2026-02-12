import { ChatSidebar } from "@/components/chat/ChatSidebar"
import { ChatArea } from "@/components/chat/ChatArea"
import { ChatProvider } from "@/state/ChatContext"

export default function ChatPage() {
    return (
        <ChatProvider>
            <div className="flex h-screen w-full bg-background overflow-hidden">
                <aside className="hidden md:flex shrink-0 w-[260px] flex-col border-r border-border bg-muted/30">
                    <ChatSidebar className="h-full min-h-0" />
                </aside>
                <main className="flex-1 min-w-0 flex flex-col">
                    <ChatArea />
                </main>
            </div>
        </ChatProvider>
    )
}
