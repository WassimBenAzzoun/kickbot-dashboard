import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationHistoryTable } from "./NotificationHistoryTable";

const notification = {
  id: "notification-1",
  guildId: "123",
  streamerId: "streamer-1",
  streamerUsername: "creator",
  normalizedUsername: "creator",
  platform: "KICK" as const,
  status: "LIVE" as const,
  streamUrl: "https://kick.com/creator",
  title: "Live",
  category: "Games",
  thumbnailUrl: null,
  viewerCount: 10,
  streamStartedAt: "2026-09-29T10:00:00.000Z",
  discordMessageId: "456",
  sentAt: "2026-09-29T10:00:00.000Z"
};

describe("NotificationHistoryTable", () => {
  it("shows cursor-style navigation without a total page count", () => {
    const previous = vi.fn();
    const next = vi.fn();
    render(
      <NotificationHistoryTable
        notifications={[notification]}
        page={2}
        hasPrevious
        hasNext
        onPreviousPage={previous}
        onNextPage={next}
      />
    );

    expect(screen.getByText("Page 2").textContent).toBe("Page 2");
    expect(screen.queryByText(/Page 2 of/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(previous).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
  });
});
