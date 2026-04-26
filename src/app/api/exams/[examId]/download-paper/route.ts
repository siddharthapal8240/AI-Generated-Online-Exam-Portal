import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { examSessions, users } from "@/server/schema";
import { eq, and } from "drizzle-orm";
import { getExamById } from "@/server/data-access/exams";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUser.id),
    columns: { id: true, name: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const exam = await getExamById(examId);
  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  // Get ONLY this user's session
  const session = await db.query.examSessions.findFirst({
    where: and(
      eq(examSessions.examId, examId),
      eq(examSessions.userId, dbUser.id),
    ),
    with: {
      examQuestions: {
        orderBy: (eqCol, { asc }) => [asc(eqCol.sequenceNumber)],
        with: {
          question: true,
          response: true,
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "No session found" }, { status: 404 });
  }

  // Generate HTML for the question paper
  const questionsHtml = session.examQuestions
    .map((eq) => {
      const q = eq.question;
      const r = eq.response;
      const wasAttempted = !!r?.selectedOption;
      const isCorrect = r?.isCorrect;

      const optionClass = (label: string) => {
        if (label === q.correctOption)
          return 'style="background:#dcfce7;border:1px solid #22c55e;padding:6px 10px;border-radius:6px;margin:4px 0"';
        if (label === r?.selectedOption && !isCorrect)
          return 'style="background:#fee2e2;border:1px solid #ef4444;padding:6px 10px;border-radius:6px;margin:4px 0"';
        return 'style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:6px;margin:4px 0"';
      };

      const statusText = wasAttempted
        ? isCorrect
          ? "Correct"
          : "Wrong"
        : "Skipped";
      const statusColor = wasAttempted
        ? isCorrect
          ? "#16a34a"
          : "#dc2626"
        : "#6b7280";

      const pyqBadge =
        q.source === "PYQ" && q.pyqSource
          ? `<span style="background:#f3e8ff;color:#7c3aed;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">PYQ ${q.pyqSource} ${q.pyqYear || ""}</span>`
          : "";

      return `
        <div style="page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:12px 0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div>
              <strong>Q${eq.sequenceNumber}</strong>
              <span style="color:#6b7280;font-size:12px;margin-left:8px">${q.difficulty}</span>
              ${pyqBadge}
            </div>
            <span style="color:${statusColor};font-weight:600;font-size:13px">${statusText}</span>
          </div>
          <p style="margin:8px 0;line-height:1.6">${q.questionText}</p>
          <div style="margin:8px 0">
            <div ${optionClass("A")}><strong>A.</strong> ${q.optionA}</div>
            <div ${optionClass("B")}><strong>B.</strong> ${q.optionB}</div>
            <div ${optionClass("C")}><strong>C.</strong> ${q.optionC}</div>
            <div ${optionClass("D")}><strong>D.</strong> ${q.optionD}</div>
          </div>
          <div style="margin-top:8px;font-size:12px">
            <span>Your answer: <strong>${r?.selectedOption || "—"}</strong></span>
            <span style="margin-left:16px">Correct: <strong style="color:#16a34a">${q.correctOption}</strong></span>
            ${r?.totalTimeSec ? `<span style="margin-left:16px;color:#6b7280">Time: ${Math.round(r.totalTimeSec)}s</span>` : ""}
          </div>
          ${q.explanation ? `<div style="background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:10px;margin-top:10px;font-size:13px"><strong style="color:#92400e">Solution:</strong><br/>${q.explanation.replace(/\n/g, "<br/>")}</div>` : ""}
        </div>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${exam.title} — Question Paper</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #1f2937; }
        @media print { body { padding: 0; } }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
        .stat { text-align: center; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; }
        .stat-value { font-size: 20px; font-weight: 700; }
        .stat-label { font-size: 11px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${exam.title}</h1>
        <p style="color:#6b7280;margin:4px 0">Participant: ${dbUser.name || clerkUser.firstName || "Unknown"} | Duration: ${exam.durationMinutes} min | Total Marks: ${exam.totalMarks}</p>
        <div class="stats">
          <div class="stat"><div class="stat-value" style="color:#16a34a">${session.totalCorrect || 0}</div><div class="stat-label">Correct</div></div>
          <div class="stat"><div class="stat-value" style="color:#dc2626">${session.totalIncorrect || 0}</div><div class="stat-label">Wrong</div></div>
          <div class="stat"><div class="stat-value" style="color:#6b7280">${session.totalNotVisited || 0}</div><div class="stat-label">Skipped</div></div>
          <div class="stat"><div class="stat-value">${session.examQuestions.length}</div><div class="stat-label">Total</div></div>
        </div>
      </div>
      ${questionsHtml}
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:30px">Generated by AI Exam Portal</p>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${exam.title.replace(/[^a-zA-Z0-9]/g, "_")}_paper.html"`,
    },
  });
}
