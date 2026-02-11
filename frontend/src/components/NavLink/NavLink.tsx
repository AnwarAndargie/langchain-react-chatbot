import { NavLink as RouterNavLink } from "react-router-dom";
import type { NavLinkProps } from "@/types";

export default function NavLink({
    to,
    children,
    icon,
    className = "",
}: NavLinkProps) {
    return (
        <RouterNavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ease-in-out cursor-pointer
        ${isActive
                    ? "bg-primary-subtle text-primary"
                    : "text-text-secondary hover:bg-bg-muted hover:text-text"
                } ${className}`
            }
        >
            {icon && <span className="inline-flex items-center shrink-0">{icon}</span>}
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{children}</span>
        </RouterNavLink>
    );
}
