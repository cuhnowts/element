import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BriefingCardSection } from "./BriefingCardSection";
import { AlertTriangle, Clock, Trophy } from "lucide-react";
import type { BriefingProject, BriefingTag } from "@/types/briefing";

const TAG_VARIANTS: Record<
  BriefingTag,
  { variant: "destructive" | "secondary" | "outline"; className?: string }
> = {
  overdue: { variant: "destructive" },
  "approaching-deadline": { variant: "outline", className: "text-chart-4" },
  blocked: { variant: "destructive" },
  "on-track": { variant: "secondary" },
  "recently-completed": { variant: "secondary", className: "text-chart-2" },
};

interface BriefingProjectCardProps {
  project: BriefingProject;
  onNavigate: (projectId: number) => void;
}

export function BriefingProjectCard({
  project,
  onNavigate,
}: BriefingProjectCardProps) {
  return (
    <Card
      className="hover:bg-muted/50 transition-colors"
      aria-label={`${project.name} briefing`}
    >
      <CardHeader
        className="cursor-pointer"
        onClick={() => project.projectId && onNavigate(project.projectId)}
      >
        <div className="flex items-center justify-between">
          <CardTitle>{project.name}</CardTitle>
          <div className="flex gap-1">
            {project.tags.map((tag) => {
              const style = TAG_VARIANTS[tag] ?? { variant: "outline" as const };
              return (
                <Badge
                  key={tag}
                  variant={style.variant}
                  className={style.className}
                >
                  {tag.replace(/-/g, " ")}
                </Badge>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {project.blockers?.length > 0 && (
          <BriefingCardSection
            title="Blockers"
            icon={AlertTriangle}
            items={project.blockers}
            defaultOpen
          />
        )}
        {project.deadlines?.length > 0 && (
          <BriefingCardSection
            title="Deadlines"
            icon={Clock}
            items={project.deadlines}
            defaultOpen
          />
        )}
        {project.wins?.length > 0 && (
          <BriefingCardSection
            title="Wins"
            icon={Trophy}
            items={project.wins}
          />
        )}
      </CardContent>
    </Card>
  );
}
