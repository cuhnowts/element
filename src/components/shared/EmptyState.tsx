interface EmptyStateProps {
  heading: string;
  body: string;
  action?: React.ReactNode;
}

export function EmptyState({ heading, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h3 className="text-lg font-semibold text-foreground mb-2">{heading}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
