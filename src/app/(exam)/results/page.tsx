import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Results</h1>
        <p className="text-muted-foreground">View your exam performance history</p>
      </div>
      <Card>
        <CardContent className="p-8 text-center">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No results available yet. Take an exam to see your results here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
