import { ExamNavbar } from "./_components/exam-navbar";

export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <ExamNavbar />
      <main className="flex-1 bg-muted/30">{children}</main>
    </div>
  );
}
