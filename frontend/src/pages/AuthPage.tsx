import { useState } from "react"
import { Card } from "@/components/ui/card"
import { SignInForm } from "@/components/auth/SignInForm"
import { SignUpForm } from "@/components/auth/SignUpForm"

export default function AuthPage() {
    // "signin" or "signup"
    const [view, setView] = useState<"signin" | "signup">("signin")

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
