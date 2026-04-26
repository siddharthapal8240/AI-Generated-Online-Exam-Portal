"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export function DownloadPaperButton({ examId }: { examId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/${examId}/download-paper`);
      const html = await res.text();

      // Open in new window and trigger print (Save as PDF)
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Wait for content to render then trigger print
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (err) {
      alert("Failed to download paper");
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
      Download Paper
    </button>
  );
}
