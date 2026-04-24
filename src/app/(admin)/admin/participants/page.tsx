import { getParticipantsList } from "@/server/data-access/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Users, Search } from "lucide-react";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const result = await getParticipantsList({
    search: params.search,
    page: params.page ? parseInt(params.page) : 1,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Participants</h1>
        <p className="text-muted-foreground">{result.totalCount} registered participant{result.totalCount !== 1 ? "s" : ""}</p>
      </div>

      {result.data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No participants registered yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Exams Taken</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((user: any) => (
                <TableRow key={user.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/admin/participants/${user.id}`} className="font-medium hover:underline">
                      {user.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>{user.examCount}</TableCell>
                  <TableCell>
                    {user.avgScore !== null ? (
                      <Badge variant="outline" className={
                        user.avgScore >= 70 ? "bg-green-100 text-green-800" :
                        user.avgScore >= 40 ? "bg-amber-100 text-amber-800" :
                        "bg-red-100 text-red-800"
                      }>
                        {user.avgScore}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {result.totalPages > 1 && (
        <div className="text-center text-sm text-muted-foreground">
          Page {result.page} of {result.totalPages}
        </div>
      )}
    </div>
  );
}
