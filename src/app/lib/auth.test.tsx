import { render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  logout: vi.fn()
}));

vi.mock("./api", () => ({
  ApiHttpError: class ApiHttpError extends Error {
    public constructor(public status: number) { super("API error"); }
  },
  getCurrentUser: api.getCurrentUser,
  getDiscordLoginUrl: () => "/api/v1/auth/discord/login",
  logout: api.logout
}));

import { AuthProvider, useAuth } from "./auth";

function Probe() {
  const { user, refreshSession } = useAuth();
  const [result, setResult] = useState<boolean | null>(null);
  useEffect(() => {
    if (user && result === null) void refreshSession().then(setResult);
  }, [refreshSession, result, user]);
  return <span>{user ? `${user.username}:${String(result)}` : "anonymous"}</span>;
}

describe("AuthProvider", () => {
  it("returns an explicit authenticated result after /auth/me succeeds", async () => {
    api.getCurrentUser.mockResolvedValue({
      id: "1",
      username: "tester",
      globalName: "Tester",
      avatarUrl: null,
      isGlobalAdmin: false
    });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("tester:true").textContent).toBe("tester:true"));
  });
});
