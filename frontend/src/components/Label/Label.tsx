import type { LabelProps } from "@/types";

export default function Label({
    required = false,
    children,
    className = "",
    ...rest
}: LabelProps) {
    return (
        <label
            className={`inline-flex items-center gap-1 text-sm font-medium text-text-secondary leading-normal cursor-pointer ${className}`}
            {...rest}
        >
            {children}
            {required && (
                <span className="text-danger font-bold" aria-hidden="true">
                    *
                </span>
            )}
        </label>
    );
}
