import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { cn } from "@/app/lib/utils";

interface GuildAvatarProps {
  name: string;
  iconUrl: string | null;
  initials: string;
  className?: string;
  fallbackClassName?: string;
}

export function GuildAvatar({
  name,
  iconUrl,
  initials,
  className,
  fallbackClassName
}: GuildAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [iconUrl]);

  return (
    <Avatar className={cn("size-11 rounded-2xl border border-border/70", className)}>
      {iconUrl && !hasImageError ? (
        <AvatarImage
          src={iconUrl}
          alt={name}
          loading="lazy"
          onError={() => setHasImageError(true)}
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "rounded-2xl bg-gradient-to-br from-primary/12 via-secondary to-primary/8 font-display text-sm font-semibold text-foreground",
          fallbackClassName
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
