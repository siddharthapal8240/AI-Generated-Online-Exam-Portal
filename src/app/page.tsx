import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Brain,
  Clock,
  BarChart3,
  Shield,
  Sparkles,
  BookOpen,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">AI Exam Portal</span>
          </Link>
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Button size="sm" render={<Link href="/dashboard" />}>
                Go to Dashboard
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href="/login" />}
                >
                  Sign In
                </Button>
                <Button size="sm" render={<Link href="/register" />}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-Powered Question Generation
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Crack Your{" "}
              <span className="text-primary">Government Exam</span> with AI
              Mock Tests
            </h1>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Practice with dynamically generated questions for IBPS SO IT
              Officer, SSC CGL, SSC CHSL & IBPS PO. Real PYQs from 2015-2025
              mixed with AI-generated exam-level questions.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {isSignedIn ? (
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  render={<Link href="/dashboard" />}
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto"
                    render={<Link href="/register" />}
                  >
                    Start Practicing Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                    render={<Link href="/login" />}
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Target Exams */}
      <section className="border-y bg-muted/30 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Targeted for these exams
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {[
              "IBPS SO IT Officer",
              "SSC CGL",
              "SSC CHSL",
              "IBPS PO",
              "IBPS Clerk",
              "SBI PO",
            ].map((exam) => (
              <span
                key={exam}
                className="rounded-full border bg-background px-4 py-2 text-sm font-medium"
              >
                {exam}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need to prepare
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built specifically for central government exam aspirants
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Brain,
                title: "AI-Generated Questions",
                desc: "Unique questions generated by Claude AI matching exact exam patterns. Different paper for every participant.",
              },
              {
                icon: BookOpen,
                title: "Real PYQs (2015-2025)",
                desc: "Previous year questions from SSC CGL, CHSL, IBPS SO IT, IBPS PO — directly from actual papers.",
              },
              {
                icon: Clock,
                title: "Timed Mock Tests",
                desc: "Server-authoritative timer, auto-submit, per-question time tracking — just like the real exam.",
              },
              {
                icon: BarChart3,
                title: "Detailed Analytics",
                desc: "Score trends, topic-wise breakdown, time analysis — know your strengths and weaknesses.",
              },
              {
                icon: Shield,
                title: "Anti-Cheating",
                desc: "Tab switch detection, copy prevention, fullscreen mode — maintain exam integrity.",
              },
              {
                icon: Users,
                title: "Wrong Questions Bank",
                desc: "All your mistakes auto-saved. Filter by topic, review solutions, practice until perfect.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/20 sm:p-6"
              >
                <feature.icon className="mb-3 h-8 w-8 text-primary sm:h-10 sm:w-10" />
                <h3 className="mb-1.5 text-base font-semibold sm:text-lg">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              How it works
            </h2>
          </div>

          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3 sm:gap-8">
            {[
              {
                step: "1",
                title: "Admin Creates Exam",
                desc: "Select topics, set difficulty, choose question mode — pre-generated, pool-based, or dynamic per-user.",
              },
              {
                step: "2",
                title: "AI Generates Questions",
                desc: "Claude AI fetches real PYQs and generates exam-level questions. Each user can get a unique paper.",
              },
              {
                step: "3",
                title: "Take & Review",
                desc: "Timed exam with navigation palette, instant results, detailed solutions, and PDF download.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Topics covered */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Topics Covered
            </h2>
            <p className="mt-3 text-muted-foreground">
              Complete syllabus for all target exams
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                subject: "Quantitative Aptitude",
                topics: [
                  "Percentage",
                  "Profit & Loss",
                  "SI/CI",
                  "Time & Work",
                  "Ratio",
                  "DI",
                  "Number Series",
                  "Simplification & Approximation",
                ],
              },
              {
                subject: "Reasoning Ability",
                topics: [
                  "Coding-Decoding",
                  "Syllogism",
                  "Blood Relations",
                  "Seating Arrangement",
                  "Puzzle",
                  "Inequality",
                  "Direction Sense",
                  "Input-Output",
                ],
              },
              {
                subject: "English Language",
                topics: [
                  "Reading Comprehension",
                  "Cloze Test",
                  "Error Spotting",
                  "Para Jumbles",
                  "Fill in Blanks",
                  "Vocabulary",
                ],
              },
              {
                subject: "General Awareness",
                topics: [
                  "Current Affairs",
                  "Banking Awareness",
                  "Static GK",
                  "Financial Awareness",
                ],
              },
              {
                subject: "Computer Knowledge",
                topics: [
                  "Fundamentals",
                  "Networking",
                  "DBMS",
                  "MS Office",
                  "Cyber Security",
                ],
              },
            ].map((subj) => (
              <div key={subj.subject} className="rounded-xl border p-4 sm:p-5">
                <h3 className="mb-3 font-semibold">{subj.subject}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {subj.topics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary/5 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to start your preparation?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Free to use. AI-powered. Built for serious aspirants.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {isSignedIn ? (
              <Button
                size="lg"
                className="w-full sm:w-auto"
                render={<Link href="/dashboard" />}
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full sm:w-auto"
                render={<Link href="/register" />}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              AI Exam Portal
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built for IBPS SO IT Officer & SSC CGL aspirants
          </p>
        </div>
      </footer>
    </div>
  );
}
