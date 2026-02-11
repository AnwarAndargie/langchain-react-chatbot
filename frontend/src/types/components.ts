/* ── Component Types ─────────────────────────────────────── */

import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes } from "react";

/* ── Atoms ───────────────────────────────────────────────── */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    fullWidth?: boolean;
    children: ReactNode;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
    required?: boolean;
    children: ReactNode;
}

export interface IconProps {
    name: string;
    size?: number;
    className?: string;
    color?: string;
}

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info";

export interface BadgeProps {
    variant?: BadgeVariant;
    children: ReactNode;
    className?: string;
}

export interface SpinnerProps {
    size?: number;
    className?: string;
}

export interface AvatarProps {
    src?: string;
    alt?: string;
    name?: string;
    size?: number;
    className?: string;
}

/* ── Molecules ───────────────────────────────────────────── */

export interface FormFieldProps {
    label: string;
    htmlFor: string;
    error?: string;
    required?: boolean;
    children: ReactNode;
}

export interface CardProps {
    children: ReactNode;
    className?: string;
    padding?: "none" | "sm" | "md" | "lg";
}

export interface NavLinkProps {
    to: string;
    children: ReactNode;
    icon?: ReactNode;
    active?: boolean;
    className?: string;
}

export interface MessageBubbleProps {
    content: string;
    sender: "user" | "ai";
    timestamp?: string;
    avatarSrc?: string;
    avatarName?: string;
}

export interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
}
