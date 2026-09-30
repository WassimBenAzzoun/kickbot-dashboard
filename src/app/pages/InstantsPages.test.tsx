import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getInstantCapabilities: vi.fn(),
  getInstantVoiceChannels: vi.fn(),
  getInstantQueue: vi.fn(),
  searchInstants: vi.fn(),
  enqueueInstant: vi.fn(),
  stopInstantQueue: vi.fn(),
  getAdminInstantSettings: vi.fn(),
  getAdminInstantAllowedUsers: vi.fn(),
  updateAdminInstantSettings: vi.fn(),
  addAdminInstantAllowedUser: vi.fn(),
  removeAdminInstantAllowedUser: vi.fn()
}));

vi.mock("@/app/lib/api", () => api);
vi.mock("@/app/lib/dashboard", () => ({
  buildGuildRoute: (id: string) => `/dashboard/guilds/${id}`,
  dashboardKeys: {
    instantCapabilities: (id: string) => ["guild", id, "instants", "capabilities"],
    instantVoiceChannels: (id: string) => ["guild", id, "instants", "channels"],
    instantQueue: (id: string) => ["guild", id, "instants", "queue"]
  },
  useSelectedGuild: () => ({
    selectedGuild: { id: "123", name: "Creators" },
    isLoading: false
  })
}));

import { AdminInstantsPage } from "./AdminInstantsPage";
import { GuildInstantsPage } from "./GuildInstantsPage";

function renderPage(page: ReactNode, path = "/dashboard/guilds/123/instants") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="*" element={page} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Instants dashboard pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getInstantVoiceChannels.mockResolvedValue([]);
    api.getInstantQueue.mockResolvedValue({ connectionState: "IDLE", voiceChannelId: null, current: null, items: [], idleDisconnectAt: null, lastError: null });
  });

  it("clearly gates guild playback when the global feature is disabled", async () => {
    api.getInstantCapabilities.mockResolvedValue({
      enabled: false,
      accessMode: "EVERYONE",
      canPlay: false,
      voiceRuntimeAvailable: true,
      limits: { maxAudioBytes: 5_242_880, maxDurationSeconds: 30, maxQueueLength: 20, userCooldownSeconds: 3, maxActiveGuilds: 5, idleDisconnectSeconds: 30 }
    });
    renderPage(<GuildInstantsPage />);
    expect(await screen.findByText("Instants are disabled")).toBeTruthy();
    expect(screen.getByLabelText("Search Myinstants")).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: /Stop and clear/ })).toHaveProperty("disabled", true);
  });

  it("shows resolved Discord profiles in global allowlist management", async () => {
    api.getAdminInstantSettings.mockResolvedValue({
      enabled: true,
      accessMode: "ALLOWLIST_ONLY",
      limits: { maxAudioBytes: 5_242_880, maxDurationSeconds: 30, maxQueueLength: 20, userCooldownSeconds: 3, maxActiveGuilds: 5, idleDisconnectSeconds: 30 }
    });
    api.getAdminInstantAllowedUsers.mockResolvedValue([{ discordId: "123456789012345678", username: "listener", globalName: "Sound Fan", avatarHash: null, avatarUrl: null, addedByDiscordUserId: "9", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }]);
    renderPage(<AdminInstantsPage />, "/dashboard/admin/instants");
    expect(await screen.findByText("Sound Fan")).toBeTruthy();
    expect(screen.getByText(/@listener/)).toBeTruthy();
    expect(screen.getByText("Enabled")).toBeTruthy();
  });
});
