import { Avatar } from "@/components";
import type { MessageBubbleProps } from "@/types";

export default function MessageBubble({
    content,
    sender,
    timestamp,
    avatarSrc,
    avatarName,
}: MessageBubbleProps) {
    const isUser = sender === "user";

    return (
        <div
            className={`flex gap-3 max-w-[720px] animate-bubble-in ${isUser ? "flex-row-reverse ml-auto" : "mr-auto"
                }`}
        >
            <div className="shrink-0 pt-0.5">
                <Avatar
                    src={avatarSrc}
                    name={avatarName || (isUser ? "You" : "AI")}
                    size={32}
                />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
                <div
                    className={`px-4 py-3 rounded-2xl leading-relaxed text-sm wrap-break-word ${isUser
                        ? "bg-bubble-user text-bubble-user-text rounded-br-md"
                        : "bg-bubble-ai text-bubble-ai-text rounded-bl-md"
                        }`}
                >
                    <p>{content}</p>
                </div>
                {timestamp && (
                    <span
                        className={`text-xs text-text-muted px-1 ${isUser ? "text-right" : ""
                            }`}
                    >
                        {timestamp}
                    </span>
                )}
            </div>
        </div>
    );
}
