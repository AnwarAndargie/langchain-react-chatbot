import { Label } from "@/components";
import type { FormFieldProps } from "@/types";

export default function FormField({
    label,
    htmlFor,
    error,
    required = false,
    children,
}: FormFieldProps) {
    return (
        <div className="flex flex-col gap-1">
            <Label htmlFor={htmlFor} required={required}>
                {label}
            </Label>
            {children}
            {error && (
                <p className="text-xs text-danger mt-0.5 animate-field-error" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
