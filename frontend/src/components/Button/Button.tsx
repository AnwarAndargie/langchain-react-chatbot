import { forwardRef } from "react";
import type { ButtonProps } from "@/types";

const variantClasses: Record<string, string> = {
    primary:
        "bg-primary text-primary-text border-primary hover:bg-primary-hover hover:border-primary-hover hover:shadow-sm active:bg-primary-active active:translate-y-px",
    secondary:
        "bg-bg text-text border-border hover:bg-bg-muted hover:border-text-muted active:bg-bg-emphasis active:translate-y-px",
    ghost:
        "bg-transparent text-text-secondary border-transparent hover:bg-bg-muted hover:text-text active:bg-bg-emphasis",
    danger:
        "bg-danger text-white border-danger hover:opacity-90 hover:shadow-sm active:opacity-85 active:translate-y-px",
};

const sizeClasses: Record<string, string> = {
    sm: "h-8 px-3 text-sm rounded-md",
    md: "h-10 px-4 text-sm rounded-lg",
    lg: "h-12 px-6 text-base rounded-lg",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = "primary",
            size = "md",
            loading = false,
            fullWidth = false,
            disabled,
            children,
            className = "",
            ...rest
        },
        ref
    ) => {
        return (
            <button
                ref={ref}
                className={`
          relative inline-flex items-center justify-center gap-2
          font-medium whitespace-nowrap select-none
          border transition-all duration-200 ease-in-out cursor-pointer leading-none
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? "w-full" : ""}
          ${loading ? "cursor-wait" : ""}
          ${className}
        `}
                disabled={disabled || loading}
                {...rest}
            >
                {loading && (
                    <span
                        className="absolute w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin-fast"
                        aria-hidden="true"
                    />
                )}
                <span className={loading ? "invisible" : ""}>{children}</span>
            </button>
        );
    }
);

Button.displayName = "Button";
export default Button;
