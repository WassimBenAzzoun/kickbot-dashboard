import { FormEvent, useState } from "react";
import { ExternalLink, Music2, Search, Square } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  enqueueInstant,
  getInstantCapabilities,
  getInstantQueue,
  getInstantVoiceChannels,
  searchInstants,
  stopInstantQueue,
  type InstantSearchResult
} from "@/app/lib/api";
import { buildGuildRoute, dashboardKeys, useSelectedGuild } from "@/app/lib/dashboard";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/app/components/ui/select";

export function GuildInstantsPage() {
  const { guildId = "" } = useParams();
  const queryClient = useQueryClient();
  const { selectedGuild, isLoading: guildLoading } = useSelectedGuild(guildId);
  const [voiceChannelId, setVoiceChannelId] = useState("");
  const [query, setQuery] = useState("");
  const [instantUrl, setInstantUrl] = useState("");
  const [results, setResults] = useState<InstantSearchResult[]>([]);

  const capabilities = useQuery({
    enabled: Boolean(guildId),
    queryKey: dashboardKeys.instantCapabilities(guildId),
    queryFn: () => getInstantCapabilities(guildId)
  });
  const channels = useQuery({
    enabled: Boolean(guildId),
    queryKey: dashboardKeys.instantVoiceChannels(guildId),
    queryFn: () => getInstantVoiceChannels(guildId)
  });
  const queue = useQuery({
    enabled: Boolean(guildId),
    queryKey: dashboardKeys.instantQueue(guildId),
    queryFn: () => getInstantQueue(guildId),
    refetchInterval: (state) => {
      const status = state.state.data;
      return status && (status.current || status.items.length > 0) ? 2_000 : 10_000;
    }
  });

  const searchMutation = useMutation({
    mutationFn: () => searchInstants(guildId, query.trim(), 25),
    onSuccess: setResults,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Search failed.")
  });
  const enqueueMutation = useMutation({
    mutationFn: (url: string) => enqueueInstant(guildId, voiceChannelId, url),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: dashboardKeys.instantQueue(guildId)
      });
      setInstantUrl("");
      toast.success(
        result.startsImmediately
          ? "Playing instant now."
          : `Added at queue position ${result.position}.`
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not queue this instant.")
  });
  const stopMutation = useMutation({
    mutationFn: () => stopInstantQueue(guildId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardKeys.instantQueue(guildId)
      });
      toast.success("Playback stopped and the queue was cleared.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not stop playback.")
  });

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length >= 2) searchMutation.mutate();
  }

  function submitLink(event: FormEvent) {
    event.preventDefault();
    if (!voiceChannelId) return toast.error("Choose a voice channel first.");
    if (instantUrl.trim()) enqueueMutation.mutate(instantUrl.trim());
  }

  if (guildLoading || capabilities.isLoading || channels.isLoading || queue.isLoading) {
    return <LoadingSkeleton variant="detail" />;
  }
  if (!selectedGuild) {
    return (
      <EmptyState
        icon={Music2}
        title="Guild not found"
        description="Choose a manageable guild and reopen Instants."
        action={
          <Button asChild>
            <Link to="/dashboard/overview">Back to overview</Link>
          </Button>
        }
      />
    );
  }

  const capability = capabilities.data;
  const canUse = Boolean(
    capability?.enabled && capability.canPlay && capability.voiceRuntimeAvailable
  );

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Discord voice"
        title={`Instants for ${selectedGuild.name}`}
        description="Search Myinstants or paste an instant page link, then queue it in a Discord voice channel."
        actions={
          <Button asChild variant="outline">
            <Link to={buildGuildRoute(selectedGuild.id)}>Guild settings</Link>
          </Button>
        }
      />

      {!capability?.enabled ? (
        <Alert>
          <Music2 />
          <AlertTitle>Instants are disabled</AlertTitle>
          <AlertDescription>
            A global admin must enable this feature before sounds can be queued.
          </AlertDescription>
        </Alert>
      ) : null}
      {capability?.enabled && !capability.canPlay ? (
        <Alert>
          <Music2 />
          <AlertTitle>Playback access required</AlertTitle>
          <AlertDescription>
            This feature currently allows only globally approved Discord users.
          </AlertDescription>
        </Alert>
      ) : null}
      {capability?.enabled && !capability.voiceRuntimeAvailable ? (
        <Alert variant="destructive">
          <Music2 />
          <AlertTitle>Voice runtime unavailable</AlertTitle>
          <AlertDescription>Discord voice or FFmpeg is not ready on the backend.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Playback destination</CardTitle>
          <CardDescription>
            Only normal voice channels where the bot can view, connect, and speak are listed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="instant-voice-channel">Voice channel</Label>
          <Select value={voiceChannelId} onValueChange={setVoiceChannelId} disabled={!canUse}>
            <SelectTrigger id="instant-voice-channel">
              <SelectValue placeholder="Choose a voice channel" />
            </SelectTrigger>
            <SelectContent>
              {(channels.data ?? []).map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(channels.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No playable voice channels are available. Check the bot’s channel permissions.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Search Myinstants</CardTitle>
            <CardDescription>
              Search results always link back to their original Myinstants page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex gap-2" onSubmit={submitSearch}>
              <Input
                aria-label="Search Myinstants"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search sounds"
                disabled={!canUse}
              />
              <Button
                type="submit"
                disabled={!canUse || query.trim().length < 2 || searchMutation.isPending}
              >
                <Search />
                {searchMutation.isPending ? "Searching" : "Search"}
              </Button>
            </form>
            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 p-3"
                >
                  <a
                    className="min-w-0 truncate text-sm font-medium text-primary hover:underline"
                    href={result.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.title}
                    <ExternalLink className="ml-1 inline size-3" />
                  </a>
                  <Button
                    size="sm"
                    disabled={!voiceChannelId || enqueueMutation.isPending}
                    onClick={() => enqueueMutation.mutate(result.pageUrl)}
                  >
                    Play
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paste an instant link</CardTitle>
            <CardDescription>Only HTTPS Myinstants instant-page URLs are accepted.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submitLink}>
              <Label htmlFor="instant-url">Myinstants URL</Label>
              <Input
                id="instant-url"
                type="url"
                value={instantUrl}
                onChange={(event) => setInstantUrl(event.target.value)}
                placeholder="https://www.myinstants.com/en/instant/.../"
                disabled={!canUse}
              />
              <Button
                className="w-full"
                type="submit"
                disabled={
                  !canUse || !voiceChannelId || !instantUrl.trim() || enqueueMutation.isPending
                }
              >
                {enqueueMutation.isPending ? "Queueing..." : "Queue instant"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Playback queue</CardTitle>
            <CardDescription>
              Updates every two seconds while active and disconnects 30 seconds after becoming idle.
            </CardDescription>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={stopMutation.isPending || (!queue.data?.current && !queue.data?.items.length)}
            onClick={() => stopMutation.mutate()}
          >
            <Square />
            Stop and clear
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={queue.data?.current ? "success" : "secondary"}>
              {queue.data?.connectionState ?? "IDLE"}
            </Badge>
            {queue.data?.voiceChannelId ? (
              <Badge variant="outline">Channel {queue.data.voiceChannelId}</Badge>
            ) : null}
          </div>
          {queue.data?.current ? (
            <QueueRow title="Now playing" item={queue.data.current} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing is playing.</p>
          )}
          {(queue.data?.items ?? []).map((item) => (
            <QueueRow key={item.id} title={`Next · #${item.position}`} item={item} />
          ))}
          {queue.data?.lastError ? (
            <Alert variant="destructive">
              <AlertTitle>{queue.data.lastError.code}</AlertTitle>
              <AlertDescription>{queue.data.lastError.message}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function QueueRow({
  title,
  item
}: {
  title: string;
  item: { title: string; pageUrl: string; requestedVia: string };
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 p-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <a
          className="block truncate font-medium text-primary hover:underline"
          href={item.pageUrl}
          target="_blank"
          rel="noreferrer"
        >
          {item.title}
        </a>
      </div>
      <Badge variant="outline">{item.requestedVia.toLowerCase()}</Badge>
    </div>
  );
}
