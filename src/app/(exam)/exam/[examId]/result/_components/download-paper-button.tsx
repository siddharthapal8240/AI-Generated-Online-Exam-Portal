"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface QuestionData {
  sequenceNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  selectedOption: string | null;
  isCorrect: boolean | null;
  explanation: string;
  difficulty: string;
  source: string;
  pyqSource: string | null;
  timeSec: number;
}

interface PaperData {
  examTitle: string;
  userName: string;
  duration: number;
  totalMarks: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalSkipped: number;
  questions: QuestionData[];
}

export function DownloadPaperButton({ examId }: { examId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/${examId}/download-paper?format=json`);
      const data: PaperData = await res.json();

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageW = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 20;

      const checkPage = (needed: number) => {
        if (y + needed > doc.internal.pageSize.getHeight() - 15) {
          doc.addPage();
          y = 15;
        }
      };

      // ─── Header ─────────────────────────────────────────────────
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(data.examTitle, margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(
        `Participant: ${data.userName}  |  Duration: ${data.duration} min  |  Total Marks: ${data.totalMarks}`,
        margin,
        y,
      );
      y += 6;
      doc.text(
        `Correct: ${data.totalCorrect}  |  Wrong: ${data.totalIncorrect}  |  Skipped: ${data.totalSkipped}  |  Total: ${data.questions.length}`,
        margin,
        y,
      );
      y += 4;

      // Divider
      doc.setDrawColor(200);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      // ─── Questions ──────────────────────────────────────────────
      for (const q of data.questions) {
        checkPage(60);

        // Question header
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        let headerText = `Q${q.sequenceNumber}  [${q.difficulty}]`;
        if (q.source === "PYQ" && q.pyqSource) {
          headerText += `  PYQ: ${q.pyqSource}`;
        }
        const status = q.selectedOption
          ? q.isCorrect
            ? "Correct"
            : "Wrong"
          : "Skipped";
        doc.text(headerText, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(
          q.isCorrect ? 34 : q.selectedOption ? 200 : 120,
          q.isCorrect ? 139 : q.selectedOption ? 50 : 120,
          q.isCorrect ? 34 : q.selectedOption ? 50 : 120,
        );
        doc.text(status, pageW - margin - doc.getTextWidth(status), y);
        y += 5;

        // Question text
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const qLines = doc.splitTextToSize(q.questionText, contentW);
        checkPage(qLines.length * 4 + 25);
        doc.text(qLines, margin, y);
        y += qLines.length * 4 + 3;

        // Options
        const opts = [
          { label: "A", text: q.optionA },
          { label: "B", text: q.optionB },
          { label: "C", text: q.optionC },
          { label: "D", text: q.optionD },
        ];

        for (const opt of opts) {
          checkPage(8);
          const isCorrectOpt = opt.label === q.correctOption;
          const isUserChoice = opt.label === q.selectedOption;

          if (isCorrectOpt) {
            doc.setFillColor(220, 252, 231);
            doc.roundedRect(margin, y - 3, contentW, 6, 1, 1, "F");
            doc.setTextColor(22, 163, 74);
          } else if (isUserChoice) {
            doc.setFillColor(254, 226, 226);
            doc.roundedRect(margin, y - 3, contentW, 6, 1, 1, "F");
            doc.setTextColor(220, 38, 38);
          } else {
            doc.setTextColor(60);
          }

          doc.setFontSize(9);
          doc.setFont("helvetica", isCorrectOpt ? "bold" : "normal");
          const optText = `${opt.label}. ${opt.text}`;
          const optLines = doc.splitTextToSize(optText, contentW - 4);
          doc.text(optLines, margin + 2, y);
          y += optLines.length * 4 + 2;
        }

        // Your answer vs correct
        doc.setTextColor(100);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Your answer: ${q.selectedOption || "—"}  |  Correct: ${q.correctOption}  |  Time: ${Math.round(q.timeSec)}s`,
          margin,
          y,
        );
        y += 5;

        // Solution
        if (q.explanation) {
          checkPage(15);
          doc.setFillColor(254, 252, 232);
          const solLines = doc.splitTextToSize(q.explanation, contentW - 8);
          const solHeight = solLines.length * 3.5 + 8;
          checkPage(solHeight);
          doc.roundedRect(margin, y - 2, contentW, solHeight, 1, 1, "F");
          doc.setTextColor(146, 64, 14);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text("Solution:", margin + 3, y + 2);
          doc.setFont("helvetica", "normal");
          doc.text(solLines, margin + 3, y + 6);
          y += solHeight + 4;
        }

        // Separator
        y += 3;
        doc.setDrawColor(230);
        doc.line(margin, y, pageW - margin, y);
        y += 6;
      }

      // Footer
      checkPage(10);
      doc.setTextColor(180);
      doc.setFontSize(8);
      doc.text("Generated by AI Exam Portal", pageW / 2, y, {
        align: "center",
      });

      // Save
      const fileName = `${data.examTitle.replace(/[^a-zA-Z0-9]/g, "_")}_paper.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to download paper. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {loading ? "Generating PDF..." : "Download PDF"}
    </button>
  );
}
