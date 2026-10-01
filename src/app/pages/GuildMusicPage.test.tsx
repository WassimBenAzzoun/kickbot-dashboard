import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getMusicCapabilities: vi.fn(),
  getInstantVoiceChannels: vi.fn(),
  getMusicQueue: vi.fn(),
  enqueueMusic: vi.fn(),
  pauseMusic: vi.fn(),
  resumeMusic: vi.fn(),
  skipMusic: vi.fn(),
  stopMusic: vi.fn()
}));

vi.mock("@/app/lib/api", () => api);
vi.mock("@/app/lib/dashboard", () => ({
  buildGuildRoute: (id: string) => `/dashboard/guilds/${id}`,
  dashboardKeys: {
    musicCapabilities: (id: string) => ["guild", id, "music", "capabilities"],
    instantVoiceChannels: (id: string) => ["guild", id, "instants", "channels"],
    musicQueue: (id: string) => ["guild", id, "music", "queue"]
  },
  useSelectedGuild: () => ({ selectedGuild: { id: "123", name: "Creators" }, isLoading: false })
}));

import { GuildMusicPage } from "./GuildMusicPage";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/dashboard/guilds/123/music"]}>
        <Routes><Route path="*" element={<GuildMusicPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Guild music page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getMusicCapabilities.mockResolvedValue({
      enabled: true,
      accessMode: "EVERYONE",
      canPlay: true,
      voiceRuntimeAvailable: true,
      spotifyAvailable: true,
      limits: { maxDurationSeconds: 7_200, maxPlaylistItems: 25, maxQueueLength: 50, maxActiveGuilds: 2 }
    });
    api.getInstantVoiceChannels.mockResolvedValue([{ id: "456", name: "General", type: 2, memberCount: 3 }]);
    api.getMusicQueue.mockResolvedValue({
      connectionState: "IDLE",
      voiceChannelId: null,
      current: null,
      items: [],
      paused: false,
      interruptedByInstant: false,
      progressMs: 0,
      idleDisconnectAt: null,
      lastError: null
    });
    api.enqueueMusic.mockResolvedValue({ accepted: [], rejected: [], truncated: false });
  });

  it("renders source controls and operational limits", async () => {
    renderPage();
    await screen.findByText("Queue a source");
    expect(screen.getByLabelText("YouTube or Spotify URL")).toBeTruthy();
    expect(screen.getByText("Up to 25 playlist items")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Resolve and queue/ })).toBeTruthy();
  });
});
