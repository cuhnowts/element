interface BriefingGreetingProps {
  summary?: string | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning. Here's your day.";
  if (hour < 17) return "Good afternoon. Here's where things stand.";
  return "Good evening. Here's your wrap-up.";
}

export function BriefingGreeting({ summary }: BriefingGreetingProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-primary">{getGreeting()}</h1>
      {summary && <p className="mt-1 text-sm text-muted-foreground">{summary}</p>}
    </div>
  );
}
