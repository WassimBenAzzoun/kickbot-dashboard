import { useEffect, useMemo, useState } from "react";
import { Activity, Crown, Server, ShieldEllipsis } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ApiHttpError,
  getAdminBotGuilds,
  getAdminGlobalAdmins,
  getAdminStatusMessages,
  getAdminWhitelistedGuilds,
  getAdminWhitelistEnforcement
} from "@/app/lib/api";
import { DashboardHeader } from "@/app/components/shared/DashboardHeader";
import { SummaryCard } from "@/app/components/shared/SummaryCard";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { AdminSectionNav } from "@/app/components/admin/AdminSectionNav";

export function GlobalAdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [statusCount, setStatusCount] = useState(0);
  const [globalAdminCount, setGlobalAdminCount] = useState(0);
  const [botGuildCount, setBotGuildCount] = useState(0);
  const [whitelistCount, setWhitelistCount] = useState(0);
  const [whitelistEnforced, setWhitelistEnforced] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load(): Promise<void> {
      try {
        const [statusResponse, admins, guilds, whitelistGuilds, whitelistState] = await Promise.all([
          getAdminStatusMessages(),
          getAdminGlobalAdmins(),
          getAdminBotGuilds(),
          getAdminWhitelistedGuilds(),
          getAdminWhitelistEnforcement()
        ]);

        if (!mounted) {
          return;
        }

        setStatusCount(statusResponse.items.length);
        setGlobalAdminCount(admins.length);
        setBotGuildCount(guilds.length);
        setWhitelistCount(whitelistGuilds.length);
        setWhitelistEnforced(whitelistState.enabled);
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (error instanceof ApiHttpError && error.status === 403) {
          toast.error("Global admin access is required.");
        } else {
          toast.error(error instanceof Error ? error.message : "Failed to load admin overview.");
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

  const summaryItems = useMemo(
    () => [
      {
        title: "Whitelist",
        value: whitelistCount,
        description: whitelistEnforced
          ? "Approved guilds with enforcement currently enabled."
          : "Approved guilds available when you turn enforcement on.",
        icon: ShieldEllipsis
      },
      {
        title: "Bot guilds",
        value: botGuildCount,
        description: "Servers currently recorded for the bot inventory.",
        icon: Server
      },
      {
        title: "Presence lines",
        value: statusCount,
        description: "Rotating status messages configured for the bot.",
        icon: Activity
      },
      {
        title: "Global admins",
        value: globalAdminCount,
        description: "Operators with platform-wide admin access.",
        icon: Crown
      }
    ],
    [botGuildCount, globalAdminCount, statusCount, whitelistCount, whitelistEnforced]
  );

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="Admin"
        title="Global admin hub"
        description="Each admin task has its own dedicated page now, so you can jump straight into the job you need without hunting through one giant screen."
        actions={
          <Badge variant={whitelistEnforced ? "success" : "secondary"}>
            {whitelistEnforced ? "Whitelist enforced" : "Whitelist disabled"}
          </Badge>
        }
      />

      <AdminSectionNav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => (
          <SummaryCard
            key={item.title}
            title={item.title}
            value={isLoading ? "..." : item.value}
            description={item.description}
            icon={item.icon}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recommended entry points</CardTitle>
            <CardDescription>
              Use the dedicated pages below depending on the task you’re trying to finish.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Button asChild variant="outline" className="justify-start">
              <Link to="/dashboard/admin/whitelist">Open whitelist</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/dashboard/admin/guilds">Open bot guilds</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/dashboard/admin/presence">Open presence</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/dashboard/admin/access">Open admin access</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why this changed</CardTitle>
            <CardDescription>
              The admin area is now organized around the real jobs you do most often.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Whitelist management lives on its own page so approved guilds and enforcement settings are obvious.
            </p>
            <p>
              Bot guild membership has its own inventory page so leaving or allowing a server is one step away.
            </p>
            <p>
              Presence rotation and global admin access are separated too, so each page stays focused and easier to scan.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
