import { FormEvent, useState } from "react";
import { ExternalLink, Headphones, Pause, Play, SkipForward, Square } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  enqueueMusic,
  getInstantVoiceChannels,
  getMusicCapabilities,
  getMusicQueue,
  pauseMusic,
  resumeMusic,
  skipMusic,
  stopMusic,
  type MusicEnqueueResult,
  type MusicQueueItem
} from "@/app/lib/api";
import { buildGuildRoute, dashboardKeys, useSelectedGuild } from "@/app/lib/dashboard";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

type Control = "pause" | "resume" | "skip" | "stop";
const CONTROL_MESSAGES: Record<Control, string> = {
  pause: "Music paused.",
  resume: "Music resumed.",
  skip: "Skipped the current track.",
  stop: "Music stopped and the queue was cleared."
};

export function GuildMusicPage() {
  const { guildId = "" } = useParams();
  const queryClient = useQueryClient();
  const { selectedGuild, isLoading: guildLoading } = useSelectedGuild(guildId);
  const [voiceChannelId, setVoiceChannelId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [lastResult, setLastResult] = useState<MusicEnqueueResult | null>(null);

  const capabilities = useQuery({
    enabled: Boolean(guildId),
    queryKey: dashboardKeys.musicCapabilities(guildId),
    queryFn: () => getMusicCapabilities(guildId)
  });
  const channels = useQuery({
    enabled: Boolean(guildId),
    queryKey: dashboardKeys.instantVoiceChannels(guildId),
    queryFn: () => getInstantVoiceChannels(guildId)
  });
  const queue = useQuery({
    enabled: Boolean(guildId),
    queryKey: dashboardKeys.musicQueue(guildId),
    queryFn: () => getMusicQueue(guildId),
    refetchInterval: (state) => {
      const status = state.state.data;
      return status && (status.current || status.items.length > 0) ? 2_000 : 10_000;
    }
  });

  const enqueue = useMutation({
    mutationFn: () => enqueueMusic(guildId, voiceChannelId, sourceUrl.trim()),
    onSuccess: async (result) => {
      setLastResult(result);
      setSourceUrl("");
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.musicQueue(guildId) });
      toast.success(`Queued ${result.accepted.length} track${result.accepted.length === 1 ? "" : "s"}.`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not queue music.")
  });
  const control = useMutation({
    mutationFn: async (action: Control) => {
      if (action === "pause") await pauseMusic(guildId);
      if (action === "resume") await resumeMusic(guildId);
      if (action === "skip") await skipMusic(guildId);
      if (action === "stop") await stopMusic(guildId);
      return action;
    },
    onSuccess: async (action) => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.musicQueue(guildId) });
      toast.success(CONTROL_MESSAGES[action]);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Music control failed.")
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!voiceChannelId) return toast.error("Choose a voice channel first.");
    if (sourceUrl.trim()) enqueue.mutate();
  }

  if (guildLoading || capabilities.isLoading || channels.isLoading || queue.isLoading) {
    return <LoadingSkeleton variant="detail" />;
  }
  if (!selectedGuild) {
    return (
      <EmptyState
        icon={Headphones}
        title="Guild not found"
        description="Choose a manageable guild and reopen Music."
        action={<Button asChild><Link to="/dashboard/overview">Back to overview</Link></Button>}
      />
    );
  }

  const capability = capabilities.data;
  const canUse = Boolean(capability?.enabled && capability.canPlay && capability.voiceRuntimeAvailable);
  const active = Boolean(queue.data?.current || queue.data?.items.length);
  const progress = queue.data?.current
    ? Math.min(100, (queue.data.progressMs / (queue.data.current.durationSeconds * 1_000)) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Discord voice"
        title={`Music for ${selectedGuild.name}`}
        description="Queue YouTube videos and playlists, or match Spotify tracks and playlists to YouTube audio."
        actions={<Button asChild variant="outline"><Link to={buildGuildRoute(selectedGuild.id)}>Guild settings</Link></Button>}
      />

      {!capability?.enabled ? (
        <Alert><Headphones /><AlertTitle>Voice playback is disabled</AlertTitle><AlertDescription>A global admin must enable Instants and Music access first.</AlertDescription></Alert>
      ) : null}
      {capability?.enabled && !capability.canPlay ? (
        <Alert><Headphones /><AlertTitle>Playback access required</AlertTitle><AlertDescription>Your Discord account is not on the global voice-playback allowlist.</AlertDescription></Alert>
      ) : null}
      {capability?.enabled && !capability.voiceRuntimeAvailable ? (
        <Alert variant="destructive"><Headphones /><AlertTitle>Music runtime unavailable</AlertTitle><AlertDescription>Discord voice, FFmpeg, or yt-dlp is not ready on the backend.</AlertDescription></Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Playback destination</CardTitle>
            <CardDescription>Choose a normal voice channel where the bot can connect and speak.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="music-voice-channel">Voice channel</Label>
            <Select value={voiceChannelId} onValueChange={setVoiceChannelId} disabled={!canUse || active}>
              <SelectTrigger id="music-voice-channel"><SelectValue placeholder="Choose a voice channel" /></SelectTrigger>
              <SelectContent>
                {(channels.data ?? []).map((channel) => <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {active ? <p className="text-sm text-muted-foreground">This queue remains bound to its current channel until it becomes idle.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Queue a source</CardTitle>
            <CardDescription>YouTube videos/playlists and Spotify tracks/playlists are supported. Spotify audio is matched to YouTube.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              <Label htmlFor="music-source-url">YouTube or Spotify URL</Label>
              <Input
                id="music-source-url"
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={!canUse}
              />
              <Button className="w-full" type="submit" disabled={!canUse || !voiceChannelId || !sourceUrl.trim() || enqueue.isPending}>
                <Play />
                {enqueue.isPending ? "Resolving source..." : "Resolve and queue"}
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Up to {capability?.limits.maxPlaylistItems ?? 25} playlist items</span>
              <span aria-hidden="true">•</span>
              <span>Maximum {formatDuration(capability?.limits.maxDurationSeconds ?? 7_200)} per track</span>
              {!capability?.spotifyAvailable ? <Badge variant="warning">Spotify credentials missing</Badge> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {lastResult && (lastResult.rejected.length > 0 || lastResult.truncated) ? (
        <Alert>
          <Headphones />
          <AlertTitle>Playlist imported with limits</AlertTitle>
          <AlertDescription>
            {lastResult.accepted.length} queued, {lastResult.rejected.length} skipped.
            {lastResult.truncated ? " Only the configured first items were considered." : ""}
            {lastResult.rejected.slice(0, 5).map((item) => <span className="mt-1 block" key={`${item.sourceUrl}-${item.code}`}>{item.title ?? "Track"}: {item.message}</span>)}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Music queue</CardTitle>
            <CardDescription>Instants temporarily pause this stream and music resumes afterward.</CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" disabled={!queue.data?.current || queue.data?.interruptedByInstant || control.isPending} onClick={() => control.mutate(queue.data?.paused ? "resume" : "pause")}>
              {queue.data?.paused ? <Play /> : <Pause />}
              {queue.data?.interruptedByInstant ? "Interrupted" : queue.data?.paused ? "Resume" : "Pause"}
            </Button>
            <Button variant="outline" size="sm" disabled={!queue.data?.current || control.isPending} onClick={() => control.mutate("skip")}><SkipForward />Skip</Button>
            <Button variant="destructive" size="sm" disabled={!active || control.isPending} onClick={() => control.mutate("stop")}><Square />Stop</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={queue.data?.current ? "success" : "secondary"}>{queue.data?.connectionState ?? "IDLE"}</Badge>
            {queue.data?.paused ? <Badge variant="warning">{queue.data.interruptedByInstant ? "Interrupted by Instant" : "Paused"}</Badge> : null}
            {queue.data?.voiceChannelId ? <Badge variant="outline">Channel {queue.data.voiceChannelId}</Badge> : null}
          </div>
          {queue.data?.current ? (
            <div className="space-y-3">
              <MusicRow label="Now playing" item={queue.data.current} />
              <div className="h-2 overflow-hidden rounded-full bg-primary/20" role="progressbar" aria-label="Track progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatDuration(Math.floor(queue.data.progressMs / 1_000))}</span>
                <span>{formatDuration(queue.data.current.durationSeconds)}</span>
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground">Nothing is playing.</p>}
          {(queue.data?.items ?? []).map((item) => <MusicRow key={item.id} label={`Next · #${item.position}`} item={item} />)}
          {queue.data?.lastError ? (
            <Alert variant="destructive"><AlertTitle>{queue.data.lastError.code}</AlertTitle><AlertDescription>{queue.data.lastError.message}</AlertDescription></Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function MusicRow({ label, item }: { label: string; item: MusicQueueItem }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 p-3">
      {item.thumbnailUrl ? <img className="size-14 rounded-xl object-cover" src={item.thumbnailUrl} alt="" /> : <div className="flex size-14 items-center justify-center rounded-xl bg-muted"><Headphones className="text-muted-foreground" /></div>}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <a className="block truncate font-medium text-primary hover:underline" href={item.originalUrl} target="_blank" rel="noreferrer">
          {item.title}<ExternalLink className="ml-1 inline size-3" />
        </a>
        <p className="truncate text-sm text-muted-foreground">{item.artist ?? "Unknown artist"} · {formatDuration(item.durationSeconds)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge variant={item.provider === "SPOTIFY" ? "success" : "secondary"}>{item.provider}</Badge>
        {item.provider === "SPOTIFY" ? <a className="text-xs text-primary hover:underline" href={item.resolvedYouTubeUrl} target="_blank" rel="noreferrer">YouTube match</a> : null}
      </div>
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}
