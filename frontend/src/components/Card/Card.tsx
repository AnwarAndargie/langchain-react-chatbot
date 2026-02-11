import type { CardProps } from "@/types";

const paddingClasses: Record<string, string> = {
    none: "",
    sm: "p-3",
    md: "p-6",
    lg: "p-8",
};

export default function Card({
    children,
    className = "",
    padding = "md",
}: CardProps) {
    return (
        <div
            className={`bg-surface border border-border-subtle rounded-2xl shadow-sm transition-shadow duration-200 ease-in-out ${paddingClasses[padding]} ${className}`}
        >
            {children}
        </div>
    );
}
