import { useDeferredValue, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Tv2 } from "lucide-react";
import { toast } from "sonner";
import {
  addStreamer,
  deleteStreamer,
  getGuildStreamers,
  updateStreamerState,
  type Streamer
} from "@/app/lib/api";
import { useSelectedGuild, dashboardKeys, buildGuildRoute } from "@/app/lib/dashboard";
import { AddStreamerDialog } from "@/app/components/guild/AddStreamerDialog";
import { StreamerTable } from "@/app/components/guild/StreamerTable";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
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

type StreamerFilter = "all" | "enabled" | "disabled";

export function GuildStreamersPage() {
  const { guildId = "" } = useParams();
  const queryClient = useQueryClient();
  const { selectedGuild, isLoading: guildLoading } = useSelectedGuild(guildId);
  const [searchValue, setSearchValue] = useState("");
  const [filter, setFilter] = useState<StreamerFilter>("all");
  const [streamerToDelete, setStreamerToDelete] = useState<Streamer | null>(null);
  const deferredSearch = useDeferredValue(searchValue);

  const streamersQuery = useQuery({
    enabled: Boolean(guildId),
    queryKey: dashboardKeys.guildStreamers(guildId),
    queryFn: () => getGuildStreamers(guildId)
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
      setStreamerToDelete(null);
      toast.success("Streamer removed successfully.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to remove streamer.");
    }
  });

  const filteredStreamers = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return [...(streamersQuery.data ?? [])]
      .filter((streamer) => {
        if (filter === "enabled") {
          return streamer.isActive;
        }

        if (filter === "disabled") {
          return !streamer.isActive;
        }

        return true;
      })
      .filter((streamer) =>
        normalizedSearch
          ? streamer.streamerUsername.toLowerCase().includes(normalizedSearch)
          : true
      )
      .sort((left, right) => left.streamerUsername.localeCompare(right.streamerUsername));
  }, [deferredSearch, filter, streamersQuery.data]);

  if (guildLoading || streamersQuery.isLoading) {
    return <LoadingSkeleton variant="table" />;
  }

  if (!selectedGuild) {
    return (
      <EmptyState
        icon={Tv2}
        title="Guild not found"
        description="Return to the overview, choose a guild from the switcher, and then reopen the streamer manager."
        action={
          <Button asChild>
            <Link to="/dashboard/overview">Back to overview</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Guild streamers"
        title={`Manage streamers for ${selectedGuild.name}`}
        description="Search, enable, disable, and remove tracked Kick creators without leaving the guild workspace."
        actions={
          <AddStreamerDialog
            guildName={selectedGuild.name}
            isPending={addStreamerMutation.isPending}
            onSubmit={(streamerUsername) => addStreamerMutation.mutateAsync(streamerUsername)}
          />
        }
      />

      <div className="flex flex-col gap-4 rounded-[28px] border border-border/70 bg-card/90 p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search streamer username"
          />
        </div>

        <Tabs value={filter} onValueChange={(value) => setFilter(value as StreamerFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="enabled">Enabled</TabsTrigger>
            <TabsTrigger value="disabled">Disabled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <StreamerTable
        guildId={selectedGuild.id}
        streamers={filteredStreamers}
        onToggle={(streamer) => toggleStreamerMutation.mutate(streamer)}
        onDelete={(streamer) => setStreamerToDelete(streamer)}
        emptyState={
          <EmptyState
            icon={Tv2}
            title="No streamers match this view"
            description="Adjust the search or add another Kick creator to start monitoring new live events."
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
                ? `This stops tracking ${streamerToDelete.streamerUsername} for ${selectedGuild.name}.`
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
