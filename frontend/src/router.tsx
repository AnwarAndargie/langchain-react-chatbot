import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "@/App";
import AuthPage from "@/pages/AuthPage";
import ChatPage from "@/pages/ChatPage";
import NotFoundPage from "@/pages/NotFoundPage";

/**
 * Application router.
 */
const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        errorElement: <NotFoundPage />,
        children: [
            {
                index: true,
                element: <Navigate to="/auth" replace />,
            },
            {
                path: "auth",
                element: <AuthPage />,
            },
            {
                path: "chat",
                element: <ChatPage />,
            },
            {
                path: "*",
                element: <NotFoundPage />,
            },
        ],
    },
]);

export default router;
