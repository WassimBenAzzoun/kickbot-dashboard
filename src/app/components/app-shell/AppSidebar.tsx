import { Link, NavLink, useLocation } from "react-router-dom";
import {
  BellRing,
  LayoutDashboard,
  MoonStar,
  Settings2,
  Sparkles,
  SunMedium,
  UserCircle2,
  UsersRound,
  Wrench
} from "lucide-react";
import { useAuth } from "@/app/lib/auth";
import { useTheme } from "@/app/lib/theme";
import {
  NormalizedGuild,
  buildGuildRoute,
  extractGuildIdFromPath,
  getDefaultGuild,
  useDashboardGuilds,
  useDashboardInviteLink
} from "@/app/lib/dashboard";
import { cn } from "@/app/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Button, buttonVariants } from "@/app/components/ui/button";
import { GuildAvatar } from "@/app/components/shared/GuildAvatar";
import { GuildSwitcher } from "@/app/components/app-shell/GuildSwitcher";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { getInitials } from "@/app/lib/format";

interface AppSidebarProps {
  onNavigate?: () => void;
}

function navItemClass(isActive: boolean) {
  return cn(
    "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
      : "border-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
  );
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  activeWhen,
  badge,
  onNavigate
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  activeWhen?: (pathname: string) => boolean;
  badge?: string;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const active = activeWhen ? activeWhen(location.pathname) : location.pathname === to;

  return (
    <NavLink to={to} className={navItemClass(active)} onClick={onNavigate}>
      <Icon />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? <Badge variant="secondary">{badge}</Badge> : null}
    </NavLink>
  );
}

function getPrimaryGuild(guilds: NormalizedGuild[], pathname: string): NormalizedGuild | null {
  const selectedGuildId = extractGuildIdFromPath(pathname);
  return guilds.find((guild) => guild.id === selectedGuildId) ?? getDefaultGuild(guilds);
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const guildsQuery = useDashboardGuilds();
  const inviteLinkQuery = useDashboardInviteLink();

  const guilds = guildsQuery.data ?? [];
  const selectedGuildId = extractGuildIdFromPath(location.pathname);
  const primaryGuild = getPrimaryGuild(guilds, location.pathname);

  return (
    <div className="flex h-full min-h-screen bg-sidebar text-sidebar-foreground">
      <div className="flex w-20 flex-col items-center gap-5 border-r border-sidebar-border px-3 py-4">
        <Link
          to="/dashboard/overview"
          className="flex size-12 items-center justify-center rounded-[20px] bg-primary text-lg font-bold text-primary-foreground shadow-sm"
          onClick={onNavigate}
        >
          KB
        </Link>
        <div className="min-h-0 flex-1 self-stretch">
          <GuildSwitcher guilds={guilds} selectedGuildId={selectedGuildId} onNavigate={onNavigate} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-2xl"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                {theme === "light" ? <MoonStar /> : <SunMedium />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {theme === "light" ? "Enable dark mode" : "Enable light mode"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink
                className={({ isActive }) =>
                  cn(
                    buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "icon" }),
                    "rounded-2xl"
                  )
                }
                to="/dashboard/account"
                onClick={onNavigate}
              >
                <UserCircle2 />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right">Account</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-4 py-4">
        <div className="space-y-1 px-2">
          <p className="font-display text-lg font-semibold text-sidebar-foreground">KickBot Console</p>
          <p className="text-sm text-muted-foreground">
            Manage stream alerts, guild setup, and delivery history.
          </p>
        </div>

        <div className="mt-5 rounded-[24px] border border-sidebar-border bg-card/80 p-4 shadow-sm">
          {primaryGuild ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <GuildAvatar
                  name={primaryGuild.name}
                  iconUrl={primaryGuild.iconUrl}
                  initials={primaryGuild.initials}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{primaryGuild.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {primaryGuild.trackedStreamerCount} tracked streamers
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={primaryGuild.botInGuild ? "success" : "warning"}>
                  {primaryGuild.botInGuild ? "Bot ready" : "Invite needed"}
                </Badge>
                <Badge variant={primaryGuild.alertChannelId ? "default" : "secondary"}>
                  {primaryGuild.alertChannelId ? "Alert channel set" : "Channel missing"}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-medium text-foreground">No guild selected yet</p>
              <p className="text-sm text-muted-foreground">
                Start by inviting the bot or choosing one of your manageable Discord servers.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex-1 space-y-6">
          <div className="space-y-2">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Workspace
            </p>
            <div className="space-y-1">
              <SidebarLink
                to="/dashboard/overview"
                label="Overview"
                icon={LayoutDashboard}
                activeWhen={(pathname) => pathname.includes("/overview")}
                onNavigate={onNavigate}
              />
              <SidebarLink
                to={primaryGuild ? buildGuildRoute(primaryGuild.id) : "/dashboard/setup"}
                label="Guild settings"
                icon={Settings2}
                activeWhen={(pathname) => /^\/dashboard\/guilds\/[^/]+$/.test(pathname)}
                onNavigate={onNavigate}
              />
              <SidebarLink
                to={primaryGuild ? buildGuildRoute(primaryGuild.id, "streamers") : "/dashboard/setup"}
                label="Streamers"
                icon={UsersRound}
                activeWhen={(pathname) => pathname.includes("/streamers")}
                badge={primaryGuild ? String(primaryGuild.trackedStreamerCount) : undefined}
                onNavigate={onNavigate}
              />
              <SidebarLink
                to={primaryGuild ? buildGuildRoute(primaryGuild.id, "notifications") : "/dashboard/setup"}
                label="Notifications"
                icon={BellRing}
                activeWhen={(pathname) => pathname.includes("/notifications")}
                onNavigate={onNavigate}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Account
            </p>
            <div className="space-y-1">
              <SidebarLink
                to="/dashboard/setup"
                label="Setup"
                icon={Sparkles}
                activeWhen={(pathname) => pathname.includes("/setup")}
                onNavigate={onNavigate}
              />
              <SidebarLink
                to="/dashboard/account"
                label="Profile"
                icon={UserCircle2}
                activeWhen={(pathname) => pathname.includes("/account")}
                onNavigate={onNavigate}
              />
              {user?.isGlobalAdmin ? (
                <SidebarLink
                  to="/dashboard/admin"
                  label="Global admin"
                  icon={Wrench}
                  activeWhen={(pathname) => pathname.includes("/admin")}
                  onNavigate={onNavigate}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-sidebar-border pt-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="size-10 rounded-2xl border border-border/70">
              {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.username} /> : null}
              <AvatarFallback className="rounded-2xl bg-primary/8 text-sm font-semibold text-primary">
                {getInitials(user?.globalName ?? user?.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{user?.globalName ?? user?.username}</p>
              <p className="truncate text-sm text-muted-foreground">@{user?.username}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 px-2">
            <Badge variant="secondary">{guilds.length} guilds</Badge>
            <Badge variant={user?.isGlobalAdmin ? "success" : "outline"}>
              {user?.isGlobalAdmin ? "Global admin" : "Server manager"}
            </Badge>
          </div>
          {inviteLinkQuery.data ? (
            <Button asChild variant="outline" className="w-full">
              <a href={inviteLinkQuery.data} target="_blank" rel="noreferrer" onClick={onNavigate}>
                Invite bot
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
