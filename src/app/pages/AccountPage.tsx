import { Link, useNavigate } from "react-router-dom";
import { Building2, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/app/lib/auth";
import { getDashboardMetrics, useDashboardGuilds } from "@/app/lib/dashboard";
import { getInitials } from "@/app/lib/format";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { SummaryCard } from "@/app/components/shared/SummaryCard";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { GuildAvatar } from "@/app/components/shared/GuildAvatar";

export function AccountPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const guildsQuery = useDashboardGuilds();
  const guilds = guildsQuery.data ?? [];
  const metrics = getDashboardMetrics(guilds);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  if (guildsQuery.isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Account"
        title="Your dashboard access"
        description="Review the Discord identity currently signed in, the number of guilds you manage, and the shortcuts that matter most for daily operations."
        actions={
          <Button variant="outline" onClick={() => void handleLogout()}>
            <LogOut data-icon="inline-start" />
            Sign out
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Managed guilds"
          value={metrics.totalGuilds}
          description="Servers available to this Discord account inside the dashboard."
          icon={Building2}
        />
        <SummaryCard
          title="Tracked streamers"
          value={metrics.trackedStreamers}
          description="Kick creators currently monitored across your workspace."
          icon={Sparkles}
        />
        <SummaryCard
          title="Connected guilds"
          value={metrics.connectedGuilds}
          description="Servers where the bot is already present and operational."
          icon={ShieldCheck}
        />
        <SummaryCard
          title="Configured alerts"
          value={metrics.activeAlerts}
          description="Guilds with a Discord destination configured for live alerts."
          icon={Sparkles}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 rounded-[24px] border border-border/70">
                {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.username} /> : null}
                <AvatarFallback className="rounded-[24px] text-lg">
                  {getInitials(user?.globalName ?? user?.username)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{user?.globalName ?? user?.username}</CardTitle>
                  {user?.isGlobalAdmin ? <Badge variant="success">Global admin</Badge> : null}
                </div>
                <CardDescription>@{user?.username}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="font-medium text-foreground">Session access</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You can manage Discord servers where this account has Administrator or Manage Server permissions.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button asChild variant="outline">
                <Link to="/dashboard/overview">Go to overview</Link>
              </Button>
              {user?.isGlobalAdmin ? (
                <Button asChild variant="outline">
                  <Link to="/dashboard/admin">Open global admin</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-2">
            <CardTitle>Managed guilds</CardTitle>
            <CardDescription>
              Quick reference list for the servers currently connected to your dashboard access.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {guilds.map((guild) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-4"
                key={guild.id}
              >
                <GuildAvatar name={guild.name} iconUrl={guild.iconUrl} initials={guild.initials} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{guild.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {guild.trackedStreamerCount} tracked streamers
                  </p>
                </div>
                <Badge variant={guild.botInGuild ? "success" : "warning"}>
                  {guild.botInGuild ? "Connected" : "Needs invite"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
