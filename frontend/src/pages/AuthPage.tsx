import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { SignInForm } from "@/components/auth/SignInForm"
import { SignUpForm } from "@/components/auth/SignUpForm"
import { useAuth } from "@/state/AuthContext"

export default function AuthPage() {
    const { isAuthenticated, isLoading } = useAuth()
    const navigate = useNavigate()
    const [view, setView] = useState<"signin" | "signup">("signin")

    // Redirect when auth state becomes true (after login/register or when already logged in)
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate("/chat", { replace: true })
        }
    }, [isLoading, isAuthenticated, navigate])

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        )
    }
    if (isAuthenticated) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="container relative min-h-screen flex flex-col items-center justify-center lg:max-w-none lg:px-0">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">

                <Card className="border-0 shadow-none">
                    {view === "signin" ? <SignInForm /> : <SignUpForm />}
                </Card>

                <div className="text-center text-sm text-muted-foreground">
                    {view === "signin" ? (
                        <p>
                            Don&apos;t have an account?{" "}
                            <button
                                onClick={() => setView("signup")}
                                className="underline underline-offset-4 hover:text-primary font-medium"
                            >
                                Sign up
                            </button>
                        </p>
                    ) : (
                        <p>
                            Already have an account?{" "}
                            <button
                                onClick={() => setView("signin")}
                                className="underline underline-offset-4 hover:text-primary font-medium"
                            >
                                Sign in
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
