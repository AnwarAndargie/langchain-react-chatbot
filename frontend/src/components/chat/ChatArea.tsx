import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    ArrowUp,
    ChevronDown,
    FileText,
    Mic,
    Newspaper,
    Paperclip,
    Scale,
    Search,
    TrendingUp,
} from "lucide-react"

/** Suggested actions aligned with project tools: news, trends, web search. */
const SUGGESTED_PROMPTS = [
    { id: "news", label: "News", icon: Newspaper },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "search", label: "Web search", icon: Search },
    { id: "summarize", label: "Summarize", icon: FileText },
    { id: "compare", label: "Compare", icon: Scale },
] as const

export function ChatArea() {
    return (
        <div className="relative flex h-full flex-col bg-background">
            {/* Top banner - project idea: news, trends, search */}
            <div className="shrink-0 flex justify-center py-3 px-4">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    News, trends & web search — powered by LangChain
                </span>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
                <div className="flex w-full max-w-2xl flex-col items-center space-y-8">
                    {/* Project title */}
                    <h1 className="text-4xl font-semibold tracking-tighter text-center sm:text-5xl md:text-6xl text-foreground">
                        Search, trends & more
                    </h1>

                    {/* Input area */}
                    <div className="relative w-full rounded-xl border border-input bg-muted/30 shadow-sm focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                        <Textarea
                            placeholder="Search the web, check trends, or ask anything."
                            className="min-h-[56px] w-full resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3.5 text-base placeholder:text-muted-foreground"
                        />
                        <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-0">
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                                    aria-label="Attach file"
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-1 rounded-md px-2 text-muted-foreground hover:text-foreground text-xs font-medium"
                                >
                                    Model
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                                    aria-label="Voice input"
                                >
                                    <Mic className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    className="h-8 w-8 rounded-full shrink-0"
                                    aria-label="Send"
                                >
                                    <ArrowUp className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Suggested prompts - project idea: news, trends, search */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {SUGGESTED_PROMPTS.map(({ id, label, icon: Icon }) => (
                            <Button
                                key={id}
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-lg border-border bg-background/80 px-3 gap-2 hover:bg-muted/50"
                            >
                                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                {label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom-right utility icons */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2 text-muted-foreground">
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Settings">
                    <span className="text-xs font-medium">A</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Help">
                    ?
                </Button>
            </div>
        </div>
    )
}
