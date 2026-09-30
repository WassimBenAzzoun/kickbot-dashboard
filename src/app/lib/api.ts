export interface AuthUser {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string | null;
  isGlobalAdmin: boolean;
}

export type GuildMembershipState = "UNKNOWN" | "CONNECTED" | "LEFT";

export interface DashboardGuild {
  id: string;
  name: string;
  iconHash: string | null;
  configured: boolean;
  alertChannelId: string | null;
  isAllowed: boolean;
  membershipState: GuildMembershipState;
  trackedStreamerCount: number;
}

export interface DiscordGuild {
  id: string;
  name: string | null;
  iconHash: string | null;
  membershipState: GuildMembershipState;
  alertChannelId: string | null;
  isAllowed: boolean;
  allowlistNotes: string | null;
  allowedByDiscordUserId: string | null;
  allowedAt: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GuildConfig = DiscordGuild;

export interface GuildChannel {
  id: string;
  name: string;
  type: number;
}

export interface Collection<T> {
  items: T[];
  page: { nextCursor: string | null; hasMore: boolean };
}

export interface Streamer {
  id: string;
  guildId: string;
  platform: "KICK";
  username: string;
  normalizedUsername: string;
  enabled: boolean;
  lastKnownLiveState: boolean;
  currentLiveStartedAt: string | null;
  lastNotifiedLiveAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  guildId: string;
  streamerId: string | null;
  streamerUsername: string;
  normalizedUsername: string;
  platform: "KICK";
  status: "LIVE";
  streamUrl: string;
  title: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  viewerCount: number | null;
  streamStartedAt: string;
  discordMessageId: string | null;
  sentAt: string;
}

export type NotificationPage = Collection<NotificationItem>;
export type BotActivityType = "PLAYING" | "WATCHING" | "LISTENING" | "COMPETING" | "CUSTOM";

export interface BotSettings {
  id: "default";
  allowlistEnforced: boolean;
  rotationEnabled: boolean;
  rotationIntervalSeconds: number;
  defaultStatusEnabled: boolean;
  defaultStatusText: string | null;
  defaultActivityType: BotActivityType | null;
  instantsEnabled: boolean;
  instantAccessMode: InstantAccessMode;
  createdAt: string;
  updatedAt: string;
}

export type InstantAccessMode = "EVERYONE" | "ALLOWLIST_ONLY";
export interface InstantLimits { maxAudioBytes: number; maxDurationSeconds: number; maxQueueLength: number; userCooldownSeconds: number; maxActiveGuilds: number; idleDisconnectSeconds: number; }
export interface InstantSettings { enabled: boolean; accessMode: InstantAccessMode; limits: InstantLimits; }
export interface InstantCapabilities extends InstantSettings { canPlay: boolean; voiceRuntimeAvailable: boolean; }
export interface InstantSearchResult { id: string; title: string; pageUrl: string; }
export interface InstantVoiceChannel { id: string; name: string; type: number; memberCount: number; }
export interface InstantQueueItem {
  id: string; title: string; pageUrl: string; requestedByDiscordUserId: string;
  requestedVia: "DASHBOARD" | "DISCORD"; voiceChannelId: string; state: "QUEUED" | "PLAYING";
  position: number; enqueuedAt: string;
}
export interface InstantQueueStatus {
  connectionState: "IDLE" | "CONNECTING" | "READY" | "PLAYING";
  voiceChannelId: string | null; current: InstantQueueItem | null; items: InstantQueueItem[];
  idleDisconnectAt: string | null; lastError: { code: string; message: string; occurredAt: string } | null;
}
export interface InstantAllowedUser {
  discordId: string; username: string | null; globalName: string | null; avatarHash: string | null;
  avatarUrl: string | null; addedByDiscordUserId: string; createdAt: string; updatedAt: string;
}

export type GlobalBotConfig = BotSettings;

export interface BotStatusMessage {
  id: string;
  text: string;
  activityType: BotActivityType;
  enabled: boolean;
  sortOrder: number;
  usePlaceholders: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalAdminUser {
  discordId: string;
  source?: "environment" | "database";
  createdAt?: string;
}

export interface AdminBotGuild extends DiscordGuild {
  trackedStreamerCount: number;
}

export interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown; requestId?: string };
}

export class ApiHttpError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = "ApiHttpError";
  }
}

const API_BASE_URL = "/api/v1";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, credentials: "include", headers });
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    const normalized = data as ApiErrorBody;
    throw new ApiHttpError(
      response.status,
      normalized.error?.code ?? "HTTP_ERROR",
      normalized.error?.message ?? `Request failed (${response.status})`,
      normalized.error?.details,
      normalized.error?.requestId
    );
  }
  return data as T;
}

export function getDiscordLoginUrl(): string { return `${API_BASE_URL}/auth/discord/login`; }
export function getCurrentUser(): Promise<AuthUser> { return apiFetch<AuthUser>("/auth/me"); }
export async function logout(): Promise<void> { await apiFetch("/auth/logout", { method: "POST" }); }
export async function getInviteLink(): Promise<string> { return (await apiFetch<{ url: string }>("/bot/invite-url")).url; }
export async function getDashboardGuilds(): Promise<DashboardGuild[]> { return (await apiFetch<Collection<DashboardGuild>>("/guilds")).items; }
export function getGuildConfig(guildId: string): Promise<GuildConfig> { return apiFetch(`/guilds/${guildId}`); }
export function getGuildChannels(guildId: string): Promise<Collection<GuildChannel>> { return apiFetch(`/guilds/${guildId}/channels`); }
export function updateGuildConfig(guildId: string, alertChannelId: string | null): Promise<GuildConfig> {
  return apiFetch(`/guilds/${guildId}`, { method: "PATCH", body: JSON.stringify({ alertChannelId }) });
}
export async function getGuildStreamers(guildId: string): Promise<Streamer[]> { return (await apiFetch<Collection<Streamer>>(`/guilds/${guildId}/streamers`)).items; }
export function addStreamer(guildId: string, username: string): Promise<Streamer> {
  return apiFetch(`/guilds/${guildId}/streamers`, { method: "POST", body: JSON.stringify({ username }) });
}
export function updateStreamerState(guildId: string, streamerId: string, enabled: boolean): Promise<Streamer> {
  return apiFetch(`/guilds/${guildId}/streamers/${streamerId}`, { method: "PATCH", body: JSON.stringify({ enabled }) });
}
export async function deleteStreamer(guildId: string, streamerId: string): Promise<void> { await apiFetch(`/guilds/${guildId}/streamers/${streamerId}`, { method: "DELETE" }); }
export function getGuildNotifications(guildId: string, cursor?: string, limit = 20): Promise<NotificationPage> {
  const query = new URLSearchParams({ limit: limit.toString() });
  if (cursor) query.set("cursor", cursor);
  return apiFetch(`/guilds/${guildId}/notifications?${query.toString()}`);
}
export function getInstantCapabilities(guildId: string): Promise<InstantCapabilities> { return apiFetch(`/guilds/${guildId}/instants/capabilities`); }
export async function getInstantVoiceChannels(guildId: string): Promise<InstantVoiceChannel[]> { return (await apiFetch<Collection<InstantVoiceChannel>>(`/guilds/${guildId}/instants/voice-channels`)).items; }
export async function searchInstants(guildId: string, query: string, limit = 20): Promise<InstantSearchResult[]> {
  const params = new URLSearchParams({ query, limit: String(limit) });
  return (await apiFetch<Collection<InstantSearchResult>>(`/guilds/${guildId}/instants/search?${params}`)).items;
}
export function enqueueInstant(guildId: string, voiceChannelId: string, instantUrl: string): Promise<{ item: InstantQueueItem; position: number; startsImmediately: boolean }> {
  return apiFetch(`/guilds/${guildId}/instants/queue`, { method: "POST", body: JSON.stringify({ voiceChannelId, instantUrl }) });
}
export function getInstantQueue(guildId: string): Promise<InstantQueueStatus> { return apiFetch(`/guilds/${guildId}/instants/queue`); }
export async function stopInstantQueue(guildId: string): Promise<void> { await apiFetch(`/guilds/${guildId}/instants/queue`, { method: "DELETE" }); }

export function getAdminSettings(): Promise<BotSettings> { return apiFetch("/admin/settings"); }
export function updateAdminSettings(input: Partial<Omit<BotSettings, "id" | "createdAt" | "updatedAt">>): Promise<BotSettings> {
  return apiFetch("/admin/settings", { method: "PATCH", body: JSON.stringify(input) });
}
export async function getAdminPresenceMessages(): Promise<BotStatusMessage[]> { return (await apiFetch<Collection<BotStatusMessage>>("/admin/presence-messages")).items; }
export function createAdminStatusMessage(input: Omit<BotStatusMessage, "id" | "sortOrder" | "createdAt" | "updatedAt">): Promise<BotStatusMessage> {
  return apiFetch("/admin/presence-messages", { method: "POST", body: JSON.stringify(input) });
}
export function updateAdminStatusMessage(id: string, input: Partial<Omit<BotStatusMessage, "id" | "sortOrder" | "createdAt" | "updatedAt">>): Promise<BotStatusMessage> {
  return apiFetch(`/admin/presence-messages/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}
export async function reorderAdminStatusMessages(ids: string[]): Promise<void> { await apiFetch("/admin/presence-messages/order", { method: "PATCH", body: JSON.stringify({ ids }) }); }
export async function deleteAdminStatusMessage(id: string): Promise<void> { await apiFetch(`/admin/presence-messages/${id}`, { method: "DELETE" }); }
export async function getAdminGlobalAdmins(): Promise<GlobalAdminUser[]> { return (await apiFetch<Collection<GlobalAdminUser>>("/admin/admins")).items; }
export function addAdminGlobalAdmin(discordId: string): Promise<GlobalAdminUser> { return apiFetch("/admin/admins", { method: "POST", body: JSON.stringify({ discordId }) }); }
export async function removeAdminGlobalAdmin(discordId: string): Promise<void> { await apiFetch(`/admin/admins/${discordId}`, { method: "DELETE" }); }
export async function getAdminBotGuilds(): Promise<AdminBotGuild[]> { return (await apiFetch<Collection<AdminBotGuild>>("/admin/guilds")).items; }
export async function syncAdminBotGuilds(): Promise<AdminBotGuild[]> { return (await apiFetch<Collection<AdminBotGuild>>("/admin/guilds/sync", { method: "POST" })).items; }
export async function leaveAdminBotGuild(guildId: string): Promise<void> { await apiFetch(`/admin/guilds/${guildId}/leave`, { method: "POST" }); }
export function updateAdminGuildAccess(guildId: string, isAllowed: boolean, notes?: string | null): Promise<DiscordGuild> {
  return apiFetch(`/admin/guilds/${guildId}/access`, { method: "PATCH", body: JSON.stringify({ isAllowed, notes }) });
}
export function getAdminInstantSettings(): Promise<InstantSettings> { return apiFetch("/admin/instants/settings"); }
export function updateAdminInstantSettings(input: Partial<Pick<InstantSettings, "enabled" | "accessMode">>): Promise<InstantSettings> { return apiFetch("/admin/instants/settings", { method: "PATCH", body: JSON.stringify(input) }); }
export async function getAdminInstantAllowedUsers(): Promise<InstantAllowedUser[]> { return (await apiFetch<Collection<InstantAllowedUser>>("/admin/instants/allowed-users")).items; }
export function addAdminInstantAllowedUser(discordId: string): Promise<InstantAllowedUser> { return apiFetch("/admin/instants/allowed-users", { method: "POST", body: JSON.stringify({ discordId }) }); }
export async function removeAdminInstantAllowedUser(discordId: string): Promise<void> { await apiFetch(`/admin/instants/allowed-users/${discordId}`, { method: "DELETE" }); }

export const ACTIVITY_TYPES: BotActivityType[] = ["PLAYING", "WATCHING", "LISTENING", "COMPETING", "CUSTOM"];
export const PRESENCE_PLACEHOLDERS = ["{guilds}", "{streamers}"] as const;
