import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ isLoading: false, isAuthenticated: true, user: { isGlobalAdmin: false } }));
vi.mock("./lib/auth", () => ({ useAuth: () => state }));

import { GlobalAdminRoute } from "./routes";

describe("GlobalAdminRoute", () => {
  it("redirects a non-admin authenticated user", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<GlobalAdminRoute><div>admin-only</div></GlobalAdminRoute>} />
          <Route path="/dashboard/overview" element={<div>overview</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText("admin-only")).toBeNull();
    expect(screen.getByText("overview").textContent).toBe("overview");
  });
});
