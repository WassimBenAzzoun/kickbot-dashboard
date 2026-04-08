import { DragEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Activity, GripVertical, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  ApiHttpError,
  BotActivityType,
  BotStatusMessage,
  createAdminStatusMessage,
  deleteAdminStatusMessage,
  getAdminGlobalConfig,
  getAdminStatusMessages,
  GlobalBotConfig,
  reorderAdminStatusMessages,
  toggleAdminStatusMessage,
  updateAdminGlobalConfig,
  updateAdminStatusMessage
} from "@/app/lib/api";
import { formatDateTime } from "@/app/lib/format";
import { cn } from "@/app/lib/utils";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { SummaryCard } from "@/app/components/shared/SummaryCard";
import { AdminSectionNav } from "@/app/components/admin/AdminSectionNav";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
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

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-5 text-muted-foreground">{children}</p>;
}

export function AdminPresencePage() {
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
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const sortedStatusMessages = useMemo(
    () => [...statusMessages].sort((left, right) => left.sortOrder - right.sortOrder),
    [statusMessages]
  );

  async function load(): Promise<void> {
    try {
      const [globalConfigResponse, statusResponse] = await Promise.all([
        getAdminGlobalConfig(),
        getAdminStatusMessages()
      ]);

      setConfig(globalConfigResponse.config);
      setActivityTypes(globalConfigResponse.availableActivityTypes);
      setPlaceholders(globalConfigResponse.availablePlaceholders);
      setRotationEnabled(globalConfigResponse.config.rotationEnabled);
      setRotationIntervalSeconds(String(globalConfigResponse.config.rotationIntervalSeconds));
      setDefaultStatusEnabled(globalConfigResponse.config.defaultStatusEnabled);
      setDefaultStatusText(globalConfigResponse.config.defaultStatusText ?? "");
      setDefaultActivityType(globalConfigResponse.config.defaultActivityType ?? "");
      setStatusMessages(statusResponse.items);
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 403) {
        toast.error("Global admin access is required.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to load presence settings.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
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

  function resetStatusForm(): void {
    setEditingStatusId(null);
    setStatusForm(DEFAULT_STATUS_FORM);
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

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading bot presence settings...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Admin"
        title="Presence and rotation"
        description="Handle bot presence settings on a dedicated page so status rotation never gets lost among unrelated admin controls."
        actions={<Badge variant="secondary">{sortedStatusMessages.length} statuses</Badge>}
      />

      <AdminSectionNav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Rotation"
          value={rotationEnabled ? "Enabled" : "Disabled"}
          description="Whether custom status messages cycle automatically."
          icon={Activity}
        />
        <SummaryCard
          title="Interval"
          value={`${rotationIntervalSeconds}s`}
          description="Time between rotating to the next status line."
          icon={Activity}
        />
        <SummaryCard
          title="Default status"
          value={defaultStatusEnabled ? "Enabled" : "Disabled"}
          description="Fallback presence when no custom line should be shown."
          icon={Activity}
        />
        <SummaryCard
          title="Placeholders"
          value={placeholders.length}
          description="Dynamic variables available inside presence text."
          icon={Activity}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Rotation configuration</CardTitle>
            <CardDescription>
              Update the global presence loop and default fallback text in one focused place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-6 md:grid-cols-2" onSubmit={(event) => void handleSaveConfig(event)}>
              <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <FieldLabel>Rotation enabled</FieldLabel>
                    <FieldHint>Allow the bot to cycle through your configured status messages.</FieldHint>
                  </div>
                  <Switch checked={rotationEnabled} onCheckedChange={setRotationEnabled} />
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <FieldLabel>Default status enabled</FieldLabel>
                    <FieldHint>Fallback presence shown when no custom line should take over.</FieldHint>
                  </div>
                  <Switch checked={defaultStatusEnabled} onCheckedChange={setDefaultStatusEnabled} />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel>Rotation interval (seconds)</FieldLabel>
                <Input
                  inputMode="numeric"
                  value={rotationIntervalSeconds}
                  onChange={(event) => setRotationIntervalSeconds(event.target.value)}
                  placeholder="60"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>Default activity type</FieldLabel>
                <Select
                  value={defaultActivityType === "" ? "__empty__" : defaultActivityType}
                  onValueChange={(value) =>
                    setDefaultActivityType(value === "__empty__" ? "" : (value as BotActivityType))
                  }
                >
                  <SelectTrigger>
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
                <FieldLabel>Default status text</FieldLabel>
                <Input
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
          <CardHeader>
            <CardTitle>Available placeholders</CardTitle>
            <CardDescription>
              Keep dynamic metrics easy to reuse when you write bot presence lines.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {placeholders.map((placeholder) => (
              <Badge key={placeholder} variant="outline">
                {placeholder}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status messages</CardTitle>
          <CardDescription>
            Create and maintain rotating status lines on a page dedicated entirely to bot presence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4 rounded-[24px] border border-border/70 bg-muted/20 p-5">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  {editingStatusId ? "Edit status message" : "Add status message"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Build reusable activity lines and preserve placeholders when counts should stay live.
                </p>
              </div>

              <form className="space-y-4" onSubmit={(event) => void handleSubmitStatus(event)}>
                <div className="space-y-2">
                  <FieldLabel>Status text</FieldLabel>
                  <Input
                    value={statusForm.text}
                    onChange={(event) =>
                      setStatusForm((previous) => ({ ...previous, text: event.target.value }))
                    }
                    placeholder="Watching {trackedStreamerCount} streamers"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>Activity type</FieldLabel>
                  <Select
                    value={statusForm.activityType === "" ? "__empty__" : statusForm.activityType}
                    onValueChange={(value) =>
                      setStatusForm((previous) => ({
                        ...previous,
                        activityType: value === "__empty__" ? "" : (value as BotActivityType)
                      }))
                    }
                  >
                    <SelectTrigger>
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
                        <FieldLabel>Enabled</FieldLabel>
                        <FieldHint>Keep this line active in the rotation.</FieldHint>
                      </div>
                      <Switch
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
                        <FieldLabel>Use placeholders</FieldLabel>
                        <FieldHint>Allow dynamic guild and streamer metrics to render live.</FieldHint>
                      </div>
                      <Switch
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
                    <Button type="button" variant="outline" onClick={resetStatusForm} disabled={isSavingStatus}>
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
                              onDragEnd={() => {
                                setDraggedStatusId(null);
                                setDragOverStatusId(null);
                              }}
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
                            <Button variant="outline" size="sm" onClick={() => void handleToggleStatus(message)}>
                              {message.isEnabled ? "Disable" : "Enable"}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => void handleDeleteStatus(message)}>
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
    </div>
  );
}
