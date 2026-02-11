import { createBrowserRouter } from "react-router-dom";
import App from "@/App";

/**
 * Application router.
 * Placeholder routes — pages will be wired in Task 3.
 */
const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [],
    },
]);

export default router;
