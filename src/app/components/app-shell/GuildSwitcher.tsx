import { NavLink } from "react-router-dom";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { GuildAvatar } from "@/app/components/shared/GuildAvatar";
import { NormalizedGuild, buildGuildRoute } from "@/app/lib/dashboard";
import { cn } from "@/app/lib/utils";

interface GuildSwitcherProps {
  guilds: NormalizedGuild[];
  selectedGuildId: string | null;
  onNavigate?: () => void;
}

export function GuildSwitcher({ guilds, selectedGuildId, onNavigate }: GuildSwitcherProps) {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col items-center gap-3 pr-1">
        {guilds.map((guild) => {
          const active = guild.id === selectedGuildId;

          return (
            <Tooltip key={guild.id}>
              <TooltipTrigger asChild>
                <NavLink
                  to={buildGuildRoute(guild.id)}
                  onClick={onNavigate}
                  className={cn(
                    "group relative rounded-[22px] p-1.5 transition-transform hover:-translate-y-0.5",
                    active ? "bg-primary/10" : "bg-transparent hover:bg-sidebar-accent"
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-y-2 -left-1.5 w-1 rounded-full bg-primary transition-opacity",
                      active ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <GuildAvatar
                    name={guild.name}
                    iconUrl={guild.iconUrl}
                    initials={guild.initials}
                    className={cn(
                      "size-12 border-transparent shadow-sm transition-all group-hover:shadow-md",
                      active ? "ring-2 ring-primary/70 ring-offset-2 ring-offset-sidebar" : ""
                    )}
                  />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                {guild.name}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </ScrollArea>
  );
}
