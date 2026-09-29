import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Server, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AdminBotGuild,
  getAdminBotGuilds,
  leaveAdminBotGuild,
  syncAdminBotGuilds,
  updateAdminGuildAccess
} from "@/app/lib/api";
import { getInitials } from "@/app/lib/format";
import { AdminSectionNav } from "@/app/components/admin/AdminSectionNav";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { GuildAvatar } from "@/app/components/shared/GuildAvatar";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";

function guildIconUrl(guild: AdminBotGuild): string | null {
  if (!guild.iconHash) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.iconHash}.${guild.iconHash.startsWith("a_") ? "gif" : "png"}?size=128`;
}

export function AdminBotGuildsPage() {
  const [guilds, setGuilds] = useState<AdminBotGuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const sortedGuilds = useMemo(
    () => [...guilds].sort((left, right) => (left.name ?? left.id).localeCompare(right.name ?? right.id)),
    [guilds]
  );

  async function load() {
    try {
      setGuilds(await getAdminBotGuilds());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load bot guilds.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function sync() {
    try {
      setGuilds(await syncAdminBotGuilds());
      toast.success("Discord guild inventory synchronized.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to synchronize guilds.");
    }
  }

  async function toggleAccess(guild: AdminBotGuild) {
    setBusyId(guild.id);
    try {
      await updateAdminGuildAccess(guild.id, !guild.isAllowed, guild.allowlistNotes);
      await load();
      toast.success(`${guild.name ?? guild.id} is now ${guild.isAllowed ? "blocked" : "allowed"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update guild access.");
    } finally {
      setBusyId(null);
    }
  }

  async function leave(guild: AdminBotGuild) {
    if (!window.confirm(`Make the bot leave ${guild.name ?? guild.id}?`)) return;
    setBusyId(guild.id);
    try {
      await leaveAdminBotGuild(guild.id);
      await load();
      toast.success("The bot left the guild.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to leave guild.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Admin"
        title="Bot guilds"
        description="Review Discord membership, streamer totals, alert channels, and allowlist access."
        actions={<Button onClick={() => void sync()}><RefreshCw data-icon="inline-start" />Sync with Discord</Button>}
      />
      <AdminSectionNav />
      {!loading && sortedGuilds.length === 0 ? (
        <EmptyState icon={Server} title="No guilds recorded" description="Synchronize with Discord to populate the bot guild inventory." />
      ) : (
        <Card><CardContent className="pt-6"><Table>
          <TableHeader><TableRow><TableHead>Guild</TableHead><TableHead>Membership</TableHead><TableHead>Streamers</TableHead><TableHead>Alert channel</TableHead><TableHead>Access</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>{sortedGuilds.map((guild) => (
            <TableRow key={guild.id}>
              <TableCell><div className="flex items-center gap-3"><GuildAvatar name={guild.name ?? guild.id} iconUrl={guildIconUrl(guild)} initials={getInitials(guild.name ?? guild.id)} /><div><p className="font-medium">{guild.name ?? "Unknown guild"}</p><p className="text-xs text-muted-foreground">{guild.id}</p></div></div></TableCell>
              <TableCell><Badge variant={guild.membershipState === "CONNECTED" ? "success" : "secondary"}>{guild.membershipState}</Badge></TableCell>
              <TableCell>{guild.trackedStreamerCount}</TableCell>
              <TableCell>{guild.alertChannelId ?? "Not configured"}</TableCell>
              <TableCell><Badge variant={guild.isAllowed ? "success" : "warning"}>{guild.isAllowed ? "Allowed" : "Blocked"}</Badge></TableCell>
              <TableCell><div className="flex justify-end gap-2"><Button variant="outline" size="sm" disabled={busyId === guild.id} onClick={() => void toggleAccess(guild)}>{guild.isAllowed ? "Block" : "Allow"}</Button><Button variant="destructive" size="icon" aria-label={`Leave ${guild.name ?? guild.id}`} disabled={busyId === guild.id || guild.membershipState !== "CONNECTED"} onClick={() => void leave(guild)}><Trash2 /></Button></div></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></CardContent></Card>
      )}
    </div>
  );
}
