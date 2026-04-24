export default function TakeExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Override the parent (exam) layout — no navbar during exam
  // The take page renders its own full-screen ExamHeader
  return <div className="fixed inset-0 z-50 bg-background">{children}</div>;
}
