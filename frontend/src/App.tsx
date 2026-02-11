import { Outlet } from "react-router-dom";

/**
 * Root application shell.
 * Layouts (Auth, App shell) will wrap pages via nested routes in Task 2.
 */
export default function App() {
    return <Outlet />;
}
