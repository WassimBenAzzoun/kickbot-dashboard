import { ReactNode } from "react";
import { cn } from "@/app/lib/utils";

interface DashboardHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
}

export function DashboardHeader({
  eyebrow,
  title,
  description,
  actions,
  className
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-[28px] border border-border/70 bg-card/90 p-6 shadow-[0_20px_56px_-32px_hsl(var(--foreground)/0.32)] backdrop-blur-sm sm:p-8 lg:flex-row lg:items-end lg:justify-between",
        className
      )}
    >
      <div className="space-y-3">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
