import { useRef, type KeyboardEvent } from "react";
import { Button, Icon } from "@/components";
import type { ChatInputProps } from "@/types";

export default function ChatInput({
    value,
    onChange,
    onSend,
    placeholder = "Type a message…",
    disabled = false,
    loading = false,
}: ChatInputProps) {
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const canSend = value.trim().length > 0 && !disabled && !loading;

    const handleSend = () => {
        if (!canSend) return;
        onSend();
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = () => {
        const el = inputRef.current;
        if (el) {
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
        }
    };

    return (
        <div className="px-4 py-3 bg-bg border-t border-border-subtle">
            <div className="flex items-end gap-2 bg-input-bg border border-input-border rounded-2xl pl-4 pr-2 py-2 transition-[border-color,box-shadow] duration-200 ease-in-out focus-within:border-input-focus focus-within:shadow-[0_0_0_3px_var(--color-primary-subtle)]">
                <textarea
                    ref={inputRef}
                    className="flex-1 border-none bg-transparent text-text text-sm leading-normal resize-none outline-none py-1 min-h-6 max-h-[140px] font-(--font-sans) placeholder:text-text-placeholder disabled:opacity-50 disabled:cursor-not-allowed"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onInput={handleInput}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                    aria-label="Message input"
                />
                <Button
                    variant="primary"
                    size="sm"
                    className="rounded-lg! w-9! h-9! p-0! shrink-0"
                    onClick={handleSend}
                    disabled={!canSend}
                    loading={loading}
                    aria-label="Send message"
                >
                    <Icon name="send" size={16} />
                </Button>
            </div>
        </div>
    );
}
