import { ReactNode } from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

interface ChecklistStep {
  title: string;
  description: string;
  complete: boolean;
  action?: ReactNode;
}

interface SetupChecklistProps {
  steps: ChecklistStep[];
}

export function SetupChecklist({ steps }: SetupChecklistProps) {
  const completed = steps.filter((step) => step.complete).length;
  const progress = steps.length === 0 ? 0 : Math.round((completed / steps.length) * 100);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Setup checklist</CardTitle>
            <CardDescription>Track the launch steps for your Discord notification flow.</CardDescription>
          </div>
          <Badge variant={completed === steps.length ? "success" : "secondary"}>
            {completed}/{steps.length} complete
          </Badge>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step) => (
          <div
            className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/70 p-4"
            key={step.title}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-primary">
                {step.complete ? <CheckCircle2 /> : <CircleDashed />}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{step.title}</p>
                  <Badge variant={step.complete ? "success" : "outline"}>
                    {step.complete ? "Done" : "Pending"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {step.action ? <div className="pl-9">{step.action}</div> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
