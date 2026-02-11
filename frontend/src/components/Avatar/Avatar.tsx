import { useState } from "react";
import type { AvatarProps } from "@/types";

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function getColorFromName(name: string): string {
    const colors = [
        "#4263eb", "#3b82f6", "#0ea5e9", "#14b8a6",
        "#22c55e", "#eab308", "#f97316", "#ef4444",
        "#ec4899", "#8b5cf6", "#6366f1", "#06b6d4",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({
    src,
    alt,
    name,
    size = 36,
    className = "",
}: AvatarProps) {
    const [imgError, setImgError] = useState(false);

    const showImage = src && !imgError;
    const initials = name ? getInitials(name) : "?";
    const bgColor = name ? getColorFromName(name) : "var(--color-bg-emphasis)";
    const fontSize = Math.max(size * 0.38, 10);

    return (
        <span
            className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden font-semibold text-white select-none leading-none ${className}`}
            style={{
                width: size,
                height: size,
                backgroundColor: showImage ? "transparent" : bgColor,
                fontSize,
            }}
            role="img"
            aria-label={alt || name || "Avatar"}
        >
            {showImage ? (
                <img
                    className="w-full h-full object-cover"
                    src={src}
                    alt={alt || name || "Avatar"}
                    onError={() => setImgError(true)}
                />
            ) : (
                <span className="flex items-center justify-center w-full h-full tracking-wider">
                    {initials}
                </span>
            )}
        </span>
    );
}
