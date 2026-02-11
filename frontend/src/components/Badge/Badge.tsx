import type { BadgeProps } from "@/types";

const variantClasses: Record<string, string> = {
    default: "bg-bg-emphasis text-text-secondary",
    primary: "bg-primary-subtle text-primary",
    success: "bg-success-subtle text-success",
    warning: "bg-warning-subtle text-warning",
    danger: "bg-danger-subtle text-danger",
    info: "bg-info-subtle text-info",
};

export default function Badge({
    variant = "default",
    children,
    className = "",
}: BadgeProps) {
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full leading-normal whitespace-nowrap ${variantClasses[variant]} ${className}`}
        >
            {children}
        </span>
    );
}
