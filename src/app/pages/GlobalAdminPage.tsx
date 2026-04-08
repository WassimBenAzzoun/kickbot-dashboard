import { DragEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Crown,
  GripVertical,
  LockKeyhole,
  Plus,
  RefreshCcw,
  Save,
  Server,
  ShieldAlert,
  ShieldCheck,
  ShieldEllipsis,
  Trash2,
  UserCog
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/lib/auth";
import {
  addAdminGlobalAdmin,
  addAdminWhitelistedGuild,
  AdminBotGuild,
  AdminWhitelistedGuild,
  ApiHttpError,
  BotActivityType,
  BotStatusMessage,
  createAdminStatusMessage,
  deleteAdminStatusMessage,
  getAdminBotGuilds,
  getAdminGlobalAdmins,
  getAdminGlobalConfig,
  getAdminStatusMessages,
  getAdminWhitelistedGuilds,
  getAdminWhitelistEnforcement,
  GlobalAdminUser,
  GlobalBotConfig,
  leaveAdminBotGuild,
  removeAdminGlobalAdmin,
  removeAdminWhitelistedGuild,
  reorderAdminStatusMessages,
  syncAdminBotGuilds,
  toggleAdminStatusMessage,
  updateAdminGlobalConfig,
  updateAdminStatusMessage,
  updateAdminWhitelistEnforcement
} from "@/app/lib/api";
import { formatDateTime, formatRelativeTime, getInitials } from "@/app/lib/format";
import { cn } from "@/app/lib/utils";
import { LoadingScreen } from "@/app/components/LoadingScreen";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { GuildAvatar } from "@/app/components/shared/GuildAvatar";
import { SummaryCard } from "@/app/components/shared/SummaryCard";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/app/components/ui/select";
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

interface StatusFormState {
  text: string;
  activityType: BotActivityType | "";
  isEnabled: boolean;
  usePlaceholders: boolean;
}

const DEFAULT_STATUS_FORM: StatusFormState = {
  text: "",
  activityType: "",
  isEnabled: true,
  usePlaceholders: true
};

function FieldLabel({
  htmlFor,
  children
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-5 text-muted-foreground">{children}</p>;
}

export function GlobalAdminPage() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);

  const [config, setConfig] = useState<GlobalBotConfig | null>(null);
  const [activityTypes, setActivityTypes] = useState<BotActivityType[]>([]);
  const [placeholders, setPlaceholders] = useState<string[]>([]);

  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [rotationIntervalSeconds, setRotationIntervalSeconds] = useState("60");
  const [defaultStatusEnabled, setDefaultStatusEnabled] = useState(true);
  const [defaultStatusText, setDefaultStatusText] = useState("");
  const [defaultActivityType, setDefaultActivityType] = useState<BotActivityType | "">("");

  const [statusMessages, setStatusMessages] = useState<BotStatusMessage[]>([]);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [statusForm, setStatusForm] = useState<StatusFormState>(DEFAULT_STATUS_FORM);
  const [draggedStatusId, setDraggedStatusId] = useState<string | null>(null);
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);

  const [globalAdmins, setGlobalAdmins] = useState<GlobalAdminUser[]>([]);
  const [newAdminDiscordId, setNewAdminDiscordId] = useState("");

  const [botGuilds, setBotGuilds] = useState<AdminBotGuild[]>([]);
  const [whitelistedGuilds, setWhitelistedGuilds] = useState<AdminWhitelistedGuild[]>([]);
  const [whitelistEnforced, setWhitelistEnforced] = useState(false);
  const [whitelistUpdatedAt, setWhitelistUpdatedAt] = useState<string | null>(null);
  const [newWhitelistGuildId, setNewWhitelistGuildId] = useState("");
  const [newWhitelistGuildName, setNewWhitelistGuildName] = useState("");
  const [newWhitelistNotes, setNewWhitelistNotes] = useState("");

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingAdmins, setIsSavingAdmins] = useState(false);
  const [isSavingGuilds, setIsSavingGuilds] = useState(false);
  const [isSavingWhitelist, setIsSavingWhitelist] = useState(false);
  const [isSavingWhitelistEnforcement, setIsSavingWhitelistEnforcement] = useState(false);

  const sortedStatusMessages = useMemo(
    () => [...statusMessages].sort((left, right) => left.sortOrder - right.sortOrder),
    [statusMessages]
  );

  const sortedBotGuilds = useMemo(
    () => [...botGuilds].sort((left, right) => left.guildName.localeCompare(right.guildName)),
    [botGuilds]
  );

  const sortedWhitelistedGuilds = useMemo(
    () =>
      [...whitelistedGuilds].sort((left, right) =>
        (left.guildName ?? left.guildId).localeCompare(right.guildName ?? right.guildId)
      ),
    [whitelistedGuilds]
  );

  const whitelistedGuildIds = useMemo(
    () => new Set(whitelistedGuilds.map((item) => item.guildId)),
    [whitelistedGuilds]
  );

  const summaryItems = useMemo(
    () => [
      {
        title: "Whitelist mode",
        value: whitelistEnforced ? "Enforced" : "Disabled",
        description: whitelistEnforced
          ? "Non-approved guilds are evicted automatically."
          : "The bot can stay in any guild it joins.",
        icon: whitelistEnforced ? ShieldCheck : ShieldAlert
      },
      {
        title: "Status messages",
        value: statusMessages.length,
        description: "Custom presence lines available for bot rotation.",
        icon: Activity
      },
      {
        title: "Bot guilds",
        value: botGuilds.length,
        description: "Discord servers currently recorded for the bot.",
        icon: Server
      },
      {
        title: "Global admins",
        value: globalAdmins.length,
        description: "Accounts with elevated platform-wide access.",
        icon: Crown
      }
    ],
    [botGuilds.length, globalAdmins.length, statusMessages.length, whitelistEnforced]
  );

  async function reloadWhitelistState(): Promise<void> {
    const [enforcement, guilds] = await Promise.all([
      getAdminWhitelistEnforcement(),
      getAdminWhitelistedGuilds()
    ]);

    setWhitelistEnforced(enforcement.enabled);
    setWhitelistUpdatedAt(enforcement.updatedAt);
    setWhitelistedGuilds(guilds);
  }

  async function reloadBotGuilds(): Promise<void> {
    const guilds = await getAdminBotGuilds();
    setBotGuilds(guilds);
  }

  useEffect(() => {
    let mounted = true;

    async function load(): Promise<void> {
      try {
        const [
          globalConfigResponse,
          statusResponse,
          admins,
          guilds,
          whitelistState,
          whitelistGuildItems
        ] = await Promise.all([
          getAdminGlobalConfig(),
          getAdminStatusMessages(),
          getAdminGlobalAdmins(),
          getAdminBotGuilds(),
          getAdminWhitelistEnforcement(),
          getAdminWhitelistedGuilds()
        ]);

        if (!mounted) {
          return;
        }

        setConfig(globalConfigResponse.config);
        setActivityTypes(globalConfigResponse.availableActivityTypes);
        setPlaceholders(globalConfigResponse.availablePlaceholders);
        setRotationEnabled(globalConfigResponse.config.rotationEnabled);
        setRotationIntervalSeconds(String(globalConfigResponse.config.rotationIntervalSeconds));
        setDefaultStatusEnabled(globalConfigResponse.config.defaultStatusEnabled);
        setDefaultStatusText(globalConfigResponse.config.defaultStatusText ?? "");
        setDefaultActivityType(globalConfigResponse.config.defaultActivityType ?? "");
        setStatusMessages(statusResponse.items);
        setGlobalAdmins(admins);
        setBotGuilds(guilds);
        setWhitelistEnforced(whitelistState.enabled);
        setWhitelistUpdatedAt(whitelistState.updatedAt);
        setWhitelistedGuilds(whitelistGuildItems);
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (error instanceof ApiHttpError && error.status === 403) {
          toast.error("Global admin access is required.");
        } else {
          toast.error(error instanceof Error ? error.message : "Failed to load admin data.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSaveConfig(event: FormEvent): Promise<void> {
    event.preventDefault();

    const interval = Number.parseInt(rotationIntervalSeconds, 10);
    if (Number.isNaN(interval) || interval < 5 || interval > 3600) {
      toast.error("Rotation interval must be between 5 and 3600 seconds.");
      return;
    }

    const normalizedDefaultText = defaultStatusText.trim();
    const normalizedActivityType: BotActivityType | null =
      defaultActivityType === "" ? null : defaultActivityType;

    setIsSavingConfig(true);

    try {
      const updated = await updateAdminGlobalConfig({
        rotationEnabled,
        rotationIntervalSeconds: interval,
        defaultStatusEnabled,
        defaultStatusText: normalizedDefaultText.length > 0 ? normalizedDefaultText : null,
        defaultActivityType: normalizedActivityType
      });

      setConfig(updated);
      setRotationEnabled(updated.rotationEnabled);
      setRotationIntervalSeconds(String(updated.rotationIntervalSeconds));
      setDefaultStatusEnabled(updated.defaultStatusEnabled);
      setDefaultStatusText(updated.defaultStatusText ?? "");
      setDefaultActivityType(updated.defaultActivityType ?? "");
      toast.success("Global bot config updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update global config.");
    } finally {
      setIsSavingConfig(false);
    }
  }

  function startEditStatus(message: BotStatusMessage): void {
    setEditingStatusId(message.id);
    setStatusForm({
      text: message.text,
      activityType: message.activityType,
      isEnabled: message.isEnabled,
      usePlaceholders: message.usePlaceholders
    });
  }

  function resetStatusForm(): void {
    setEditingStatusId(null);
    setStatusForm(DEFAULT_STATUS_FORM);
  }

  async function reorderStatuses(idsInOrder: string[]): Promise<void> {
    try {
      const updated = await reorderAdminStatusMessages(idsInOrder);
      setStatusMessages(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reorder statuses.");
    } finally {
      setDraggedStatusId(null);
      setDragOverStatusId(null);
    }
  }

  async function handleSubmitStatus(event: FormEvent): Promise<void> {
    event.preventDefault();

    const text = statusForm.text.trim();
    if (!text) {
      toast.error("Status text is required.");
      return;
    }

    if (!statusForm.activityType) {
      toast.error("Select an activity type.");
      return;
    }

    setIsSavingStatus(true);

    try {
      if (editingStatusId) {
        const updated = await updateAdminStatusMessage(editingStatusId, {
          text,
          activityType: statusForm.activityType,
          isEnabled: statusForm.isEnabled,
          usePlaceholders: statusForm.usePlaceholders
        });

        setStatusMessages((previous) =>
          previous.map((item) => (item.id === updated.id ? updated : item))
        );
        toast.success("Status updated.");
      } else {
        const created = await createAdminStatusMessage({
          text,
          activityType: statusForm.activityType,
          isEnabled: statusForm.isEnabled,
          usePlaceholders: statusForm.usePlaceholders
        });

        setStatusMessages((previous) => [...previous, created]);
        toast.success("Status added.");
      }

      resetStatusForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save status.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function handleToggleStatus(message: BotStatusMessage): Promise<void> {
    try {
      const updated = await toggleAdminStatusMessage(message.id, !message.isEnabled);
      setStatusMessages((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success(`Status ${updated.isEnabled ? "enabled" : "disabled"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle status.");
    }
  }

  async function handleDeleteStatus(message: BotStatusMessage): Promise<void> {
    const confirmed = window.confirm(`Delete status "${message.text}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteAdminStatusMessage(message.id);
      setStatusMessages((previous) => previous.filter((item) => item.id !== message.id));
      if (editingStatusId === message.id) {
        resetStatusForm();
      }
      toast.success("Status deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete status.");
    }
  }

  async function moveStatus(messageId: string, direction: -1 | 1): Promise<void> {
    const ordered = [...sortedStatusMessages];
    const index = ordered.findIndex((item) => item.id === messageId);
    if (index < 0) {
      return;
    }

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= ordered.length) {
      return;
    }

    const swapped = [...ordered];
    const current = swapped[index];
    swapped[index] = swapped[nextIndex];
    swapped[nextIndex] = current;

    await reorderStatuses(swapped.map((item) => item.id));
  }

  function handleStatusDragStart(event: DragEvent<HTMLButtonElement>, statusId: string): void {
    setDraggedStatusId(statusId);
    setDragOverStatusId(statusId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", statusId);
  }

  function handleStatusDragOver(event: DragEvent<HTMLTableRowElement>, statusId: string): void {
    if (!draggedStatusId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (dragOverStatusId !== statusId) {
      setDragOverStatusId(statusId);
    }
  }

  async function handleStatusDrop(
    event: DragEvent<HTMLTableRowElement>,
    targetStatusId: string
  ): Promise<void> {
    event.preventDefault();

    const sourceStatusId = draggedStatusId || event.dataTransfer.getData("text/plain");
    if (!sourceStatusId || sourceStatusId === targetStatusId) {
      setDraggedStatusId(null);
      setDragOverStatusId(null);
      return;
    }

    const ordered = [...sortedStatusMessages];
    const sourceIndex = ordered.findIndex((item) => item.id === sourceStatusId);
    const targetIndex = ordered.findIndex((item) => item.id === targetStatusId);

    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggedStatusId(null);
      setDragOverStatusId(null);
      return;
    }

    const reordered = [...ordered];
    const [draggedItem] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);

    await reorderStatuses(reordered.map((item) => item.id));
  }

  function handleStatusDragEnd(): void {
    setDraggedStatusId(null);
    setDragOverStatusId(null);
  }

  async function handleAddGlobalAdmin(event: FormEvent): Promise<void> {
    event.preventDefault();

    const discordId = newAdminDiscordId.trim();
    if (!/^\d+$/.test(discordId)) {
      toast.error("Enter a valid numeric Discord user ID.");
      return;
    }

    setIsSavingAdmins(true);

    try {
      await addAdminGlobalAdmin(discordId);
      const admins = await getAdminGlobalAdmins();
      setGlobalAdmins(admins);
      setNewAdminDiscordId("");
      toast.success("Global admin added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add global admin.");
    } finally {
      setIsSavingAdmins(false);
    }
  }

  async function handleRemoveGlobalAdmin(admin: GlobalAdminUser): Promise<void> {
    if (admin.source === "env") {
      toast.error("This global admin is managed by env and cannot be removed here.");
      return;
    }

    const confirmed = window.confirm(`Remove global admin ${admin.discordId}?`);
    if (!confirmed) {
      return;
    }

    setIsSavingAdmins(true);

    try {
      await removeAdminGlobalAdmin(admin.discordId);
      const admins = await getAdminGlobalAdmins();
      setGlobalAdmins(admins);
      toast.success("Global admin removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove global admin.");
    } finally {
      setIsSavingAdmins(false);
    }
  }

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
      setBotGuilds((previous) => previous.filter((item) => item.guildId !== guild.guildId));
      toast.success("Bot removed from guild.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove bot from guild.");
    } finally {
      setIsSavingGuilds(false);
    }
  }

  async function handleToggleWhitelistEnforcement(nextEnabled: boolean): Promise<void> {
    setIsSavingWhitelistEnforcement(true);

    try {
      const response = await updateAdminWhitelistEnforcement(nextEnabled);

      setWhitelistEnforced(response.enabled);
      setWhitelistUpdatedAt(response.updatedAt);

      await Promise.all([reloadWhitelistState(), reloadBotGuilds()]);

      if (response.enabled) {
        const checked = response.reconciliation?.checked ?? 0;
        const left = response.reconciliation?.left ?? 0;
        toast.success(`Whitelist enforcement enabled. Checked ${checked} guilds and removed ${left}.`);
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

      await reloadWhitelistState();
      setNewWhitelistGuildId("");
      setNewWhitelistGuildName("");
      setNewWhitelistNotes("");
      toast.success("Guild added to whitelist.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add guild to whitelist.");
    } finally {
      setIsSavingWhitelist(false);
    }
  }

  async function handleQuickWhitelistGuild(guild: AdminBotGuild): Promise<void> {
    setIsSavingWhitelist(true);

    try {
      await addAdminWhitelistedGuild({
        guildId: guild.guildId,
        guildName: guild.guildName
      });

      await reloadWhitelistState();
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
      await Promise.all([reloadWhitelistState(), reloadBotGuilds()]);
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

  function getWhitelistRecordForGuild(guild: AdminBotGuild): AdminWhitelistedGuild | null {
    return whitelistedGuilds.find((item) => item.guildId === guild.guildId) ?? null;
  }

  if (!user?.isGlobalAdmin) {
    return (
      <EmptyState
        icon={LockKeyhole}
        title="Global admin access required"
        description="Your account is authenticated, but it does not currently have access to the platform-wide admin workspace."
      />
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading global admin workspace..." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Platform control"
        title="Global admin workspace"
        description="Control bot presence, whitelist policy, rotating presence messages, and the global admin list from one production-ready console."
        actions={
          <>
            <Badge variant="success">Global admin</Badge>
            <Badge variant="secondary">{sortedStatusMessages.length} statuses</Badge>
            <Badge variant="secondary">{sortedWhitelistedGuilds.length} whitelisted</Badge>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => (
          <SummaryCard
            key={item.title}
            title={item.title}
            value={item.value}
            description={item.description}
            icon={item.icon}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader className="gap-3">
            <CardTitle>Rotation configuration</CardTitle>
            <CardDescription>
              Tune the global presence loop, default activity, and fallback status text used when no
              custom status rotation is active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-6 md:grid-cols-2" onSubmit={(event) => void handleSaveConfig(event)}>
              <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <FieldLabel htmlFor="rotation-enabled">Rotation enabled</FieldLabel>
                    <FieldHint>Allow the bot to cycle through your configured status messages.</FieldHint>
                  </div>
                  <Switch
                    id="rotation-enabled"
                    checked={rotationEnabled}
                    onCheckedChange={setRotationEnabled}
                    disabled={isSavingConfig}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <FieldLabel htmlFor="default-status-enabled">Default status enabled</FieldLabel>
                    <FieldHint>Fallback presence shown when no custom line should take over.</FieldHint>
                  </div>
                  <Switch
                    id="default-status-enabled"
                    checked={defaultStatusEnabled}
                    onCheckedChange={setDefaultStatusEnabled}
                    disabled={isSavingConfig}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="rotation-interval">Rotation interval (seconds)</FieldLabel>
                <Input
                  id="rotation-interval"
                  inputMode="numeric"
                  value={rotationIntervalSeconds}
                  onChange={(event) => setRotationIntervalSeconds(event.target.value)}
                  placeholder="60"
                />
                <FieldHint>Allowed range: 5 to 3600 seconds.</FieldHint>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="default-activity">Default activity type</FieldLabel>
                <Select
                  value={defaultActivityType === "" ? "__empty__" : defaultActivityType}
                  onValueChange={(value) =>
                    setDefaultActivityType(value === "__empty__" ? "" : (value as BotActivityType))
                  }
                >
                  <SelectTrigger id="default-activity">
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">No default activity</SelectItem>
                    {activityTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel htmlFor="default-status-text">Default status text</FieldLabel>
                <Input
                  id="default-status-text"
                  value={defaultStatusText}
                  onChange={(event) => setDefaultStatusText(event.target.value)}
                  placeholder="Monitoring Kick alerts"
                />
              </div>

              <div className="flex items-center justify-between gap-4 md:col-span-2">
                <FieldHint>
                  Last updated {config ? formatDateTime(config.updatedAt) : "Not available"}.
                </FieldHint>
                <Button type="submit" disabled={isSavingConfig}>
                  <Save data-icon="inline-start" />
                  {isSavingConfig ? "Saving..." : "Save config"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3">
            <CardTitle>Available placeholders</CardTitle>
            <CardDescription>
              Reuse dynamic values in status text without hardcoding counts or bot metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {placeholders.map((placeholder) => (
                <Badge key={placeholder} variant="outline">
                  {placeholder}
                </Badge>
              ))}
            </div>
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                Use these in rotating status lines or the default presence text to surface guild,
                streamer, and user metrics automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Status message rotation</CardTitle>
              <CardDescription>
                Create, reorder, enable, and maintain the bot’s rotating presence messages.
              </CardDescription>
            </div>
            <Badge variant="secondary">{sortedStatusMessages.length} saved lines</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4 rounded-[24px] border border-border/70 bg-muted/20 p-5">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  {editingStatusId ? "Edit status message" : "Add status message"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Build reusable activity lines and preserve placeholders when you want counts to stay live.
                </p>
              </div>

              <form className="space-y-4" onSubmit={(event) => void handleSubmitStatus(event)}>
                <div className="space-y-2">
                  <FieldLabel htmlFor="status-text">Status text</FieldLabel>
                  <Input
                    id="status-text"
                    value={statusForm.text}
                    onChange={(event) =>
                      setStatusForm((previous) => ({ ...previous, text: event.target.value }))
                    }
                    placeholder="Watching {trackedStreamerCount} streamers"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="status-activity-type">Activity type</FieldLabel>
                  <Select
                    value={statusForm.activityType === "" ? "__empty__" : statusForm.activityType}
                    onValueChange={(value) =>
                      setStatusForm((previous) => ({
                        ...previous,
                        activityType: value === "__empty__" ? "" : (value as BotActivityType)
                      }))
                    }
                  >
                    <SelectTrigger id="status-activity-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__empty__">Select type</SelectItem>
                      {activityTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <FieldLabel htmlFor="status-enabled">Enabled</FieldLabel>
                        <FieldHint>Keep this line active in the rotation.</FieldHint>
                      </div>
                      <Switch
                        id="status-enabled"
                        checked={statusForm.isEnabled}
                        onCheckedChange={(checked) =>
                          setStatusForm((previous) => ({ ...previous, isEnabled: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <FieldLabel htmlFor="status-placeholders">Use placeholders</FieldLabel>
                        <FieldHint>Allow dynamic guild and streamer metrics to render live.</FieldHint>
                      </div>
                      <Switch
                        id="status-placeholders"
                        checked={statusForm.usePlaceholders}
                        onCheckedChange={(checked) =>
                          setStatusForm((previous) => ({ ...previous, usePlaceholders: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  {editingStatusId ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetStatusForm}
                      disabled={isSavingStatus}
                    >
                      Cancel
                    </Button>
                  ) : null}
                  <Button type="submit" disabled={isSavingStatus}>
                    <Save data-icon="inline-start" />
                    {isSavingStatus ? "Saving..." : editingStatusId ? "Update status" : "Add status"}
                  </Button>
                </div>
              </form>
            </div>

            {sortedStatusMessages.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No status messages yet"
                description="Add your first rotating presence line to give the bot a more polished identity across every guild."
              />
            ) : (
              <div className="rounded-[24px] border border-border/70 bg-muted/10 p-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Text</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Placeholders</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStatusMessages.map((message, index) => (
                      <TableRow
                        key={message.id}
                        onDragOver={(event) => handleStatusDragOver(event, message.id)}
                        onDrop={(event) => void handleStatusDrop(event, message.id)}
                        className={cn(
                          dragOverStatusId === message.id &&
                            draggedStatusId !== message.id &&
                            "bg-muted/80"
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              draggable
                              className="size-8 cursor-grab"
                              aria-label={`Drag to reorder ${message.text}`}
                              onDragStart={(event) => handleStatusDragStart(event, message.id)}
                              onDragEnd={handleStatusDragEnd}
                            >
                              <GripVertical className="size-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground">{message.sortOrder}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{message.text}</TableCell>
                        <TableCell>{message.activityType}</TableCell>
                        <TableCell>
                          <Badge variant={message.isEnabled ? "success" : "secondary"}>
                            {message.isEnabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell>{message.usePlaceholders ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void moveStatus(message.id, -1)}
                              disabled={index === 0}
                            >
                              Up
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void moveStatus(message.id, 1)}
                              disabled={index === sortedStatusMessages.length - 1}
                            >
                              Down
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => startEditStatus(message)}>
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleToggleStatus(message)}
                            >
                              {message.isEnabled ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => void handleDeleteStatus(message)}
                            >
                              <Trash2 data-icon="inline-start" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Guild whitelist policy</CardTitle>
                <CardDescription>
                  Keep stream alerts untouched while deciding which guilds the bot is allowed to stay in.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={whitelistEnforced ? "success" : "secondary"}>
                  {whitelistEnforced ? "Enforced" : "Disabled"}
                </Badge>
                <Badge variant="outline">
                  Updated {whitelistUpdatedAt ? formatDateTime(whitelistUpdatedAt) : "never"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[24px] border border-border/70 bg-muted/20 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <FieldLabel htmlFor="whitelist-enforcement">Auto-leave non-whitelisted guilds</FieldLabel>
                  <FieldHint>
                    When enabled, the bot leaves unapproved guilds during joins and reconciliation.
                  </FieldHint>
                </div>
                <Switch
                  id="whitelist-enforcement"
                  checked={whitelistEnforced}
                  onCheckedChange={(checked) => void handleToggleWhitelistEnforcement(checked)}
                  disabled={isSavingWhitelistEnforcement}
                />
              </div>
            </div>

            <form className="space-y-4 rounded-[24px] border border-border/70 bg-muted/10 p-5" onSubmit={(event) => void handleAddWhitelistedGuild(event)}>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Add whitelisted guild</h3>
                <p className="text-sm text-muted-foreground">
                  Enter a guild ID directly or use quick allow actions from the active bot guild list.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel htmlFor="whitelist-guild-id">Guild ID</FieldLabel>
                  <Input
                    id="whitelist-guild-id"
                    value={newWhitelistGuildId}
                    onChange={(event) => setNewWhitelistGuildId(event.target.value)}
                    placeholder="123456789012345678"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="whitelist-guild-name">Guild name</FieldLabel>
                  <Input
                    id="whitelist-guild-name"
                    value={newWhitelistGuildName}
                    onChange={(event) => setNewWhitelistGuildName(event.target.value)}
                    placeholder="Streamer HQ"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="whitelist-guild-notes">Notes</FieldLabel>
                <Textarea
                  id="whitelist-guild-notes"
                  value={newWhitelistNotes}
                  onChange={(event) => setNewWhitelistNotes(event.target.value)}
                  placeholder="Primary production guild, partner community, or managed test server."
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSavingWhitelist}>
                  <Plus data-icon="inline-start" />
                  {isSavingWhitelist ? "Adding..." : "Add to whitelist"}
                </Button>
              </div>
            </form>

            {sortedWhitelistedGuilds.length === 0 ? (
              <EmptyState
                icon={ShieldEllipsis}
                title="No guilds whitelisted yet"
                description="Add the guilds you trust, then enable enforcement whenever you want the bot to stay inside that approved set only."
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

        <Card>
          <CardHeader className="gap-3">
            <CardTitle>Global admins</CardTitle>
            <CardDescription>
              Add or remove platform-wide admin access without touching the env-managed list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void handleAddGlobalAdmin(event)}>
              <Input
                value={newAdminDiscordId}
                onChange={(event) => setNewAdminDiscordId(event.target.value)}
                placeholder="Discord user ID"
              />
              <Button type="submit" disabled={isSavingAdmins}>
                <UserCog data-icon="inline-start" />
                Add admin
              </Button>
            </form>

            {globalAdmins.length === 0 ? (
              <EmptyState
                icon={Crown}
                title="No global admins configured"
                description="Add trusted operator accounts here or manage them through the environment variable when you need immutable bootstrap access."
              />
            ) : (
              <div className="space-y-3">
                {globalAdmins.map((admin) => (
                  <div
                    key={admin.discordId}
                    className="flex flex-col gap-4 rounded-[24px] border border-border/70 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{admin.discordId}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={admin.source === "env" ? "outline" : "secondary"}>
                          {admin.source === "env" ? "Env-managed" : "Database"}
                        </Badge>
                        {admin.discordId === user?.id ? <Badge variant="success">Current user</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {admin.createdAt ? `Added ${formatDateTime(admin.createdAt)}` : "Provisioned outside the dashboard"}
                      </p>
                    </div>

                    {admin.discordId === user?.id ? (
                      <Badge variant="outline">Protected</Badge>
                    ) : admin.source === "env" ? (
                      <Badge variant="outline">Managed in env</Badge>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleRemoveGlobalAdmin(admin)}
                        disabled={isSavingAdmins}
                      >
                        <Trash2 data-icon="inline-start" />
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Bot guild inventory</CardTitle>
              <CardDescription>
                Review every guild the bot currently knows about, see whether it is approved, and take action immediately.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => void handleSyncBotGuilds()} disabled={isSavingGuilds}>
              <RefreshCcw data-icon="inline-start" />
              {isSavingGuilds ? "Syncing..." : "Sync guilds"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedBotGuilds.length === 0 ? (
            <EmptyState
              icon={Server}
              title="No bot guilds recorded"
              description="Sync the guild inventory once the bot is online, and this list will show live Discord server membership and approval status."
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
          <FieldHint>
            Use quick allow actions here when a trusted guild invites the bot and you want to keep it
            before turning whitelist enforcement on.
          </FieldHint>
          <Badge variant="outline">{botGuilds.length} known guilds</Badge>
        </CardFooter>
      </Card>
    </div>
  );
}
