import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Copy, Settings2, Sparkles, Tv2 } from "lucide-react";
import { toast } from "sonner";
import {
  addStreamer,
  deleteStreamer,
  getGuildChannels,
  getGuildConfig,
  getGuildNotifications,
  getGuildStreamers,
  updateGuildConfig,
  updateStreamerState,
  type Streamer
} from "@/app/lib/api";
import { useDashboardInviteLink, useSelectedGuild, dashboardKeys, buildGuildRoute } from "@/app/lib/dashboard";
import { formatRelativeTime, pluralize } from "@/app/lib/format";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/app/components/ui/alert-dialog";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { GuildAvatar } from "@/app/components/shared/GuildAvatar";
import { BotStatusBadge } from "@/app/components/shared/BotStatusBadge";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { AddStreamerDialog } from "@/app/components/guild/AddStreamerDialog";
import { GuildSettingsCard } from "@/app/components/guild/GuildSettingsCard";
import { StreamerTable } from "@/app/components/guild/StreamerTable";
import { NotificationHistoryTable } from "@/app/components/guild/NotificationHistoryTable";

export function GuildDetailPage() {
  const { guildId = "" } = useParams();
  const queryClient = useQueryClient();
  const inviteLinkQuery = useDashboardInviteLink();
  const { selectedGuild, isLoading: guildsLoading } = useSelectedGuild(guildId);
  const [streamerToDelete, setStreamerToDelete] = useState<Streamer | null>(null);

  const configQuery = useQuery({
    enabled: Boolean(guildId),
    queryKey: dashboardKeys.guildConfig(guildId),
    queryFn: () => getGuildConfig(guildId)
  });

  const channelsQuery = useQuery({
    enabled: Boolean(guildId),
    queryKey: dashboardKeys.guildChannels(guildId),
    queryFn: async () => {
      try {
        return await getGuildChannels(guildId);
      } catch {
        return { items: [], total: 0, source: "unavailable" as const };
      }
    }
  });

  const streamersQuery = useQuery({
    enabled: Boolean(guildId),
    queryKey: dashboardKeys.guildStreamers(guildId),
    queryFn: () => getGuildStreamers(guildId)
  });

  const notificationsQuery = useQuery({
    enabled: Boolean(guildId),
    queryKey: dashboardKeys.guildNotifications(guildId, 1, 6),
    queryFn: () => getGuildNotifications(guildId, 1, 6)
  });

  const streamers = useMemo(
    () =>
      [...(streamersQuery.data ?? [])].sort((left, right) =>
        left.streamerUsername.localeCompare(right.streamerUsername)
      ),
    [streamersQuery.data]
  );

  const saveConfigMutation = useMutation({
    mutationFn: (alertChannelId: string | null) => updateGuildConfig(guildId, alertChannelId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardKeys.guildConfig(guildId) }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.guilds() })
      ]);
      toast.success("Guild configuration updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update guild configuration.");
    }
  });

  const addStreamerMutation = useMutation({
    mutationFn: (streamerUsername: string) => addStreamer(guildId, streamerUsername),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardKeys.guildStreamers(guildId) }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.guilds() })
      ]);
      toast.success("Streamer added successfully.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to add streamer.");
    }
  });

  const toggleStreamerMutation = useMutation({
    mutationFn: (streamer: Streamer) => updateStreamerState(guildId, streamer.id, !streamer.isActive),
    onSuccess: async (streamer) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardKeys.guildStreamers(guildId) }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.guilds() })
      ]);
      toast.success(
        `${streamer.streamerUsername} ${streamer.isActive ? "enabled" : "disabled"} successfully.`
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update streamer state.");
    }
  });

  const deleteStreamerMutation = useMutation({
    mutationFn: (streamer: Streamer) => deleteStreamer(guildId, streamer.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardKeys.guildStreamers(guildId) }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.guilds() })
      ]);
      toast.success("Streamer removed successfully.");
      setStreamerToDelete(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to remove streamer.");
    }
  });

  async function handleCopyInvite() {
    if (!inviteLinkQuery.data) {
      return;
    }

    await navigator.clipboard.writeText(inviteLinkQuery.data);
    toast.success("Invite link copied to clipboard.");
  }

  if (
    guildsLoading ||
    configQuery.isLoading ||
    streamersQuery.isLoading ||
    notificationsQuery.isLoading
  ) {
    return <LoadingSkeleton variant="detail" />;
  }

  if (!selectedGuild) {
    return (
      <EmptyState
        icon={Settings2}
        title="Guild not found"
        description="This guild is not available in your manageable server list anymore. Return to the overview and choose another server."
        action={
          <Button asChild>
            <Link to="/dashboard/overview">Back to overview</Link>
          </Button>
        }
      />
    );
  }

  const latestNotification = notificationsQuery.data?.items[0];

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Guild workspace"
        title={selectedGuild.name}
        description="Manage alert routing, stream tracking, and notification delivery for this Discord server."
        actions={
          <>
            <AddStreamerDialog
              guildName={selectedGuild.name}
              isPending={addStreamerMutation.isPending}
              onSubmit={(streamerUsername) => addStreamerMutation.mutateAsync(streamerUsername)}
            />
            {!selectedGuild.botInGuild && inviteLinkQuery.data ? (
              <Button variant="outline" onClick={() => void handleCopyInvite()}>
                <Copy data-icon="inline-start" />
                Copy invite
              </Button>
            ) : null}
            {!selectedGuild.botInGuild && inviteLinkQuery.data ? (
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

      <Card>
        <CardHeader className="gap-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <GuildAvatar
                name={selectedGuild.name}
                iconUrl={selectedGuild.iconUrl}
                initials={selectedGuild.initials}
                className="size-16"
              />
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{selectedGuild.name}</CardTitle>
                  <BotStatusBadge botInGuild={selectedGuild.botInGuild} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selectedGuild.alertChannelId ? "default" : "secondary"}>
                    {selectedGuild.alertChannelId
                      ? `Alert channel ${selectedGuild.alertChannelId}`
                      : "Alert channel not configured"}
                  </Badge>
                  <Badge variant="outline">{pluralize(selectedGuild.trackedStreamerCount, "streamer")}</Badge>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <p className="text-sm font-medium text-foreground">Recent activity</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {latestNotification ? formatRelativeTime(latestNotification.sentAt) : "No deliveries yet"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <p className="text-sm font-medium text-foreground">Notification volume</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {notificationsQuery.data?.total ?? 0} logged deliveries
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <p className="text-sm font-medium text-foreground">Guild ID</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{selectedGuild.id}</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <GuildSettingsCard
          config={configQuery.data}
          availableChannels={channelsQuery.data?.items ?? []}
          channelSource={channelsQuery.data?.source ?? "unavailable"}
          isSaving={saveConfigMutation.isPending}
          onSave={(alertChannelId) => saveConfigMutation.mutate(alertChannelId)}
        />

        <Card>
          <CardHeader className="gap-2">
            <CardTitle>Guild actions</CardTitle>
            <CardDescription>
              Use these shortcuts to move through the full management flow for this server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="font-medium text-foreground">Tracked streamers</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Review active creators, disable noisy alerts, or add new Kick accounts to monitor.
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to={buildGuildRoute(selectedGuild.id, "streamers")}>Open streamer manager</Link>
              </Button>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="font-medium text-foreground">Notification history</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Audit message delivery, recent live alerts, and Discord message references for this guild.
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to={buildGuildRoute(selectedGuild.id, "notifications")}>Open full history</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2">
            <Tv2 className="text-primary" />
            Tracked streamer management
          </CardTitle>
          <CardDescription>
            Enable or disable active monitoring directly from the guild overview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StreamerTable
            guildId={selectedGuild.id}
            streamers={streamers}
            variant="compact"
            onToggle={(streamer) => toggleStreamerMutation.mutate(streamer)}
            onDelete={(streamer) => setStreamerToDelete(streamer)}
            emptyState={
              <EmptyState
                icon={Tv2}
                title="No tracked streamers"
                description="Add your first Kick creator to start delivering live alerts into this Discord server."
                action={
                  <AddStreamerDialog
                    guildName={selectedGuild.name}
                    isPending={addStreamerMutation.isPending}
                    onSubmit={(streamerUsername) => addStreamerMutation.mutateAsync(streamerUsername)}
                  />
                }
              />
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2">
            <BellRing className="text-primary" />
            Recent notification history
          </CardTitle>
          <CardDescription>
            Recent live delivery records for this guild, ordered from newest to oldest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationHistoryTable
            notifications={notificationsQuery.data?.items ?? []}
            variant="compact"
            emptyState={
              <EmptyState
                icon={BellRing}
                title="No notification history yet"
                description="Once a tracked streamer goes live and the bot posts into Discord, the delivery record will appear here."
              />
            }
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(streamerToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setStreamerToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove streamer from this guild?</AlertDialogTitle>
            <AlertDialogDescription>
              {streamerToDelete
                ? `This stops tracking ${streamerToDelete.streamerUsername} for ${selectedGuild.name}. Existing notification history stays available.`
                : "Remove this streamer from tracking."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStreamerMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!streamerToDelete || deleteStreamerMutation.isPending}
              onClick={() => {
                if (streamerToDelete) {
                  deleteStreamerMutation.mutate(streamerToDelete);
                }
              }}
            >
              {deleteStreamerMutation.isPending ? "Removing..." : "Remove streamer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
