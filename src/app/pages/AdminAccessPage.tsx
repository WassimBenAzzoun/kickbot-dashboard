import { FormEvent, useEffect, useState } from "react";
import { Crown, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import {
  addAdminGlobalAdmin,
  ApiHttpError,
  getAdminGlobalAdmins,
  GlobalAdminUser,
  removeAdminGlobalAdmin
} from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth";
import { formatDateTime } from "@/app/lib/format";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { AdminSectionNav } from "@/app/components/admin/AdminSectionNav";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";

export function AdminAccessPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [admins, setAdmins] = useState<GlobalAdminUser[]>([]);
  const [newAdminDiscordId, setNewAdminDiscordId] = useState("");
  const [isSavingAdmins, setIsSavingAdmins] = useState(false);

  async function load(): Promise<void> {
    try {
      const items = await getAdminGlobalAdmins();
      setAdmins(items);
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 403) {
        toast.error("Global admin access is required.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to load admin access.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

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
      setNewAdminDiscordId("");
      await load();
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
      await load();
      toast.success("Global admin removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove global admin.");
    } finally {
      setIsSavingAdmins(false);
    }
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading admin access...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Admin"
        title="Admin access"
        description="Manage the list of platform-wide operators without digging through unrelated settings."
        actions={<Badge variant="secondary">{admins.length} admins</Badge>}
      />

      <AdminSectionNav />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Add global admin</CardTitle>
            <CardDescription>
              Grant dashboard-wide admin access to a trusted Discord user by ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void handleAddGlobalAdmin(event)}>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current global admins</CardTitle>
            <CardDescription>
              Env-managed admins stay visible here, but can only be changed from your server environment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <EmptyState
                icon={Crown}
                title="No global admins configured"
                description="Add trusted operators here or bootstrap immutable admins through the environment variable."
              />
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
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
    </div>
  );
}
