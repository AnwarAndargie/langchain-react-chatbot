import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "@/App";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import AuthPage from "@/pages/AuthPage";
import ChatPage from "@/pages/ChatPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { useAuth } from "@/state/AuthContext";

/** Redirects / to /chat when authenticated, otherwise to /auth. */
function IndexRedirect() {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }
    return <Navigate to={isAuthenticated ? "/chat" : "/auth"} replace />;
}

/**
 * Application router.
 * /chat is protected; unauthenticated users are redirected to /auth.
 */
const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        errorElement: <NotFoundPage />,
        children: [
            {
                index: true,
                element: <IndexRedirect />,
            },
            {
                path: "auth",
                element: <AuthPage />,
            },
            {
                path: "chat",
                element: (
                    <ProtectedRoute>
                        <ChatPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "*",
                element: <NotFoundPage />,
            },
        ],
    },
]);

export default router;
