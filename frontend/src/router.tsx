import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "@/App";
import AuthPage from "@/pages/AuthPage";

/**
 * Application router.
 */
const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                index: true,
                element: <Navigate to="/auth" replace />,
            },
            {
                path: "auth",
                element: <AuthPage />,
            },
        ],
    },
]);

export default router;
