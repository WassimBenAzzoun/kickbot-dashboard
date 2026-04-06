import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import {
  addAdminGlobalAdmin,
  AdminBotGuild,
  ApiHttpError,
  BotActivityType,
  BotStatusMessage,
  createAdminStatusMessage,
  deleteAdminStatusMessage,
  getAdminBotGuilds,
  getAdminGlobalAdmins,
  getAdminGlobalConfig,
  getAdminStatusMessages,
  GlobalAdminUser,
  GlobalBotConfig,
  leaveAdminBotGuild,
  removeAdminGlobalAdmin,
  reorderAdminStatusMessages,
  syncAdminBotGuilds,
  toggleAdminStatusMessage,
  updateAdminGlobalConfig,
  updateAdminStatusMessage
} from "../lib/api";
import { LoadingScreen } from "../components/LoadingScreen";

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

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingAdmins, setIsSavingAdmins] = useState(false);
  const [isSavingGuilds, setIsSavingGuilds] = useState(false);

  const sortedStatusMessages = useMemo(
    () => [...statusMessages].sort((a, b) => a.sortOrder - b.sortOrder),
    [statusMessages]
  );

  const sortedBotGuilds = useMemo(
    () => [...botGuilds].sort((a, b) => a.guildName.localeCompare(b.guildName)),
    [botGuilds]
  );

  useEffect(() => {
    let mounted = true;

    async function load(): Promise<void> {
      try {
        const [globalConfigResponse, statusResponse, admins, guilds] = await Promise.all([
          getAdminGlobalConfig(),
          getAdminStatusMessages(),
          getAdminGlobalAdmins(),
          getAdminBotGuilds()
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
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (error instanceof ApiHttpError && error.status === 403) {
          toast.error("Global admin access is required");
        } else {
          toast.error(error instanceof Error ? error.message : "Failed to load admin data");
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
      toast.error("Rotation interval must be between 5 and 3600 seconds");
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
      toast.success("Global config updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update global config");
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
      toast.error(error instanceof Error ? error.message : "Failed to reorder statuses");
    } finally {
      setDraggedStatusId(null);
      setDragOverStatusId(null);
    }
  }

  async function handleSubmitStatus(event: FormEvent): Promise<void> {
    event.preventDefault();

    const text = statusForm.text.trim();
    if (!text) {
      toast.error("Status text is required");
      return;
    }

    if (!statusForm.activityType) {
      toast.error("Select an activity type");
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
        toast.success("Status updated");
      } else {
        const created = await createAdminStatusMessage({
          text,
          activityType: statusForm.activityType,
          isEnabled: statusForm.isEnabled,
          usePlaceholders: statusForm.usePlaceholders
        });

        setStatusMessages((previous) => [...previous, created]);
        toast.success("Status added");
      }

      resetStatusForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save status");
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
      toast.success(`Status ${updated.isEnabled ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle status");
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
      toast.success("Status deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete status");
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
      toast.error("Enter a valid numeric Discord user ID");
      return;
    }

    setIsSavingAdmins(true);

    try {
      await addAdminGlobalAdmin(discordId);
      const admins = await getAdminGlobalAdmins();
      setGlobalAdmins(admins);
      setNewAdminDiscordId("");
      toast.success("Global admin added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add global admin");
    } finally {
      setIsSavingAdmins(false);
    }
  }

  async function handleRemoveGlobalAdmin(admin: GlobalAdminUser): Promise<void> {
    if (admin.source === "env") {
      toast.error("This global admin is managed by env and cannot be removed here");
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
      toast.success("Global admin removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove global admin");
    } finally {
      setIsSavingAdmins(false);
    }
  }

  async function handleSyncBotGuilds(): Promise<void> {
    setIsSavingGuilds(true);

    try {
      const guilds = await syncAdminBotGuilds();
      setBotGuilds(guilds);
      toast.success("Bot guild list synchronized");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync bot guilds");
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
      toast.success("Bot removed from guild");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove bot from guild");
    } finally {
      setIsSavingGuilds(false);
    }
  }

  if (!user?.isGlobalAdmin) {
    return (
      <main className="page stack">
        <section className="card stack">
          <h1 style={{ margin: 0 }}>Global Admin Required</h1>
          <p className="muted" style={{ margin: 0 }}>
            Your account is authenticated but does not have global admin access.
          </p>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading global admin settings..." />;
  }

  return (
    <main className="page stack">
      <section className="card row between">
        <div>
          <h1 style={{ margin: 0 }}>Global Bot Settings</h1>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Manage rotating status, global admins, and active bot servers.
          </p>
        </div>
        <div className="row">
          <span className="badge badge-success">Global Admin</span>
          <span className="badge badge-muted">{statusMessages.length} statuses</span>
          <span className="badge badge-muted">{sortedBotGuilds.length} bot guilds</span>
        </div>
      </section>

      <section className="grid cols-2">
        <article className="card stack">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Rotation Configuration</h2>

          <form className="stack" onSubmit={(event) => void handleSaveConfig(event)}>
            <label className="row between">
              <span>Rotation enabled</span>
              <input
                type="checkbox"
                checked={rotationEnabled}
                onChange={(event) => setRotationEnabled(event.target.checked)}
              />
            </label>

            <label className="stack" style={{ gap: "0.35rem" }}>
              <span className="muted" style={{ fontSize: "0.85rem" }}>
                Rotation interval (seconds)
              </span>
              <input
                className="input"
                value={rotationIntervalSeconds}
                onChange={(event) => setRotationIntervalSeconds(event.target.value)}
              />
            </label>

            <label className="row between">
              <span>Default status enabled</span>
              <input
                type="checkbox"
                checked={defaultStatusEnabled}
                onChange={(event) => setDefaultStatusEnabled(event.target.checked)}
              />
            </label>

            <label className="stack" style={{ gap: "0.35rem" }}>
              <span className="muted" style={{ fontSize: "0.85rem" }}>Default activity type</span>
              <select
                className="input"
                value={defaultActivityType}
                onChange={(event) =>
                  setDefaultActivityType((event.target.value || "") as BotActivityType | "")
                }
              >
                <option value="">Select type...</option>
                {activityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="stack" style={{ gap: "0.35rem" }}>
              <span className="muted" style={{ fontSize: "0.85rem" }}>Default status text</span>
              <input
                className="input"
                value={defaultStatusText}
                onChange={(event) => setDefaultStatusText(event.target.value)}
                placeholder="Monitoring Kick alerts"
              />
            </label>

            <div className="row between">
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                Updated: {config ? new Date(config.updatedAt).toLocaleString() : "N/A"}
              </span>
              <button className="btn btn-primary" type="submit" disabled={isSavingConfig}>
                {isSavingConfig ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </article>

        <article className="card stack">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Available Placeholders</h2>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Use these variables in status text.
          </p>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {placeholders.map((placeholder) => (
              <span className="badge badge-muted" key={placeholder}>
                {placeholder}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>
          {editingStatusId ? "Edit Status Message" : "Add Status Message"}
        </h2>
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          Drag the grip handle in the order column to reorder status messages with the mouse.
        </p>

        <form className="grid cols-2" onSubmit={(event) => void handleSubmitStatus(event)}>
          <label className="stack" style={{ gap: "0.35rem" }}>
            <span className="muted" style={{ fontSize: "0.85rem" }}>Status text</span>
            <input
              className="input"
              value={statusForm.text}
              onChange={(event) =>
                setStatusForm((previous) => ({ ...previous, text: event.target.value }))
              }
              placeholder="Watching {trackedStreamerCount} streamers"
            />
          </label>

          <label className="stack" style={{ gap: "0.35rem" }}>
            <span className="muted" style={{ fontSize: "0.85rem" }}>Activity type</span>
            <select
              className="input"
              value={statusForm.activityType}
              onChange={(event) =>
                setStatusForm((previous) => ({
                  ...previous,
                  activityType: (event.target.value || "") as BotActivityType | ""
                }))
              }
            >
              <option value="">Select type...</option>
              {activityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="row between">
            <span>Enabled</span>
            <input
              type="checkbox"
              checked={statusForm.isEnabled}
              onChange={(event) =>
                setStatusForm((previous) => ({ ...previous, isEnabled: event.target.checked }))
              }
            />
          </label>

          <label className="row between">
            <span>Use placeholders</span>
            <input
              type="checkbox"
              checked={statusForm.usePlaceholders}
              onChange={(event) =>
                setStatusForm((previous) => ({
                  ...previous,
                  usePlaceholders: event.target.checked
                }))
              }
            />
          </label>

          <div className="row" style={{ justifyContent: "flex-end", gridColumn: "1 / -1" }}>
            {editingStatusId ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetStatusForm}
                disabled={isSavingStatus}
              >
                Cancel Edit
              </button>
            ) : null}
            <button className="btn btn-primary" type="submit" disabled={isSavingStatus}>
              {isSavingStatus ? "Saving..." : editingStatusId ? "Update" : "Add Status"}
            </button>
          </div>
        </form>

        {sortedStatusMessages.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No status messages configured yet.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Text</th>
                <th>Type</th>
                <th>Enabled</th>
                <th>Placeholders</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedStatusMessages.map((message, index) => (
                <tr
                  key={message.id}
                  onDragOver={(event) => handleStatusDragOver(event, message.id)}
                  onDrop={(event) => void handleStatusDrop(event, message.id)}
                  style={{
                    backgroundColor:
                      dragOverStatusId === message.id && draggedStatusId !== message.id
                        ? "hsl(var(--secondary))"
                        : undefined
                  }}
                >
                  <td>
                    <div className="row" style={{ gap: "0.5rem" }}>
                      <button
                        type="button"
                        draggable
                        className="btn btn-secondary"
                        aria-label={`Drag to reorder ${message.text}`}
                        onDragStart={(event) => handleStatusDragStart(event, message.id)}
                        onDragEnd={handleStatusDragEnd}
                        style={{ padding: "0.45rem", cursor: "grab" }}
                      >
                        <GripVertical size={16} />
                      </button>
                      <span>{message.sortOrder}</span>
                    </div>
                  </td>
                  <td>{message.text}</td>
                  <td>{message.activityType}</td>
                  <td>
                    <span className={`badge ${message.isEnabled ? "badge-success" : "badge-muted"}`}>
                      {message.isEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td>{message.usePlaceholders ? "Yes" : "No"}</td>
                  <td>
                    <div className="row" style={{ flexWrap: "wrap" }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => void moveStatus(message.id, -1)}
                        disabled={index === 0}
                      >
                        Up
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => void moveStatus(message.id, 1)}
                        disabled={index === sortedStatusMessages.length - 1}
                      >
                        Down
                      </button>
                      <button className="btn btn-secondary" onClick={() => startEditStatus(message)}>
                        Edit
                      </button>
                      <button className="btn btn-secondary" onClick={() => void handleToggleStatus(message)}>
                        {message.isEnabled ? "Disable" : "Enable"}
                      </button>
                      <button className="btn btn-danger" onClick={() => void handleDeleteStatus(message)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="grid cols-2">
        <article className="card stack">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Global Admin Users</h2>

          <form className="row" onSubmit={(event) => void handleAddGlobalAdmin(event)}>
            <input
              className="input"
              value={newAdminDiscordId}
              onChange={(event) => setNewAdminDiscordId(event.target.value)}
              placeholder="Discord user ID"
            />
            <button className="btn btn-primary" type="submit" disabled={isSavingAdmins}>
              Add
            </button>
          </form>

          {globalAdmins.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>No global admins configured.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Discord ID</th>
                  <th>Source</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {globalAdmins.map((admin) => (
                  <tr key={admin.discordId}>
                    <td>{admin.discordId}</td>
                    <td>{admin.source}</td>
                    <td>{admin.createdAt ? new Date(admin.createdAt).toLocaleString() : "-"}</td>
                    <td>
                      {admin.discordId === user?.id ? (
                        <span className="muted">Current user</span>
                      ) : admin.source === "env" ? (
                        <span className="muted">Managed in env</span>
                      ) : (
                        <button
                          className="btn btn-danger"
                          onClick={() => void handleRemoveGlobalAdmin(admin)}
                          disabled={isSavingAdmins}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>

        <article className="card stack">
          <div className="row between">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Bot Servers</h2>
            <button
              className="btn btn-secondary"
              onClick={() => void handleSyncBotGuilds()}
              disabled={isSavingGuilds}
            >
              {isSavingGuilds ? "Syncing..." : "Sync"}
            </button>
          </div>

          {sortedBotGuilds.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Bot is not recorded in any guild yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Guild</th>
                  <th>Alert Channel</th>
                  <th>Tracked</th>
                  <th>Last Seen</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedBotGuilds.map((guild) => (
                  <tr key={guild.guildId}>
                    <td>
                      <strong>{guild.guildName}</strong>
                      <div className="muted" style={{ fontSize: "0.8rem" }}>{guild.guildId}</div>
                    </td>
                    <td>{guild.configuredAlertChannelId ?? "Not configured"}</td>
                    <td>{guild.trackedStreamerCount}</td>
                    <td>{new Date(guild.lastSeenAt).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        onClick={() => void handleLeaveBotGuild(guild)}
                        disabled={isSavingGuilds}
                      >
                        Leave
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </section>
    </main>
  );
}
