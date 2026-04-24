"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Copy, Check, Link2, UserPlus, X } from "lucide-react";
import { inviteParticipantsAction } from "@/server/actions/exam.actions";

interface Invitation {
  id: string;
  email: string;
  status: string;
  invitedAt: string;
}

interface InviteParticipantsProps {
  examId: string;
  examStatus: string;
  invitations: Invitation[];
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-100 text-gray-800",
};

export function InviteParticipants({ examId, examStatus, invitations }: InviteParticipantsProps) {
  const [emailInput, setEmailInput] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const examLink = `${typeof window !== "undefined" ? window.location.origin : ""}/exam/${examId}`;

  async function handleInvite() {
    // Parse emails from input (comma, newline, or space separated)
    const emails = emailInput
      .split(/[,\n\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) {
      alert("Please enter at least one valid email address");
      return;
    }

    setIsInviting(true);
    const result = await inviteParticipantsAction(examId, { emails });
    setIsInviting(false);

    if (result.success) {
      setEmailInput("");
      router.refresh();
    } else {
      alert(result.error || "Failed to invite");
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(examLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Exam Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" />
            Exam Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Share this link with participants. They need to sign up/login first, then they can access the exam.
          </p>
          <div className="flex items-center gap-2">
            <Input value={examLink} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="sm" onClick={copyLink}>
              {copied ? (
                <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          {examStatus === "LIVE" && (
            <p className="text-xs text-green-700">
              This exam is LIVE. Participants can start taking it now.
            </p>
          )}
          {examStatus === "DRAFT" && (
            <p className="text-xs text-amber-700">
              This exam is in DRAFT. Participants can see the info page but cannot start until you set it to LIVE.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invite by Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            Invite by Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Email Addresses</Label>
            <Textarea
              placeholder={"Enter email addresses (one per line or comma-separated):\nfriend1@gmail.com\nfriend2@gmail.com"}
              rows={3}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple emails with commas, spaces, or new lines
            </p>
          </div>
          <Button onClick={handleInvite} disabled={isInviting || !emailInput.trim()}>
            {isInviting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            Send Invitations
          </Button>
        </CardContent>
      </Card>

      {/* Invited List */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Invited Participants ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm">{inv.email}</span>
                  <Badge variant="outline" className={statusColors[inv.status] || ""}>
                    {inv.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
