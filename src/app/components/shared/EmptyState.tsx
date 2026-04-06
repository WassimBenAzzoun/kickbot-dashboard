import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardHeader className="items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/8 text-primary">
          <Icon />
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
