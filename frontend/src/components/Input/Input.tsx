import { forwardRef } from "react";
import type { InputProps } from "@/types";

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ error = false, className = "", ...rest }, ref) => {
        return (
            <input
                ref={ref}
                className={`
          block w-full h-10 px-3 text-sm
          text-text bg-input-bg
          border rounded-lg
          transition-[border-color,box-shadow] duration-200 ease-in-out
          placeholder:text-text-placeholder
          hover:border-text-muted
          focus:outline-none focus:border-input-focus focus:shadow-[0_0_0_3px_var(--color-primary-subtle)]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-muted
          ${error
                        ? "border-danger focus:border-danger focus:shadow-[0_0_0_3px_var(--color-danger-subtle)]"
                        : "border-input-border"
                    }
          ${className}
        `}
                {...rest}
            />
        );
    }
);

Input.displayName = "Input";
export default Input;
