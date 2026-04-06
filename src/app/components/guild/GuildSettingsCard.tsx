import { useEffect, useState } from "react";
import { Save, Settings2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { GuildChannel, GuildConfig } from "@/app/lib/api";
import { formatDateTime } from "@/app/lib/format";

interface GuildSettingsCardProps {
  config: GuildConfig | null | undefined;
  availableChannels: GuildChannel[];
  channelSource: "bot_api" | "unavailable";
  isSaving: boolean;
  onSave: (alertChannelId: string | null) => void;
}

export function GuildSettingsCard({
  config,
  availableChannels,
  channelSource,
  isSaving,
  onSave
}: GuildSettingsCardProps) {
  const [alertChannelInput, setAlertChannelInput] = useState("");

  useEffect(() => {
    setAlertChannelInput(config?.alertChannelId ?? "");
  }, [config?.alertChannelId]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="text-primary" />
              Guild settings
            </CardTitle>
            <CardDescription>
              Choose the Discord channel that receives Kick live notifications.
            </CardDescription>
          </div>
          <Badge variant={channelSource === "bot_api" ? "success" : "secondary"}>
            {channelSource === "bot_api" ? "Discord channels loaded" : "Manual mode"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Select a channel</label>
          <Select
            value={
              availableChannels.some((channel) => channel.id === alertChannelInput)
                ? alertChannelInput
                : undefined
            }
            onValueChange={setAlertChannelInput}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a Discord text channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {availableChannels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    #{channel.name} {channel.type === "GUILD_ANNOUNCEMENT" ? "(Announcement)" : "(Text)"}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Or paste a channel ID</label>
          <Input
            value={alertChannelInput}
            placeholder="123456789012345678"
            onChange={(event) => setAlertChannelInput(event.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Use manual entry when the bot cannot fetch channels yet or if you are preparing setup before inviting it.
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-between border-t border-border/70 pt-5">
        <p className="text-sm text-muted-foreground">
          Last updated {config?.updatedAt ? formatDateTime(config.updatedAt) : "not yet configured"}
        </p>
        <Button onClick={() => onSave(alertChannelInput.trim() || null)} disabled={isSaving}>
          <Save data-icon="inline-start" />
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </CardFooter>
    </Card>
  );
}
