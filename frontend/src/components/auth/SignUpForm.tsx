import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyRound, Loader2, Mail, User } from "lucide-react"
import { useAuth } from "@/state/AuthContext"

const formSchema = z.object({
    fullName: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    email: z.string().email({
        message: "Please enter a valid email address.",
    }),
    password: z.string().min(8, {
        message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

export function SignUpForm() {
    const { register: registerUser, error, clearError } = useAuth()
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    })
    const isSubmitting = form.formState.isSubmitting

    async function onSubmit(values: z.infer<typeof formSchema>) {
        clearError()
        try {
            await registerUser({
                email: values.email,
                password: values.password,
                full_name: values.fullName,
            })
            // AuthPage will redirect to /chat when isAuthenticated becomes true (avoids race with ProtectedRoute)
        } catch {
            // Error is set in context and shown below
        }
    }

    return (
        <>
            <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
                <CardDescription>
                    Enter your details below to create your account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input placeholder="John Doe" className="pl-9" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input placeholder="m@example.com" className="pl-9" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input type="password" placeholder="••••••••" className="pl-9" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input type="password" placeholder="••••••••" className="pl-9" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating account…
                                </>
                            ) : (
                                "Sign Up"
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter>
                <p className="px-8 text-center text-sm text-muted-foreground">
                    By clicking continue, you agree to our{" "}
                    <a href="#" className="underline underline-offset-4 hover:text-primary">
                        Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="underline underline-offset-4 hover:text-primary">
                        Privacy Policy
                    </a>
                    .
                </p>
            </CardFooter>
        </>
    )
}
