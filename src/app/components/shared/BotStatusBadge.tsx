import { Badge } from "@/app/components/ui/badge";

interface BotStatusBadgeProps {
  botInGuild: boolean | null;
}

export function BotStatusBadge({ botInGuild }: BotStatusBadgeProps) {
  if (botInGuild === null) {
    return <Badge variant="secondary">Status pending</Badge>;
  }

  return botInGuild ? (
    <Badge variant="success">Bot connected</Badge>
  ) : (
    <Badge variant="warning">Invite required</Badge>
  );
}
