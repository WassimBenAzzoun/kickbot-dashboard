import { FormEvent, useState } from "react";
import { Music2, UserPlus, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addAdminInstantAllowedUser,
  getAdminInstantAllowedUsers,
  getAdminInstantSettings,
  removeAdminInstantAllowedUser,
  updateAdminInstantSettings,
  type InstantAccessMode
} from "@/app/lib/api";
import { AdminSectionNav } from "@/app/components/admin/AdminSectionNav";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
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
import { Switch } from "@/app/components/ui/switch";
import { getInitials } from "@/app/lib/format";

const settingsKey = ["admin", "instants", "settings"] as const;
const allowedUsersKey = ["admin", "instants", "allowed-users"] as const;

export function AdminInstantsPage() {
  const queryClient = useQueryClient();
  const [discordId, setDiscordId] = useState("");
  const settings = useQuery({
    queryKey: settingsKey,
    queryFn: getAdminInstantSettings
  });
  const allowedUsers = useQuery({
    queryKey: allowedUsersKey,
    queryFn: getAdminInstantAllowedUsers
  });
  const settingsMutation = useMutation({
    mutationFn: updateAdminInstantSettings,
    onSuccess: (value) => {
      queryClient.setQueryData(settingsKey, value);
      toast.success("Instant settings updated.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update settings.")
  });
  const addMutation = useMutation({
    mutationFn: addAdminInstantAllowedUser,
    onSuccess: async () => {
      setDiscordId("");
      await queryClient.invalidateQueries({ queryKey: allowedUsersKey });
      toast.success("User added to the instant allowlist.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not add user.")
  });
  const removeMutation = useMutation({
    mutationFn: removeAdminInstantAllowedUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: allowedUsersKey });
      toast.success("User removed from the instant allowlist.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not remove user.")
  });

  function submitUser(event: FormEvent) {
    event.preventDefault();
    const value = discordId.trim();
    if (!/^\d{17,20}$/.test(value)) return toast.error("Enter a valid Discord user ID.");
    addMutation.mutate(value);
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Admin"
        title="Discord Instants"
        description="Control the global voice-sound feature and who may play sounds."
        actions={
          <Badge variant={settings.data?.enabled ? "success" : "secondary"}>
            {settings.data?.enabled ? "Enabled" : "Disabled"}
          </Badge>
        }
      />
      <AdminSectionNav />
      <Card>
        <CardHeader>
          <CardTitle>Global controls</CardTitle>
          <CardDescription>
            The feature deploys disabled. Turning it off immediately clears queues and disconnects
            voice sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 p-4">
            <div>
              <p className="font-medium">Enable Instants</p>
              <p className="text-sm text-muted-foreground">
                Allow dashboard and Discord command playback.
              </p>
            </div>
            <Switch
              checked={settings.data?.enabled ?? false}
              disabled={!settings.data || settingsMutation.isPending}
              onCheckedChange={(enabled) => settingsMutation.mutate({ enabled })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instant-access-mode">Playback access</Label>
            <Select
              value={settings.data?.accessMode}
              disabled={!settings.data || settingsMutation.isPending}
              onValueChange={(accessMode) =>
                settingsMutation.mutate({
                  accessMode: accessMode as InstantAccessMode
                })
              }
            >
              <SelectTrigger id="instant-access-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EVERYONE">Everyone</SelectItem>
                <SelectItem value="ALLOWLIST_ONLY">Allowed users only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Global admins always bypass the user allowlist.
            </p>
          </div>
        </CardContent>
      </Card>
      {settings.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Operational limits</CardTitle>
            <CardDescription>
              Fixed safety limits for Heroku’s process-local voice runtime.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Sound duration", `${settings.data.limits.maxDurationSeconds}s`],
              ["Audio size", `${Math.round(settings.data.limits.maxAudioBytes / 1024 / 1024)} MB`],
              ["Queue length", settings.data.limits.maxQueueLength],
              ["Cooldown", `${settings.data.limits.userCooldownSeconds}s`],
              ["Active guilds", settings.data.limits.maxActiveGuilds],
              ["Idle disconnect", `${settings.data.limits.idleDisconnectSeconds}s`]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-muted/60 p-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Allowed users</CardTitle>
          <CardDescription>
            Used only in “Allowed users only” mode. Profiles are resolved from Discord when added.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex gap-2" onSubmit={submitUser}>
            <Input
              aria-label="Discord user ID"
              value={discordId}
              onChange={(event) => setDiscordId(event.target.value)}
              placeholder="Discord user ID"
            />
            <Button type="submit" disabled={addMutation.isPending}>
              <UserPlus />
              Add user
            </Button>
          </form>
          <div className="grid gap-3 md:grid-cols-2">
            {(allowedUsers.data ?? []).map((user) => (
              <div
                key={user.discordId}
                className="flex items-center gap-3 rounded-2xl border border-border/70 p-3"
              >
                <Avatar>
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback>{getInitials(user.globalName ?? user.username)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {user.globalName ?? user.username ?? user.discordId}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {user.username ? `@${user.username} · ` : ""}
                    {user.discordId}
                  </p>
                </div>
                <Button
                  aria-label={`Remove ${user.username ?? user.discordId}`}
                  variant="ghost"
                  size="icon"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(user.discordId)}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
          {allowedUsers.data?.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <Music2 className="mx-auto mb-2" />
              No users are currently allowed.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
