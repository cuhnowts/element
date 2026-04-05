import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface BriefingSummaryCardProps {
  summary: string;
}

export function BriefingSummaryCard({ summary }: BriefingSummaryCardProps) {
  return (
    <Card aria-label="Briefing summary">
      <CardHeader>
        <CardTitle>Today's Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{summary}</p>
      </CardContent>
    </Card>
  );
}
