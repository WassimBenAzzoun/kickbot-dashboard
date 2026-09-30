import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme";
import { LoginPage } from "@/app/pages/LoginPage";

vi.mock("./auth", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: false,
    startDiscordLogin: vi.fn()
  })
}));

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme}</button>;
}

function mockPreferredTheme(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" && prefersDark,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = "";
  delete document.documentElement.dataset.theme;
  mockPreferredTheme(false);
});

afterEach(cleanup);

describe("ThemeProvider", () => {
  it("uses the saved theme and applies it to the document root", async () => {
    window.localStorage.setItem("kickbot-theme", "dark");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("toggles and persists the theme", async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "light" }));

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(window.localStorage.getItem("kickbot-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "dark" })).toBeTruthy();
  });

  it("exposes an accessible theme toggle on the login page", async () => {
    render(
      <ThemeProvider>
        <LoginPage />
      </ThemeProvider>
    );

    const toggle = screen.getByRole("button", { name: "Switch to dark mode" });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeTruthy();
    });
  });
});
