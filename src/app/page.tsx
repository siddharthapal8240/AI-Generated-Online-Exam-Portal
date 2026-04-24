import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <GraduationCap className="h-16 w-16 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight">AI Exam Portal</h1>
        <p className="max-w-md text-lg text-muted-foreground">
          AI-powered mock exam platform for government exam preparation — IBPS, SSC CGL, SBI PO &
          more.
        </p>
      </div>
      <div className="flex gap-4">
        <Button size="lg" render={<Link href="/login" />}>
          Sign In
        </Button>
        <Button variant="outline" size="lg" render={<Link href="/register" />}>
          Register
        </Button>
      </div>
    </div>
  );
}
