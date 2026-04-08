import { Link, NavLink } from "react-router-dom";
import { Activity, ShieldCheck, ShieldEllipsis, UsersRound, Wrench } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";

const adminLinks: Array<{
  to: string;
  label: string;
  description: string;
  icon: typeof Wrench;
  exact?: boolean;
}> = [
  {
    to: "/dashboard/admin",
    label: "Overview",
    description: "Jump to the admin hub and find the right workspace fast.",
    icon: Wrench,
    exact: true
  },
  {
    to: "/dashboard/admin/whitelist",
    label: "Whitelist",
    description: "Manage allowed guilds and whitelist enforcement.",
    icon: ShieldEllipsis
  },
  {
    to: "/dashboard/admin/guilds",
    label: "Bot guilds",
    description: "Review current guild membership and take action.",
    icon: ShieldCheck
  },
  {
    to: "/dashboard/admin/presence",
    label: "Presence",
    description: "Configure rotating statuses and default activity.",
    icon: Activity
  },
  {
    to: "/dashboard/admin/access",
    label: "Admin access",
    description: "Add and remove platform-wide admin operators.",
    icon: UsersRound
  }
] as const;

export function AdminSectionNav({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {adminLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Button asChild key={item.to} variant="outline" size="sm">
              <NavLink
                end={item.exact}
                to={item.to}
                className={({ isActive }) => cn(isActive && "border-primary/40 bg-primary/10 text-primary")}
              >
                <Icon data-icon="inline-start" />
                {item.label}
              </NavLink>
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {adminLinks.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            end={item.exact}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "rounded-[24px] border border-border/70 bg-card/70 p-4 transition-colors hover:border-primary/30 hover:bg-card",
                isActive && "border-primary/40 bg-primary/5"
              )
            }
          >
            <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <p className="font-medium text-foreground">{item.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </NavLink>
        );
      })}
    </div>
  );
}
