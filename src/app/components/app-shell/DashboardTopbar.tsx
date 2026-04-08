import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, MoonStar, ShieldCheck, Sparkles, SunMedium } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/app/components/ui/dropdown-menu";
import { useAuth } from "@/app/lib/auth";
import { extractGuildIdFromPath, useDashboardGuilds, useDashboardInviteLink } from "@/app/lib/dashboard";
import { getInitials } from "@/app/lib/format";
import { useTheme } from "@/app/lib/theme";
import { MobileNav } from "@/app/components/app-shell/MobileNav";

interface DashboardTopbarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

function getPageMeta(pathname: string) {
  if (pathname.includes("/admin/whitelist")) {
    return { section: "Admin", title: "Guild whitelist" };
  }

  if (pathname.includes("/admin/guilds")) {
    return { section: "Admin", title: "Bot guild inventory" };
  }

  if (pathname.includes("/admin/presence")) {
    return { section: "Admin", title: "Presence and rotation" };
  }

  if (pathname.includes("/admin/access")) {
    return { section: "Admin", title: "Admin access" };
  }

  if (pathname.includes("/setup")) {
    return { section: "Setup", title: "Guided onboarding" };
  }

  if (pathname.includes("/account")) {
    return { section: "Account", title: "Profile and access" };
  }

  if (pathname.includes("/admin")) {
    return { section: "Admin", title: "Global bot controls" };
  }

  if (pathname.includes("/streamers")) {
    return { section: "Guild", title: "Streamer management" };
  }

  if (pathname.includes("/notifications")) {
    return { section: "Guild", title: "Notification history" };
  }

  if (/^\/dashboard\/guilds\/[^/]+$/.test(pathname)) {
    return { section: "Guild", title: "Guild settings" };
  }

  return { section: "Dashboard", title: "Overview" };
}

export function DashboardTopbar({ mobileOpen, onMobileOpenChange }: DashboardTopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: guilds = [] } = useDashboardGuilds();
  const inviteLinkQuery = useDashboardInviteLink();

  const meta = getPageMeta(location.pathname);
  const selectedGuildId = extractGuildIdFromPath(location.pathname);
  const selectedGuild = useMemo(
    () => guilds.find((guild) => guild.id === selectedGuildId) ?? null,
    [guilds, selectedGuildId]
  );

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <MobileNav open={mobileOpen} onOpenChange={onMobileOpenChange} />
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <span>{meta.section}</span>
              {selectedGuild ? (
                <>
                  <ChevronRight className="size-3.5" />
                  <span className="truncate">{selectedGuild.name}</span>
                </>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                {meta.title}
              </h2>
              {selectedGuild ? (
                <Badge variant={selectedGuild.botInGuild ? "success" : "warning"}>
                  {selectedGuild.botInGuild ? "Bot ready" : "Needs invite"}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-2xl" onClick={toggleTheme}>
            {theme === "light" ? <MoonStar /> : <SunMedium />}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {inviteLinkQuery.data ? (
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <a href={inviteLinkQuery.data} target="_blank" rel="noreferrer">
                <Sparkles data-icon="inline-start" />
                Invite bot
              </a>
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 rounded-2xl px-3">
                <Avatar className="size-8 border border-border/70">
                  {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.username} /> : null}
                  <AvatarFallback>{getInitials(user?.globalName ?? user?.username)}</AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium text-foreground">
                    {user?.globalName ?? user?.username}
                  </span>
                  <span className="block text-xs text-muted-foreground">@{user?.username}</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <div className="flex flex-wrap gap-2 px-2 py-2">
                  <Badge variant="secondary">{guilds.length} guilds</Badge>
                  <Badge variant={user?.isGlobalAdmin ? "success" : "outline"}>
                    {user?.isGlobalAdmin ? "Global admin" : "Server manager"}
                  </Badge>
                </div>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/account">Open account</Link>
                </DropdownMenuItem>
                {user?.isGlobalAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/admin">
                      <ShieldCheck />
                      Global admin
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => void handleLogout()}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
