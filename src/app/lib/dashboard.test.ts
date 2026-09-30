import { describe, expect, it } from "vitest";
import { buildGuildRoute, getDashboardMetrics, normalizeGuild } from "./dashboard";

describe("guild normalization", () => {
  it("derives bot connectivity from membership state", () => {
    const guild = normalizeGuild({
      id: "123",
      name: "Creators",
      iconHash: "icon",
      configured: true,
      alertChannelId: "456",
      isAllowed: true,
      membershipState: "CONNECTED",
      trackedStreamerCount: 3
    });

    expect(guild).toMatchObject({
      id: "123",
      name: "Creators",
      botInGuild: true,
      alertChannelId: "456",
      trackedStreamerCount: 3
    });
    expect(getDashboardMetrics([guild]).connectedGuilds).toBe(1);
  });
  it("builds the guild Instants workspace route", () => {
    expect(buildGuildRoute("123", "instants")).toBe("/dashboard/guilds/123/instants");
  });
});
