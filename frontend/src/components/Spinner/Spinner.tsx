import type { SpinnerProps } from "@/types";

export default function Spinner({ size = 24, className = "" }: SpinnerProps) {
    return (
        <span
            className={`inline-flex items-center justify-center shrink-0 ${className}`}
            style={{ width: size, height: size }}
            role="status"
            aria-label="Loading"
        >
            <svg
                className="animate-spin-smooth w-full h-full"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle
                    className="stroke-border"
                    cx="12"
                    cy="12"
                    r="10"
                    strokeWidth="3"
                />
                <path
                    className="stroke-primary"
                    d="M12 2a10 10 0 0 1 10 10"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
            </svg>
        </span>
    );
}
