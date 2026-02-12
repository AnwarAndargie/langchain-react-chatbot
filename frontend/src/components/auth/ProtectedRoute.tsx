import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/state/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Renders children when the user is authenticated; otherwise redirects to /auth.
 * Shows nothing (or a loader) while auth state is initializing.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return <>{children}</>
}
