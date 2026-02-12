import { Outlet } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Root application shell.
 * Layouts (Auth, App shell) will wrap pages via nested routes in Task 2.
 */
export default function App() {
    return (
        <TooltipProvider>
            <Outlet />
        </TooltipProvider>
    );
}
