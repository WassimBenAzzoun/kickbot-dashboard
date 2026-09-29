import { describe, expect, it } from "vitest";
import { getDashboardMetrics, normalizeGuild } from "./dashboard";

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
});
