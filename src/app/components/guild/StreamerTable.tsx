import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Streamer } from "@/app/lib/api";
import { formatDateTime, formatRelativeTime } from "@/app/lib/format";
import { buildGuildRoute } from "@/app/lib/dashboard";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/app/components/ui/dropdown-menu";
import { Switch } from "@/app/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";

interface StreamerTableProps {
  guildId: string;
  streamers: Streamer[];
  onToggle: (streamer: Streamer) => void;
  onDelete: (streamer: Streamer) => void;
  emptyState?: ReactNode;
  variant?: "full" | "compact";
}

function StreamerStatus({ streamer }: { streamer: Streamer }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={streamer.isActive ? "success" : "secondary"}>
        {streamer.isActive ? "Tracking on" : "Tracking off"}
      </Badge>
      <Badge variant={streamer.lastKnownLiveState ? "default" : "outline"}>
        {streamer.lastKnownLiveState ? "Live now" : "Offline"}
      </Badge>
    </div>
  );
}

function StreamerActions({
  streamer,
  onToggle,
  onDelete
}: Pick<StreamerTableProps, "onToggle" | "onDelete"> & { streamer: Streamer }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={`Actions for ${streamer.streamerUsername}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onToggle(streamer)}>
            {streamer.isActive ? "Disable tracking" : "Enable tracking"}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={buildGuildRoute(streamer.guildId, "notifications")}>View notifications</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(streamer)}
          >
            <Trash2 />
            Remove streamer
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StreamerTable({
  guildId,
  streamers,
  onToggle,
  onDelete,
  emptyState,
  variant = "full"
}: StreamerTableProps) {
  if (streamers.length === 0) {
    return emptyState ?? null;
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Streamer</TableHead>
              <TableHead>Status</TableHead>
              {variant === "full" ? <TableHead>Last notification</TableHead> : null}
              <TableHead>Tracking</TableHead>
              <TableHead className="w-[64px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {streamers.map((streamer) => (
              <TableRow key={streamer.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">{streamer.streamerUsername}</div>
                    <div className="text-sm text-muted-foreground">Kick</div>
                  </div>
                </TableCell>
                <TableCell>
                  <StreamerStatus streamer={streamer} />
                </TableCell>
                {variant === "full" ? (
                  <TableCell>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>{formatRelativeTime(streamer.lastNotifiedLiveAt)}</div>
                      <div>{formatDateTime(streamer.lastNotifiedLiveAt)}</div>
                    </div>
                  </TableCell>
                ) : null}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={streamer.isActive}
                      onCheckedChange={() => onToggle(streamer)}
                      aria-label={`Toggle ${streamer.streamerUsername}`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {streamer.isActive ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <StreamerActions streamer={streamer} onToggle={onToggle} onDelete={onDelete} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 md:hidden">
        {streamers.map((streamer) => (
          <Card key={streamer.id}>
            <CardHeader className="gap-3 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{streamer.streamerUsername}</CardTitle>
                  <CardDescription>Kick streamer tracked for this guild</CardDescription>
                </div>
                <StreamerActions streamer={streamer} onToggle={onToggle} onDelete={onDelete} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <StreamerStatus streamer={streamer} />
              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Tracking</p>
                  <p className="text-sm text-muted-foreground">
                    {streamer.isActive ? "Enabled for alerts" : "Disabled"}
                  </p>
                </div>
                <Switch
                  checked={streamer.isActive}
                  onCheckedChange={() => onToggle(streamer)}
                  aria-label={`Toggle ${streamer.streamerUsername}`}
                />
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <p className="text-sm font-medium text-foreground">Last notification</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatRelativeTime(streamer.lastNotifiedLiveAt)}
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(streamer.lastNotifiedLiveAt)}</p>
              </div>
              <Button asChild variant="outline">
                <Link to={buildGuildRoute(guildId, "notifications")}>Open notification history</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
