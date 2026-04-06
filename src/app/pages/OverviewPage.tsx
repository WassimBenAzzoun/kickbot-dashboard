import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BellRing,
  Bot,
  Copy,
  LayoutDashboard,
  RadioTower,
  Server,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { SummaryCard } from "@/app/components/shared/SummaryCard";
import { SetupChecklist } from "@/app/components/shared/SetupChecklist";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { GuildAvatar } from "@/app/components/shared/GuildAvatar";
import { BotStatusBadge } from "@/app/components/shared/BotStatusBadge";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { NotificationHistoryTable } from "@/app/components/guild/NotificationHistoryTable";
import { useAuth } from "@/app/lib/auth";
import {
  buildGuildRoute,
  dashboardKeys,
  getDashboardMetrics,
  getDefaultGuild,
  useDashboardGuilds,
  useDashboardInviteLink
} from "@/app/lib/dashboard";
import { getGuildNotifications } from "@/app/lib/api";

export function OverviewPage() {
  const { user } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);

  const guildsQuery = useDashboardGuilds();
  const inviteLinkQuery = useDashboardInviteLink();

  const guilds = guildsQuery.data ?? [];
  const metrics = useMemo(() => getDashboardMetrics(guilds), [guilds]);
  const featuredGuild = useMemo(() => getDefaultGuild(guilds), [guilds]);

  const notificationsQuery = useQuery({
    enabled: Boolean(featuredGuild),
    queryKey: dashboardKeys.guildNotifications(featuredGuild?.id ?? "", 1, 5),
    queryFn: () => getGuildNotifications(featuredGuild!.id, 1, 5)
  });

  const filteredGuilds = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) {
      return guilds;
    }

    return guilds.filter((guild) => guild.name.toLowerCase().includes(query));
  }, [deferredSearch, guilds]);

  async function copyInviteLink() {
    if (!inviteLinkQuery.data) {
      return;
    }

    await navigator.clipboard.writeText(inviteLinkQuery.data);
    toast.success("Invite link copied to clipboard.");
  }

  if (guildsQuery.isLoading && guilds.length === 0) {
    return <LoadingSkeleton />;
  }

  const checklistSteps = [
    {
      title: "Invite the bot",
      description: "Connect KickBot to the Discord server where you want alerts delivered.",
      complete: guilds.some((guild) => guild.botInGuild),
      action: inviteLinkQuery.data ? (
        <Button asChild size="sm">
          <a href={inviteLinkQuery.data} rel="noreferrer" target="_blank">
            Invite now
          </a>
        </Button>
      ) : null
    },
    {
      title: "Choose a guild",
      description: "Pick the Discord community you want to manage from the guild rail.",
      complete: guilds.length > 0,
      action: (
        <Button asChild size="sm" variant="outline">
          <Link to={guilds[0] ? buildGuildRoute(guilds[0].id) : "/dashboard/setup"}>
            Open guilds
          </Link>
        </Button>
      )
    },
    {
      title: "Configure the alert channel",
      description: "Assign the text channel that should receive live stream notifications.",
      complete: guilds.some((guild) => Boolean(guild.alertChannelId)),
      action: featuredGuild ? (
        <Button asChild size="sm" variant="outline">
          <Link to={buildGuildRoute(featuredGuild.id)}>Configure channel</Link>
        </Button>
      ) : null
    },
    {
      title: "Add your first streamer",
      description: "Start tracking Kick creators and let the bot handle notification delivery.",
      complete: guilds.some((guild) => guild.trackedStreamerCount > 0),
      action: featuredGuild ? (
        <Button asChild size="sm" variant="outline">
          <Link to={buildGuildRoute(featuredGuild.id, "streamers")}>Manage streamers</Link>
        </Button>
      ) : null
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Kick + Discord control room"
        title={`Welcome back, ${user?.globalName ?? user?.username ?? "operator"}`}
        description="Track connected guilds, confirm alert readiness, and jump into the servers that need attention first."
        actions={
          <>
            {inviteLinkQuery.data ? (
              <Button variant="outline" onClick={() => void copyInviteLink()}>
                <Copy data-icon="inline-start" />
                Copy invite
              </Button>
            ) : null}
            {inviteLinkQuery.data ? (
              <Button asChild>
                <a href={inviteLinkQuery.data} rel="noreferrer" target="_blank">
                  <Sparkles data-icon="inline-start" />
                  Invite bot
                </a>
              </Button>
            ) : null}
          </>
        }
      />

      {guilds.length === 0 ? (
        <>
          <EmptyState
            icon={LayoutDashboard}
            title="No manageable guilds yet"
            description="Sign in with a Discord account that can manage servers, invite the bot to a guild, and this dashboard will populate with setup and activity details."
            action={
              inviteLinkQuery.data ? (
                <Button asChild>
                  <a href={inviteLinkQuery.data} rel="noreferrer" target="_blank">
                    Invite KickBot
                  </a>
                </Button>
              ) : null
            }
          />
          <SetupChecklist steps={checklistSteps} />
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Managed guilds"
              value={metrics.totalGuilds}
              description="Discord servers your account can configure from this workspace."
              icon={Server}
            />
            <SummaryCard
              title="Tracked streamers"
              value={metrics.trackedStreamers}
              description="Kick creators currently monitored across all guilds."
              icon={RadioTower}
            />
            <SummaryCard
              title="Active alert channels"
              value={metrics.activeAlerts}
              description="Guilds that already have a Discord destination configured."
              icon={BellRing}
            />
            <SummaryCard
              title="Bot connected"
              value={metrics.connectedGuilds}
              description="Servers where the bot is already present and ready to post."
              icon={Bot}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <SetupChecklist steps={checklistSteps} />

            <Card>
              <CardHeader className="gap-2">
                <CardTitle>Recent notifications</CardTitle>
                <CardDescription>
                  {featuredGuild
                    ? `Latest delivery activity for ${featuredGuild.name}.`
                    : "Select a guild to inspect recent delivery activity."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {featuredGuild ? (
                  <NotificationHistoryTable
                    notifications={notificationsQuery.data?.items ?? []}
                    variant="compact"
                    emptyState={
                      <EmptyState
                        icon={BellRing}
                        title="No notifications yet"
                        description="Once a tracked streamer goes live, delivery records will appear here for quick review."
                        action={
                          <Button asChild variant="outline">
                            <Link to={buildGuildRoute(featuredGuild.id, "notifications")}>
                              Open full history
                            </Link>
                          </Button>
                        }
                      />
                    }
                  />
                ) : (
                  <EmptyState
                    icon={BellRing}
                    title="Pick a guild to see activity"
                    description="The overview highlights recent notification history for the most relevant connected guild."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Guild quick access</CardTitle>
                  <CardDescription>
                    Jump into settings, streamers, and notification history with one click.
                  </CardDescription>
                </div>
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search a guild by name"
                  className="w-full lg:max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredGuilds.map((guild) => (
                <Card className="border border-border/70 bg-background/70 shadow-none" key={guild.id}>
                  <CardHeader className="gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <GuildAvatar
                          name={guild.name}
                          iconUrl={guild.iconUrl}
                          initials={guild.initials}
                        />
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">{guild.name}</CardTitle>
                          <CardDescription>{guild.trackedStreamerCount} tracked streamers</CardDescription>
                        </div>
                      </div>
                      <BotStatusBadge botInGuild={guild.botInGuild} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={guild.alertChannelId ? "default" : "secondary"}>
                        {guild.alertChannelId ? "Channel configured" : "Channel missing"}
                      </Badge>
                      <Badge variant="outline">{guild.userCanManage ? "Manage access" : "Read only"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="flex-1">
                      <Link to={buildGuildRoute(guild.id)}>Settings</Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <Link to={buildGuildRoute(guild.id, "streamers")}>Streamers</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link to={buildGuildRoute(guild.id, "notifications")}>Open notifications</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
