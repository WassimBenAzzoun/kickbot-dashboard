import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

interface SummaryCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
}

export function SummaryCard({ title, value, description, icon: Icon }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <CardTitle className="text-3xl">{value}</CardTitle>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/8 text-primary">
          <Icon />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
