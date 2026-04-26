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

/**
 * Clean text for PDF — remove problematic characters that jsPDF can't render.
 * Replaces math symbols with readable ASCII alternatives.
 */
function cleanText(text: string): string {
  return text
    // Common math symbols to readable text
    .replace(/\u221A/g, "sqrt") // √
    .replace(/\u221B/g, "cbrt") // ∛
    .replace(/\u00B2/g, "^2") // ²
    .replace(/\u00B3/g, "^3") // ³
    .replace(/\u00B9/g, "^1") // ¹
    .replace(/\u2074/g, "^4") // ⁴
    .replace(/\u2075/g, "^5") // ⁵
    .replace(/\u00D7/g, "x") // ×
    .replace(/\u00F7/g, "/") // ÷
    .replace(/\u2260/g, "!=") // ≠
    .replace(/\u2264/g, "<=") // ≤
    .replace(/\u2265/g, ">=") // ≥
    .replace(/\u2192/g, "->") // →
    .replace(/\u2190/g, "<-") // ←
    .replace(/\u221E/g, "infinity") // ∞
    .replace(/\u03C0/g, "pi") // π
    .replace(/\u00B0/g, " deg") // °
    .replace(/\u20B9/g, "Rs.") // ₹
    // Remove any remaining non-ASCII that jsPDF can't handle
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    // Clean up multiple spaces
    .replace(/  +/g, " ")
    .trim();
}

export function DownloadPaperButton({ examId }: { examId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/${examId}/download-paper`);
      const data: PaperData = await res.json();

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF("portrait", "mm", "a4");

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentW = pageW - margin * 2;
      let y = 18;

      const checkPage = (needed: number) => {
        if (y + needed > pageH - 12) {
          doc.addPage();
          y = 14;
        }
      };

      // ─── Title ──────────────────────────────────────────────────
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30);
      doc.text(cleanText(data.examTitle), margin, y);
      y += 7;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(
        `${data.userName}  |  ${data.duration} min  |  ${data.totalMarks} marks`,
        margin,
        y,
      );
      y += 5;

      // Score bar
      doc.setFontSize(9);
      doc.setTextColor(22, 163, 74);
      doc.text(`Correct: ${data.totalCorrect}`, margin, y);
      doc.setTextColor(220, 38, 38);
      doc.text(`Wrong: ${data.totalIncorrect}`, margin + 35, y);
      doc.setTextColor(100);
      doc.text(`Skipped: ${data.totalSkipped}`, margin + 65, y);
      doc.text(`Total: ${data.questions.length}`, margin + 100, y);
      y += 3;

      doc.setDrawColor(200);
      doc.line(margin, y, pageW - margin, y);
      y += 7;

      // ─── Questions ──────────────────────────────────────────────
      for (const q of data.questions) {
        checkPage(50);

        // Q number + status
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);

        let header = `Q${q.sequenceNumber}.`;
        if (q.source === "PYQ" && q.pyqSource) {
          header += `  [PYQ: ${cleanText(q.pyqSource)}]`;
        }
        doc.text(header, margin, y);

        // Status on right
        const status = q.selectedOption
          ? q.isCorrect
            ? "Correct"
            : "Wrong"
          : "Skipped";
        doc.setFont("helvetica", "bold");
        if (q.isCorrect) doc.setTextColor(22, 163, 74);
        else if (q.selectedOption) doc.setTextColor(220, 38, 38);
        else doc.setTextColor(150);
        const statusW = doc.getTextWidth(status);
        doc.text(status, pageW - margin - statusW, y);
        y += 5;

        // Question text
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40);
        doc.setFontSize(9.5);
        const qText = cleanText(q.questionText);
        const qLines = doc.splitTextToSize(qText, contentW);
        checkPage(qLines.length * 4 + 30);
        doc.text(qLines, margin, y);
        y += qLines.length * 4 + 2;

        // Options
        const opts = [
          { label: "A", text: q.optionA },
          { label: "B", text: q.optionB },
          { label: "C", text: q.optionC },
          { label: "D", text: q.optionD },
        ];

        doc.setFontSize(9);
        for (const opt of opts) {
          const isRight = opt.label === q.correctOption;
          const isUserWrong = opt.label === q.selectedOption && !q.isCorrect;

          checkPage(7);

          // Background highlight
          if (isRight) {
            doc.setFillColor(220, 252, 231);
            doc.roundedRect(margin, y - 3.5, contentW, 6, 1, 1, "F");
          } else if (isUserWrong) {
            doc.setFillColor(254, 226, 226);
            doc.roundedRect(margin, y - 3.5, contentW, 6, 1, 1, "F");
          }

          doc.setFont("helvetica", isRight ? "bold" : "normal");
          doc.setTextColor(isRight ? 22 : isUserWrong ? 180 : 60, isRight ? 130 : isUserWrong ? 40 : 60, isRight ? 22 : isUserWrong ? 40 : 60);

          const optText = cleanText(`${opt.label}. ${opt.text}`);
          const optLines = doc.splitTextToSize(optText, contentW - 6);
          doc.text(optLines, margin + 3, y);
          y += optLines.length * 3.8 + 1.5;
        }

        // Answer line
        y += 1;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120);
        doc.text(
          `Your answer: ${q.selectedOption || "--"}    Correct: ${q.correctOption}    Time: ${Math.round(q.timeSec)}s`,
          margin,
          y,
        );
        y += 4;

        // Solution
        if (q.explanation && q.explanation.trim()) {
          const solText = cleanText(q.explanation);
          const solLines = doc.splitTextToSize(solText, contentW - 8);
          const solH = solLines.length * 3.3 + 7;
          checkPage(solH + 2);

          doc.setFillColor(254, 252, 232);
          doc.roundedRect(margin, y - 1, contentW, solH, 1, 1, "F");

          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(146, 64, 14);
          doc.text("Solution:", margin + 3, y + 3);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 50, 10);
          doc.text(solLines, margin + 3, y + 7);
          y += solH + 3;
        }

        // Divider between questions
        y += 2;
        doc.setDrawColor(230);
        doc.line(margin, y, pageW - margin, y);
        y += 5;
      }

      // Footer
      checkPage(8);
      doc.setTextColor(180);
      doc.setFontSize(7);
      doc.text("Generated by AI Exam Portal", pageW / 2, y, { align: "center" });

      // Download
      const fileName = `${data.examTitle.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}_paper.pdf`;
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
