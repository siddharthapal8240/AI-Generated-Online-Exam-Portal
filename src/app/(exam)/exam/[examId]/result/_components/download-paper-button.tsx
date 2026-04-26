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

async function loadFont(doc: any) {
  try {
    const response = await fetch("/fonts/DejaVuSans.ttf");
    const buffer = await response.arrayBuffer();
    const binary = new Uint8Array(buffer);
    let binaryString = "";
    for (let i = 0; i < binary.length; i++) {
      binaryString += String.fromCharCode(binary[i]);
    }
    const base64 = btoa(binaryString);
    doc.addFileToVFS("DejaVuSans.ttf", base64);
    doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
    doc.addFont("DejaVuSans.ttf", "DejaVu", "bold");
    return true;
  } catch {
    return false;
  }
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

      // Load Unicode font
      const hasUnicodeFont = await loadFont(doc);
      const fontName = hasUnicodeFont ? "DejaVu" : "helvetica";

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

      // Title
      doc.setFontSize(16);
      doc.setFont(fontName, "bold");
      doc.setTextColor(30);
      doc.text(data.examTitle, margin, y);
      y += 7;

      doc.setFontSize(9);
      doc.setFont(fontName, "normal");
      doc.setTextColor(100);
      doc.text(
        `${data.userName}  |  ${data.duration} min  |  ${data.totalMarks} marks`,
        margin,
        y,
      );
      y += 5;

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

      // Questions
      for (const q of data.questions) {
        checkPage(50);

        // Header
        doc.setFontSize(10);
        doc.setFont(fontName, "bold");
        doc.setTextColor(30);
        let header = `Q${q.sequenceNumber}.`;
        if (q.source === "PYQ" && q.pyqSource) {
          header += `  [PYQ: ${q.pyqSource}]`;
        }
        doc.text(header, margin, y);

        const status = q.selectedOption
          ? q.isCorrect ? "Correct" : "Wrong"
          : "Skipped";
        doc.setFont(fontName, "bold");
        if (q.isCorrect) doc.setTextColor(22, 163, 74);
        else if (q.selectedOption) doc.setTextColor(220, 38, 38);
        else doc.setTextColor(150);
        doc.text(status, pageW - margin - doc.getTextWidth(status), y);
        y += 5;

        // Question text — Unicode renders properly with DejaVu font
        doc.setFont(fontName, "normal");
        doc.setTextColor(40);
        doc.setFontSize(9.5);
        const qLines = doc.splitTextToSize(q.questionText, contentW);
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

          if (isRight) {
            doc.setFillColor(220, 252, 231);
            doc.roundedRect(margin, y - 3.5, contentW, 6, 1, 1, "F");
          } else if (isUserWrong) {
            doc.setFillColor(254, 226, 226);
            doc.roundedRect(margin, y - 3.5, contentW, 6, 1, 1, "F");
          }

          doc.setFont(fontName, isRight ? "bold" : "normal");
          doc.setTextColor(
            isRight ? 22 : isUserWrong ? 180 : 60,
            isRight ? 130 : isUserWrong ? 40 : 60,
            isRight ? 22 : isUserWrong ? 40 : 60,
          );

          const optText = `${opt.label}. ${opt.text}`;
          const optLines = doc.splitTextToSize(optText, contentW - 6);
          doc.text(optLines, margin + 3, y);
          y += optLines.length * 3.8 + 1.5;
        }

        // Answer line
        y += 1;
        doc.setFontSize(8);
        doc.setFont(fontName, "normal");
        doc.setTextColor(120);
        doc.text(
          `Your answer: ${q.selectedOption || "--"}    Correct: ${q.correctOption}    Time: ${Math.round(q.timeSec)}s`,
          margin,
          y,
        );
        y += 4;

        // Solution
        if (q.explanation && q.explanation.trim()) {
          const solLines = doc.splitTextToSize(q.explanation, contentW - 8);
          const solH = solLines.length * 3.3 + 7;
          checkPage(solH + 2);

          doc.setFillColor(254, 252, 232);
          doc.roundedRect(margin, y - 1, contentW, solH, 1, 1, "F");

          doc.setFontSize(8);
          doc.setFont(fontName, "bold");
          doc.setTextColor(146, 64, 14);
          doc.text("Solution:", margin + 3, y + 3);

          doc.setFont(fontName, "normal");
          doc.setTextColor(100, 50, 10);
          doc.text(solLines, margin + 3, y + 7);
          y += solH + 3;
        }

        y += 2;
        doc.setDrawColor(230);
        doc.line(margin, y, pageW - margin, y);
        y += 5;
      }

      // Footer
      checkPage(8);
      doc.setTextColor(180);
      doc.setFontSize(7);
      doc.setFont(fontName, "normal");
      doc.text("Generated by AI Exam Portal", pageW / 2, y, { align: "center" });

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
