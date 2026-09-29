import { FormEvent, useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AdminBotGuild, getAdminBotGuilds, getAdminSettings, updateAdminGuildAccess, updateAdminSettings } from "@/app/lib/api";
import { AdminSectionNav } from "@/app/components/admin/AdminSectionNav";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";

export function AdminWhitelistPage() {
  const [searchParams] = useSearchParams();
  const [guilds, setGuilds] = useState<AdminBotGuild[]>([]);
  const [enforced, setEnforced] = useState(false);
  const [guildId, setGuildId] = useState(searchParams.get("guildId")?.trim() ?? "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const allowed = useMemo(() => guilds.filter((guild) => guild.isAllowed), [guilds]);

  async function load() {
    try {
      const [settings, knownGuilds] = await Promise.all([getAdminSettings(), getAdminBotGuilds()]);
      setEnforced(settings.allowlistEnforced);
      setGuilds(knownGuilds);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load allowlist settings.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function toggleEnforcement(value: boolean) {
    setBusy(true);
    try {
      const settings = await updateAdminSettings({ allowlistEnforced: value });
      setEnforced(settings.allowlistEnforced);
      toast.success(`Allowlist enforcement ${value ? "enabled" : "disabled"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update enforcement.");
    } finally { setBusy(false); }
  }

  async function allowGuild(event: FormEvent) {
    event.preventDefault();
    const normalizedId = guildId.trim();
    if (!/^\d{17,20}$/.test(normalizedId)) {
      toast.error("Enter a valid Discord guild ID.");
      return;
    }
    setBusy(true);
    try {
      await updateAdminGuildAccess(normalizedId, true, notes.trim() || null);
      setGuildId("");
      setNotes("");
      await load();
      toast.success("Guild added to the allowlist.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to allow guild.");
    } finally { setBusy(false); }
  }

  async function removeGuild(guild: AdminBotGuild) {
    setBusy(true);
    try {
      await updateAdminGuildAccess(guild.id, false, guild.allowlistNotes);
      await load();
      toast.success("Guild removed from the allowlist.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to block guild.");
    } finally { setBusy(false); }
  }

  return <div className="flex flex-col gap-6">
    <DashboardHeader eyebrow="Admin" title="Guild allowlist" description="Control whether new guilds may use the bot and explicitly approve known Discord servers." actions={<Badge variant={enforced ? "success" : "secondary"}>{enforced ? "Enforced" : "Disabled"}</Badge>} />
    <AdminSectionNav />
    <Card><CardHeader><CardTitle>Enforcement</CardTitle><CardDescription>When enabled, backend guards remain authoritative and only allowed guilds can use KickBot.</CardDescription></CardHeader><CardContent className="flex items-center justify-between gap-4"><div><p className="font-medium">Require allowlist access</p><p className="text-sm text-muted-foreground">Changes the global BotSettings policy.</p></div><Switch checked={enforced} disabled={busy} onCheckedChange={(value) => void toggleEnforcement(value)} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Allow a guild</CardTitle><CardDescription>Use a Discord snowflake. A guild does not need to be connected yet.</CardDescription></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => void allowGuild(event)}><Input value={guildId} onChange={(event) => setGuildId(event.target.value)} placeholder="Guild ID" /><Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional audit notes" /><Button disabled={busy} type="submit">Allow guild</Button></form></CardContent></Card>
    {allowed.length === 0 ? <EmptyState icon={ShieldCheck} title="No allowed guilds" description="Add a guild above before enabling enforcement." /> : <div className="grid gap-3">{allowed.map((guild) => <Card key={guild.id}><CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{guild.name ?? guild.id}</p><p className="text-sm text-muted-foreground">{guild.id}{guild.allowlistNotes ? ` · ${guild.allowlistNotes}` : ""}</p></div><Button variant="outline" disabled={busy} onClick={() => void removeGuild(guild)}>Remove access</Button></CardContent></Card>)}</div>}
  </div>;
}
