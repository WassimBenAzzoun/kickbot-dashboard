import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardGuild, getDashboardGuilds, getInviteLink } from "@/app/lib/api";
import { getInitials } from "@/app/lib/format";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  guilds: () => [...dashboardKeys.all, "guilds"] as const,
  invite: () => [...dashboardKeys.all, "invite"] as const,
  guildConfig: (guildId: string) => ["guild", guildId, "config"] as const,
  guildChannels: (guildId: string) => ["guild", guildId, "channels"] as const,
  guildStreamers: (guildId: string) => ["guild", guildId, "streamers"] as const,
  guildNotifications: (guildId: string, cursor: string | undefined, limit: number) =>
    ["guild", guildId, "notifications", cursor ?? "first", limit] as const
};

export interface NormalizedGuild {
  id: string;
  name: string;
  initials: string;
  iconUrl: string | null;
  botInGuild: boolean | null;
  alertChannelId: string | null;
  trackedStreamerCount: number;
  userCanManage: boolean;
}

export interface DashboardMetrics {
  totalGuilds: number;
  trackedStreamers: number;
  activeAlerts: number;
  connectedGuilds: number;
}

function buildDiscordGuildIconUrl(guildId?: string | null, iconHash?: string | null): string | null {
  if (!guildId || !iconHash) {
    return null;
  }

  const extension = iconHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${extension}?size=128`;
}

export function normalizeGuild(rawGuild: DashboardGuild): NormalizedGuild {
  const id = rawGuild.id;
  const name = rawGuild.name;
  return {
    id,
    name,
    initials: getInitials(name),
    iconUrl: buildDiscordGuildIconUrl(id, rawGuild.iconHash),
    botInGuild: rawGuild.membershipState === "CONNECTED",
    alertChannelId: rawGuild.alertChannelId,
    trackedStreamerCount: rawGuild.trackedStreamerCount,
    userCanManage: true
  };
}

export function extractGuildIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/dashboard\/guilds\/([^/]+)/);
  return match?.[1] ?? null;
}

export function buildGuildRoute(
  guildId: string,
  section: "settings" | "streamers" | "notifications" = "settings"
): string {
  if (section === "streamers") {
    return `/dashboard/guilds/${guildId}/streamers`;
  }

  if (section === "notifications") {
    return `/dashboard/guilds/${guildId}/notifications`;
  }

  return `/dashboard/guilds/${guildId}`;
}

export function getDefaultGuild(guilds: NormalizedGuild[]): NormalizedGuild | null {
  return (
    guilds.find((guild) => guild.botInGuild && guild.trackedStreamerCount > 0) ??
    guilds.find((guild) => guild.botInGuild) ??
    guilds[0] ??
    null
  );
}

export function getDashboardMetrics(guilds: NormalizedGuild[]): DashboardMetrics {
  return guilds.reduce<DashboardMetrics>(
    (metrics, guild) => ({
      totalGuilds: metrics.totalGuilds + 1,
      trackedStreamers: metrics.trackedStreamers + guild.trackedStreamerCount,
      activeAlerts: metrics.activeAlerts + (guild.alertChannelId ? 1 : 0),
      connectedGuilds: metrics.connectedGuilds + (guild.botInGuild ? 1 : 0)
    }),
    {
      totalGuilds: 0,
      trackedStreamers: 0,
      activeAlerts: 0,
      connectedGuilds: 0
    }
  );
}

export function useDashboardGuilds() {
  return useQuery({
    queryKey: dashboardKeys.guilds(),
    queryFn: getDashboardGuilds,
    select: (guilds) => guilds.map((guild) => normalizeGuild(guild))
  });
}

export function useDashboardInviteLink() {
  return useQuery({
    queryKey: dashboardKeys.invite(),
    queryFn: getInviteLink
  });
}

export function useSelectedGuild(guildId?: string | null) {
  const guildsQuery = useDashboardGuilds();

  const selectedGuild = useMemo(
    () => guildsQuery.data?.find((guild) => guild.id === guildId) ?? null,
    [guildId, guildsQuery.data]
  );

  return {
    ...guildsQuery,
    selectedGuild
  };
}
