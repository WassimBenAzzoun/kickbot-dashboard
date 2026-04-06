import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Copy, Server, Sparkles, Tv2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { SetupChecklist } from "@/app/components/shared/SetupChecklist";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { GuildAvatar } from "@/app/components/shared/GuildAvatar";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { buildGuildRoute, getDefaultGuild, useDashboardGuilds, useDashboardInviteLink } from "@/app/lib/dashboard";

export function SetupPage() {
  const guildsQuery = useDashboardGuilds();
  const inviteLinkQuery = useDashboardInviteLink();

  const guilds = guildsQuery.data ?? [];
  const featuredGuild = useMemo(() => getDefaultGuild(guilds), [guilds]);

  async function handleCopyInvite() {
    if (!inviteLinkQuery.data) {
      return;
    }

    await navigator.clipboard.writeText(inviteLinkQuery.data);
    toast.success("Invite link copied to clipboard.");
  }

  if (guildsQuery.isLoading) {
    return <LoadingSkeleton />;
  }

  const checklistSteps = [
    {
      title: "Invite KickBot",
      description: "Add the bot to the Discord server where you want Kick live alerts to land.",
      complete: guilds.some((guild) => guild.botInGuild),
      action: inviteLinkQuery.data ? (
        <div className="flex flex-wrap gap-3">
          <Button asChild size="sm">
            <a href={inviteLinkQuery.data} rel="noreferrer" target="_blank">
              Invite bot
            </a>
          </Button>
          <Button size="sm" variant="outline" onClick={() => void handleCopyInvite()}>
            <Copy data-icon="inline-start" />
            Copy invite
          </Button>
        </div>
      ) : null
    },
    {
      title: "Choose a guild",
      description: "Pick the Discord server you want to configure from the left guild switcher.",
      complete: guilds.length > 0,
      action: featuredGuild ? (
        <Button asChild size="sm" variant="outline">
          <Link to={buildGuildRoute(featuredGuild.id)}>Open {featuredGuild.name}</Link>
        </Button>
      ) : null
    },
    {
      title: "Set an alert channel",
      description: "Choose or paste the Discord text channel that should receive live notifications.",
      complete: guilds.some((guild) => Boolean(guild.alertChannelId)),
      action: featuredGuild ? (
        <Button asChild size="sm" variant="outline">
          <Link to={buildGuildRoute(featuredGuild.id)}>Configure channel</Link>
        </Button>
      ) : null
    },
    {
      title: "Track your first streamer",
      description: "Add at least one Kick creator so the bot can start delivering alerts.",
      complete: guilds.some((guild) => guild.trackedStreamerCount > 0),
      action: featuredGuild ? (
        <Button asChild size="sm" variant="outline">
          <Link to={buildGuildRoute(featuredGuild.id, "streamers")}>Open streamer manager</Link>
        </Button>
      ) : null
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Onboarding"
        title="Launch your notification workflow"
        description="Move from bot invite to a production-ready alert flow with a guided setup sequence."
        actions={
          inviteLinkQuery.data ? (
            <Button asChild>
              <a href={inviteLinkQuery.data} rel="noreferrer" target="_blank">
                <Sparkles data-icon="inline-start" />
                Invite bot
              </a>
            </Button>
          ) : undefined
        }
      />

      <SetupChecklist steps={checklistSteps} />

      {guilds.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No guilds connected yet"
          description="Once the bot is invited and your Discord account can manage a server, this setup page will also surface the recommended guild to configure next."
        />
      ) : (
        <Card>
          <CardHeader className="gap-2">
            <CardTitle>Recommended guilds to finish setup</CardTitle>
            <CardDescription>
              Prioritize the servers below to complete the remaining configuration steps quickly.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {guilds.map((guild) => (
              <Card className="border border-border/70 bg-background/70 shadow-none" key={guild.id}>
                <CardHeader className="gap-4">
                  <div className="flex items-start gap-3">
                    <GuildAvatar name={guild.name} iconUrl={guild.iconUrl} initials={guild.initials} />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">{guild.name}</CardTitle>
                      <CardDescription>
                        {guild.trackedStreamerCount > 0
                          ? `${guild.trackedStreamerCount} tracked streamers`
                          : "Ready for your first streamer"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={guild.botInGuild ? "success" : "warning"}>
                      {guild.botInGuild ? "Bot connected" : "Bot missing"}
                    </Badge>
                    <Badge variant={guild.alertChannelId ? "default" : "secondary"}>
                      {guild.alertChannelId ? "Alert channel ready" : "Needs channel"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link to={buildGuildRoute(guild.id)}>Settings</Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link to={buildGuildRoute(guild.id, "streamers")}>
                      <Tv2 data-icon="inline-start" />
                      Streamers
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
