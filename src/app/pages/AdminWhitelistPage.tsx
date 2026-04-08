import { FormEvent, useEffect, useMemo, useState } from "react";
import { ShieldEllipsis, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  addAdminWhitelistedGuild,
  AdminBotGuild,
  AdminWhitelistedGuild,
  ApiHttpError,
  getAdminBotGuilds,
  getAdminWhitelistedGuilds,
  getAdminWhitelistEnforcement,
  removeAdminWhitelistedGuild,
  updateAdminWhitelistEnforcement
} from "@/app/lib/api";
import { formatDateTime } from "@/app/lib/format";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/app/components/ui/table";
import { Textarea } from "@/app/components/ui/textarea";
import { AdminSectionNav } from "@/app/components/admin/AdminSectionNav";

export function AdminWhitelistPage() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [whitelistEnforced, setWhitelistEnforced] = useState(false);
  const [whitelistUpdatedAt, setWhitelistUpdatedAt] = useState<string | null>(null);
  const [whitelistedGuilds, setWhitelistedGuilds] = useState<AdminWhitelistedGuild[]>([]);
  const [botGuilds, setBotGuilds] = useState<AdminBotGuild[]>([]);
  const [newWhitelistGuildId, setNewWhitelistGuildId] = useState("");
  const [newWhitelistGuildName, setNewWhitelistGuildName] = useState("");
  const [newWhitelistNotes, setNewWhitelistNotes] = useState("");
  const [isSavingWhitelist, setIsSavingWhitelist] = useState(false);
  const [isSavingWhitelistEnforcement, setIsSavingWhitelistEnforcement] = useState(false);

  const targetGuildId = searchParams.get("guildId")?.trim() ?? "";
  const targetGuildName = searchParams.get("guildName")?.trim() ?? "";

  const sortedWhitelistedGuilds = useMemo(
    () =>
      [...whitelistedGuilds].sort((left, right) =>
        (left.guildName ?? left.guildId).localeCompare(right.guildName ?? right.guildId)
      ),
    [whitelistedGuilds]
  );

  useEffect(() => {
    if (!targetGuildId) {
      return;
    }

    setNewWhitelistGuildId((current) => current || targetGuildId);
    setNewWhitelistGuildName((current) => current || targetGuildName);
  }, [targetGuildId, targetGuildName]);

  async function load(): Promise<void> {
    try {
      const [enforcement, whitelistItems, guildItems] = await Promise.all([
        getAdminWhitelistEnforcement(),
        getAdminWhitelistedGuilds(),
        getAdminBotGuilds()
      ]);

      setWhitelistEnforced(enforcement.enabled);
      setWhitelistUpdatedAt(enforcement.updatedAt);
      setWhitelistedGuilds(whitelistItems);
      setBotGuilds(guildItems);
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 403) {
        toast.error("Global admin access is required.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to load whitelist data.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleToggleWhitelistEnforcement(nextEnabled: boolean): Promise<void> {
    setIsSavingWhitelistEnforcement(true);

    try {
      const response = await updateAdminWhitelistEnforcement(nextEnabled);
      setWhitelistEnforced(response.enabled);
      setWhitelistUpdatedAt(response.updatedAt);
      await load();

      if (response.enabled) {
        toast.success(
          `Whitelist enforcement enabled. Checked ${response.reconciliation?.checked ?? 0} guilds and removed ${response.reconciliation?.left ?? 0}.`
        );
      } else {
        toast.success("Whitelist enforcement disabled.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update whitelist enforcement.");
    } finally {
      setIsSavingWhitelistEnforcement(false);
    }
  }

  async function handleAddWhitelistedGuild(event: FormEvent): Promise<void> {
    event.preventDefault();

    const guildId = newWhitelistGuildId.trim();
    const guildName = newWhitelistGuildName.trim();
    const notes = newWhitelistNotes.trim();

    if (!/^\d{17,20}$/.test(guildId)) {
      toast.error("Enter a valid Discord guild ID.");
      return;
    }

    setIsSavingWhitelist(true);

    try {
      await addAdminWhitelistedGuild({
        guildId,
        guildName: guildName || undefined,
        notes: notes || undefined
      });

      setNewWhitelistGuildId("");
      setNewWhitelistGuildName("");
      setNewWhitelistNotes("");
      await load();
      toast.success("Guild added to whitelist.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add guild to whitelist.");
    } finally {
      setIsSavingWhitelist(false);
    }
  }

  async function handleRemoveWhitelistedGuild(item: AdminWhitelistedGuild): Promise<void> {
    const confirmed = window.confirm(
      `Remove guild "${item.guildName ?? item.guildId}" from the whitelist?`
    );

    if (!confirmed) {
      return;
    }

    setIsSavingWhitelist(true);

    try {
      const result = await removeAdminWhitelistedGuild(item.guildId);
      await load();
      toast.success(
        result.evicted
          ? `Removed ${item.guildName ?? item.guildId} and evicted the bot immediately.`
          : `Removed ${item.guildName ?? item.guildId} from the whitelist.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove guild from whitelist.");
    } finally {
      setIsSavingWhitelist(false);
    }
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading whitelist workspace...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Admin"
        title="Guild whitelist"
        description="Approve the guilds the bot is allowed to stay in, and make whitelist enforcement easy to find and manage."
        actions={
          <>
            <Badge variant={whitelistEnforced ? "success" : "secondary"}>
              {whitelistEnforced ? "Enforced" : "Disabled"}
            </Badge>
            <Badge variant="outline">
              Updated {whitelistUpdatedAt ? formatDateTime(whitelistUpdatedAt) : "never"}
            </Badge>
          </>
        }
      />

      <AdminSectionNav />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Whitelist policy</CardTitle>
            <CardDescription>
              Turn enforcement on when you want the bot to auto-leave guilds that are not explicitly approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[24px] border border-border/70 bg-muted/20 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Auto-leave non-whitelisted guilds</p>
                  <p className="text-sm text-muted-foreground">
                    This only affects guild membership enforcement. Stream alerts and normal guild settings stay separate.
                  </p>
                </div>
                <Switch
                  checked={whitelistEnforced}
                  onCheckedChange={(checked) => void handleToggleWhitelistEnforcement(checked)}
                  disabled={isSavingWhitelistEnforcement}
                />
              </div>
            </div>

            <form className="space-y-4 rounded-[24px] border border-border/70 bg-muted/10 p-5" onSubmit={(event) => void handleAddWhitelistedGuild(event)}>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Add allowed guild</h3>
                <p className="text-sm text-muted-foreground">
                  Enter a guild directly, or use the bot guilds page to allow a guild from the live inventory.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  value={newWhitelistGuildId}
                  onChange={(event) => setNewWhitelistGuildId(event.target.value)}
                  placeholder="Guild ID"
                />
                <Input
                  value={newWhitelistGuildName}
                  onChange={(event) => setNewWhitelistGuildName(event.target.value)}
                  placeholder="Guild name"
                />
              </div>

              <Textarea
                value={newWhitelistNotes}
                onChange={(event) => setNewWhitelistNotes(event.target.value)}
                placeholder="Notes about why this guild is approved"
                rows={3}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSavingWhitelist}>
                  Add to whitelist
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Whitelisted guilds</CardTitle>
            <CardDescription>
              Review every approved guild and remove access when a server should no longer retain the bot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedWhitelistedGuilds.length === 0 ? (
              <EmptyState
                icon={ShieldEllipsis}
                title="No guilds whitelisted yet"
                description="Add your trusted guilds here so the whitelist policy is obvious and easy to manage."
              />
            ) : (
              <div className="rounded-[24px] border border-border/70 bg-muted/10 p-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guild</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedWhitelistedGuilds.map((guild) => {
                      const inBotGuilds = botGuilds.some((item) => item.guildId === guild.guildId);

                      return (
                        <TableRow key={guild.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{guild.guildName ?? guild.guildId}</p>
                              <p className="text-xs text-muted-foreground">{guild.guildId}</p>
                            </div>
                          </TableCell>
                          <TableCell>{guild.notes ?? "No notes"}</TableCell>
                          <TableCell>{formatDateTime(guild.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant={inBotGuilds ? "success" : "secondary"}>
                              {inBotGuilds ? "Bot present" : "Not currently joined"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => void handleRemoveWhitelistedGuild(guild)}
                              disabled={isSavingWhitelist}
                            >
                              <Trash2 data-icon="inline-start" />
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
