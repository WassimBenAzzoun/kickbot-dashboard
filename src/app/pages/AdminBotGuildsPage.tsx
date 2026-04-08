import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Server } from "lucide-react";
import { toast } from "sonner";
import {
  addAdminWhitelistedGuild,
  AdminBotGuild,
  AdminWhitelistedGuild,
  ApiHttpError,
  getAdminBotGuilds,
  getAdminWhitelistedGuilds,
  getAdminWhitelistEnforcement,
  leaveAdminBotGuild,
  removeAdminWhitelistedGuild,
  syncAdminBotGuilds
} from "@/app/lib/api";
import { formatDateTime, formatRelativeTime, getInitials } from "@/app/lib/format";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { GuildAvatar } from "@/app/components/shared/GuildAvatar";
import { AdminSectionNav } from "@/app/components/admin/AdminSectionNav";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/app/components/ui/table";

export function AdminBotGuildsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [botGuilds, setBotGuilds] = useState<AdminBotGuild[]>([]);
  const [whitelistedGuilds, setWhitelistedGuilds] = useState<AdminWhitelistedGuild[]>([]);
  const [whitelistEnforced, setWhitelistEnforced] = useState(false);
  const [isSavingGuilds, setIsSavingGuilds] = useState(false);
  const [isSavingWhitelist, setIsSavingWhitelist] = useState(false);

  const sortedBotGuilds = useMemo(
    () => [...botGuilds].sort((left, right) => left.guildName.localeCompare(right.guildName)),
    [botGuilds]
  );

  async function load(): Promise<void> {
    try {
      const [guildItems, whitelistItems, enforcement] = await Promise.all([
        getAdminBotGuilds(),
        getAdminWhitelistedGuilds(),
        getAdminWhitelistEnforcement()
      ]);

      setBotGuilds(guildItems);
      setWhitelistedGuilds(whitelistItems);
      setWhitelistEnforced(enforcement.enabled);
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 403) {
        toast.error("Global admin access is required.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to load bot guild inventory.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSyncBotGuilds(): Promise<void> {
    setIsSavingGuilds(true);

    try {
      const guilds = await syncAdminBotGuilds();
      setBotGuilds(guilds);
      toast.success("Bot guild list synchronized.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync bot guilds.");
    } finally {
      setIsSavingGuilds(false);
    }
  }

  async function handleLeaveBotGuild(guild: AdminBotGuild): Promise<void> {
    const confirmed = window.confirm(
      `Remove the bot from guild "${guild.guildName}" (${guild.guildId})?`
    );

    if (!confirmed) {
      return;
    }

    setIsSavingGuilds(true);

    try {
      await leaveAdminBotGuild(guild.guildId);
      await load();
      toast.success("Bot removed from guild.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove bot from guild.");
    } finally {
      setIsSavingGuilds(false);
    }
  }

  async function handleQuickWhitelistGuild(guild: AdminBotGuild): Promise<void> {
    setIsSavingWhitelist(true);

    try {
      await addAdminWhitelistedGuild({
        guildId: guild.guildId,
        guildName: guild.guildName
      });
      await load();
      toast.success(`Added ${guild.guildName} to the whitelist.`);
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
      toast.error(error instanceof Error ? error.message : "Failed to update whitelist.");
    } finally {
      setIsSavingWhitelist(false);
    }
  }

  function getWhitelistRecordForGuild(guild: AdminBotGuild): AdminWhitelistedGuild | null {
    return whitelistedGuilds.find((item) => item.guildId === guild.guildId) ?? null;
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading bot guild inventory...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Admin"
        title="Bot guilds"
        description="Inspect where the bot currently lives, see whether each guild is approved, and take action without searching through other settings."
        actions={
          <>
            <Badge variant={whitelistEnforced ? "success" : "secondary"}>
              {whitelistEnforced ? "Whitelist enforced" : "Whitelist disabled"}
            </Badge>
            <Button variant="outline" onClick={() => void handleSyncBotGuilds()} disabled={isSavingGuilds}>
              <RefreshCcw data-icon="inline-start" />
              {isSavingGuilds ? "Syncing..." : "Sync guilds"}
            </Button>
          </>
        }
      />

      <AdminSectionNav />

      <Card>
        <CardHeader>
          <CardTitle>Guild inventory</CardTitle>
          <CardDescription>
            Each guild shows live membership, alert-channel status, streamer count, and whitelist approval in one place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedBotGuilds.length === 0 ? (
            <EmptyState
              icon={Server}
              title="No bot guilds recorded"
              description="Sync the inventory once the bot is online, and this page will show current guild membership immediately."
            />
          ) : (
            <div className="rounded-[24px] border border-border/70 bg-muted/10 p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guild</TableHead>
                    <TableHead>Whitelist</TableHead>
                    <TableHead>Alert channel</TableHead>
                    <TableHead>Tracked</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBotGuilds.map((guild) => {
                    const whitelistedRecord = getWhitelistRecordForGuild(guild);
                    const isWhitelisted = Boolean(whitelistedRecord);

                    return (
                      <TableRow key={guild.guildId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <GuildAvatar
                              name={guild.guildName}
                              iconUrl={guild.iconUrl}
                              initials={getInitials(guild.guildName)}
                              className="size-10"
                            />
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{guild.guildName}</p>
                              <p className="text-xs text-muted-foreground">{guild.guildId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={isWhitelisted ? "success" : "secondary"}>
                              {isWhitelisted ? "Allowed" : "Not allowed"}
                            </Badge>
                            {whitelistEnforced && !isWhitelisted ? (
                              <p className="text-xs text-muted-foreground">
                                Will be removed when the next whitelist check runs.
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{guild.configuredAlertChannelId ?? "Not configured"}</TableCell>
                        <TableCell>{guild.trackedStreamerCount}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{formatDateTime(guild.lastSeenAt)}</p>
                            <p className="text-xs text-muted-foreground">{formatRelativeTime(guild.lastSeenAt)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {isWhitelisted && whitelistedRecord ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleRemoveWhitelistedGuild(whitelistedRecord)}
                                disabled={isSavingWhitelist}
                              >
                                Remove from whitelist
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleQuickWhitelistGuild(guild)}
                                disabled={isSavingWhitelist}
                              >
                                Allow guild
                              </Button>
                            )}

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => void handleLeaveBotGuild(guild)}
                              disabled={isSavingGuilds}
                            >
                              Leave guild
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between border-t border-border/70 pt-5">
          <p className="text-xs text-muted-foreground">
            This page is the fastest place to allow a newly invited guild or remove a guild the bot should leave.
          </p>
          <Badge variant="outline">{botGuilds.length} known guilds</Badge>
        </CardFooter>
      </Card>
    </div>
  );
}
