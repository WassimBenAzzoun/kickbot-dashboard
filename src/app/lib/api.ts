export interface AuthUser {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string | null;
  isGlobalAdmin: boolean;
}

export interface DashboardGuild {
  guildId: string;
  guildName: string;
  iconUrl: string | null;
  userCanManage: boolean;
  botInGuild: boolean | null;
  configuredAlertChannelId: string | null;
  trackedStreamerCount: number;
}

export interface GuildConfig {
  guildId: string;
  alertChannelId: string | null;
  updatedAt: string;
}

export interface GuildChannel {
  id: string;
  name: string;
  type: "GUILD_TEXT" | "GUILD_ANNOUNCEMENT";
}

export interface GuildChannelsResponse {
  items: GuildChannel[];
  total: number;
  source: "bot_api" | "unavailable";
}

export interface Streamer {
  id: string;
  guildId: string;
  platform: "KICK";
  streamerUsername: string;
  isActive: boolean;
  lastKnownLiveState: boolean;
  lastNotifiedLiveAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  guildId: string;
  streamerUsername: string;
  platform: string;
  status: string;
  messageId: string | null;
  sentAt: string;
}

export interface PaginatedNotifications {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type BotActivityType = "PLAYING" | "WATCHING" | "LISTENING" | "COMPETING" | "CUSTOM";

export interface GlobalBotConfig {
  id: string;
  rotationEnabled: boolean;
  rotationIntervalSeconds: number;
  defaultStatusEnabled: boolean;
  defaultStatusText: string | null;
  defaultActivityType: BotActivityType | null;
  createdAt: string;
  updatedAt: string;
}

export interface BotStatusMessage {
  id: string;
  text: string;
  activityType: BotActivityType;
  isEnabled: boolean;
  sortOrder: number;
  usePlaceholders: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalAdminUser {
  discordId: string;
  source: "env" | "database";
  createdAt: string | null;
}

export interface AdminBotGuild {
  guildId: string;
  guildName: string;
  iconUrl: string | null;
  configuredAlertChannelId: string | null;
  trackedStreamerCount: number;
  joinedAt: string;
  lastSeenAt: string;
  updatedAt: string;
}

export interface AdminWhitelistedGuild {
  id: string;
  guildId: string;
  guildName: string | null;
  notes: string | null;
  addedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuildWhitelistEnforcementState {
  enabled: boolean;
  updatedAt: string | null;
  reconciliation?: {
    checked: number;
    left: number;
  };
}

export interface AdminGlobalConfigResponse {
  config: GlobalBotConfig;
  availableActivityTypes: BotActivityType[];
  availablePlaceholders: string[];
}

export interface AdminStatusMessagesResponse {
  items: BotStatusMessage[];
  total: number;
  availableActivityTypes: BotActivityType[];
  availablePlaceholders: string[];
}

export class ApiHttpError extends Error {
  public constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "http://localhost:4000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers = new Headers(init?.headers ?? undefined);
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message =
      typeof data?.message === "string" ? data.message : `Request failed (${response.status})`;
    throw new ApiHttpError(response.status, message);
  }

  return data as T;
}

export function getDiscordLoginUrl(): string {
  return `${API_BASE_URL}/auth/discord/login`;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiFetch<{ authenticated: boolean; user: AuthUser }>("/auth/me");
  return response.user;
}

export async function logout(): Promise<void> {
  await apiFetch<{ success: true }>("/auth/logout", {
    method: "POST"
  });
}

export async function getInviteLink(): Promise<string> {
  const response = await apiFetch<{ inviteUrl: string }>("/bot/invite-link");
  return response.inviteUrl;
}

export async function getDashboardGuilds(): Promise<DashboardGuild[]> {
  const response = await apiFetch<{ items: DashboardGuild[]; total: number }>("/dashboard/guilds");
  return response.items;
}

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  const response = await apiFetch<{ config: GuildConfig }>(`/guilds/${guildId}/config`);
  return response.config;
}

export async function getGuildChannels(guildId: string): Promise<GuildChannelsResponse> {
  return apiFetch<GuildChannelsResponse>(`/guilds/${guildId}/channels`);
}

export async function updateGuildConfig(
  guildId: string,
  alertChannelId: string | null
): Promise<GuildConfig> {
  const response = await apiFetch<{ config: GuildConfig }>(`/guilds/${guildId}/config`, {
    method: "PUT",
    body: JSON.stringify({ alertChannelId })
  });

  return response.config;
}

export async function getGuildStreamers(guildId: string): Promise<Streamer[]> {
  const response = await apiFetch<{ items: Streamer[]; total: number }>(`/guilds/${guildId}/streamers`);
  return response.items;
}

export async function addStreamer(guildId: string, streamerUsername: string): Promise<Streamer> {
  const response = await apiFetch<{ streamer: Streamer }>(`/guilds/${guildId}/streamers`, {
    method: "POST",
    body: JSON.stringify({ streamerUsername })
  });

  return response.streamer;
}

export async function updateStreamerState(
  guildId: string,
  streamerId: string,
  isActive: boolean
): Promise<Streamer> {
  const response = await apiFetch<{ streamer: Streamer }>(
    `/guilds/${guildId}/streamers/${streamerId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive })
    }
  );

  return response.streamer;
}

export async function deleteStreamer(guildId: string, streamerId: string): Promise<void> {
  await apiFetch<void>(`/guilds/${guildId}/streamers/${streamerId}`, {
    method: "DELETE"
  });
}

export async function getGuildNotifications(
  guildId: string,
  page: number,
  pageSize: number
): Promise<PaginatedNotifications> {
  return apiFetch<PaginatedNotifications>(
    `/guilds/${guildId}/notifications?page=${page}&pageSize=${pageSize}`
  );
}

export async function getAdminGlobalConfig(): Promise<AdminGlobalConfigResponse> {
  return apiFetch<AdminGlobalConfigResponse>("/admin/global-config");
}

export async function getAdminStatusMessages(): Promise<AdminStatusMessagesResponse> {
  return apiFetch<AdminStatusMessagesResponse>("/admin/status-messages");
}

export async function updateAdminGlobalConfig(input: {
  rotationEnabled: boolean;
  rotationIntervalSeconds: number;
  defaultStatusEnabled: boolean;
  defaultStatusText: string | null;
  defaultActivityType: BotActivityType | null;
}): Promise<GlobalBotConfig> {
  const response = await apiFetch<{ config: GlobalBotConfig }>("/admin/global-config", {
    method: "PUT",
    body: JSON.stringify(input)
  });

  return response.config;
}

export async function createAdminStatusMessage(input: {
  text: string;
  activityType: BotActivityType;
  isEnabled: boolean;
  usePlaceholders: boolean;
}): Promise<BotStatusMessage> {
  const response = await apiFetch<{ item: BotStatusMessage }>("/admin/status-messages", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return response.item;
}

export async function updateAdminStatusMessage(
  id: string,
  input: {
    text: string;
    activityType: BotActivityType;
    isEnabled: boolean;
    usePlaceholders: boolean;
  }
): Promise<BotStatusMessage> {
  const response = await apiFetch<{ item: BotStatusMessage }>(`/admin/status-messages/${id}`, {
    method: "PUT",
    body: JSON.stringify(input)
  });

  return response.item;
}

export async function toggleAdminStatusMessage(
  id: string,
  isEnabled: boolean
): Promise<BotStatusMessage> {
  const response = await apiFetch<{ item: BotStatusMessage }>(`/admin/status-messages/${id}/toggle`, {
    method: "PATCH",
    body: JSON.stringify({ isEnabled })
  });

  return response.item;
}

export async function reorderAdminStatusMessages(idsInOrder: string[]): Promise<BotStatusMessage[]> {
  const response = await apiFetch<{ items: BotStatusMessage[]; total: number }>(
    "/admin/status-messages/reorder",
    {
      method: "PATCH",
      body: JSON.stringify({ idsInOrder })
    }
  );

  return response.items;
}

export async function deleteAdminStatusMessage(id: string): Promise<void> {
  await apiFetch<void>(`/admin/status-messages/${id}`, {
    method: "DELETE"
  });
}

export async function getAdminGlobalAdmins(): Promise<GlobalAdminUser[]> {
  const response = await apiFetch<{ items: GlobalAdminUser[]; total: number }>("/admin/global-admins");
  return response.items;
}

export async function addAdminGlobalAdmin(discordId: string): Promise<GlobalAdminUser> {
  const response = await apiFetch<{ item: GlobalAdminUser }>("/admin/global-admins", {
    method: "POST",
    body: JSON.stringify({ discordId })
  });

  return response.item;
}

export async function removeAdminGlobalAdmin(discordId: string): Promise<void> {
  await apiFetch<void>(`/admin/global-admins/${discordId}`, {
    method: "DELETE"
  });
}

export async function getAdminBotGuilds(): Promise<AdminBotGuild[]> {
  const response = await apiFetch<{ items: AdminBotGuild[]; total: number }>("/admin/bot-guilds");
  return response.items;
}

export async function syncAdminBotGuilds(): Promise<AdminBotGuild[]> {
  const response = await apiFetch<{ items: AdminBotGuild[]; total: number; syncedAt: string }>(
    "/admin/bot-guilds/sync",
    {
      method: "POST"
    }
  );

  return response.items;
}

export async function leaveAdminBotGuild(guildId: string): Promise<void> {
  await apiFetch<{ success: boolean; guildId: string }>(`/admin/bot-guilds/${guildId}/leave`, {
    method: "DELETE"
  });
}

export async function getAdminWhitelistEnforcement(): Promise<GuildWhitelistEnforcementState> {
  return apiFetch<GuildWhitelistEnforcementState>("/admin/settings/whitelist-enforcement");
}

export async function updateAdminWhitelistEnforcement(
  enabled: boolean
): Promise<GuildWhitelistEnforcementState> {
  return apiFetch<GuildWhitelistEnforcementState>("/admin/settings/whitelist-enforcement", {
    method: "PUT",
    body: JSON.stringify({ enabled })
  });
}

export async function getAdminWhitelistedGuilds(): Promise<AdminWhitelistedGuild[]> {
  const response = await apiFetch<{ items: AdminWhitelistedGuild[]; total: number }>(
    "/admin/whitelist/guilds"
  );
  return response.items;
}

export async function addAdminWhitelistedGuild(input: {
  guildId: string;
  guildName?: string;
  notes?: string;
}): Promise<AdminWhitelistedGuild> {
  const response = await apiFetch<{ item: AdminWhitelistedGuild }>("/admin/whitelist/guilds", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return response.item;
}

export async function removeAdminWhitelistedGuild(
  guildId: string
): Promise<{ success: boolean; guildId: string; evicted: boolean }> {
  return apiFetch<{ success: boolean; guildId: string; evicted: boolean }>(
    `/admin/whitelist/guilds/${guildId}`,
    {
      method: "DELETE"
    }
  );
}
