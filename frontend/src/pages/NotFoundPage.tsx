import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/50">
            <Card className="w-[420px]">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                        <FileQuestion className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h2 className="mt-6 text-xl font-semibold">Page Not Found</h2>
                    <p className="mt-2 text-center text-sm text-muted-foreground leading-6">
                        The page you are looking for doesn't exist or has been moved.
                    </p>
                    <div className="mt-6 flex gap-2">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            Go Back
                        </Button>
                        <Button onClick={() => navigate("/")}>Go Home</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
