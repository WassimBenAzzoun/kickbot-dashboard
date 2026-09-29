import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiHttpError,
  addStreamer,
  getGuildNotifications,
  leaveAdminBotGuild,
  updateAdminGuildAccess
} from "./api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the versioned same-origin API and canonical streamer body", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "streamer-1" }));
    vi.stubGlobal("fetch", fetchMock);
    await addStreamer("123", "Creator");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/guilds/123/streamers",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "Creator" }),
        credentials: "include"
      })
    );
  });

  it("maps cursor pagination and admin mutations to the new contract", async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      url.includes("notifications")
        ? jsonResponse({ items: [], page: { nextCursor: null, hasMore: false } })
        : url.endsWith("/leave")
          ? new Response(null, { status: 204 })
          : jsonResponse({ id: "123" })
    );
    vi.stubGlobal("fetch", fetchMock);

    await getGuildNotifications("123", "cursor-value", 12);
    await updateAdminGuildAccess("123", true, "approved");
    await leaveAdminBotGuild("123");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/guilds/123/notifications?limit=12&cursor=cursor-value"
    );
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ isAllowed: true, notes: "approved" }) })
    );
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(expect.objectContaining({ method: "POST" }));
  });

  it("exposes normalized backend error details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          { error: { code: "GUILD_ACCESS_DENIED", message: "No access", details: { guildId: "123" }, requestId: "request-1" } },
          403
        )
      )
    );

    const error = await addStreamer("123", "Creator").catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiHttpError);
    expect(error).toMatchObject({
      status: 403,
      code: "GUILD_ACCESS_DENIED",
      message: "No access",
      details: { guildId: "123" },
      requestId: "request-1"
    });
  });
});
