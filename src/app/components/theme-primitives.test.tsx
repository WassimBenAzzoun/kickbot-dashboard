import { render, screen } from "@testing-library/react";
import { MemoryRouter, Link } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup } from "@testing-library/react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

afterEach(cleanup);

describe("theme primitives", () => {
  it.each([
    ["default", "bg-primary", "text-primary-foreground"],
    ["secondary", "bg-secondary", "text-secondary-foreground"],
    ["outline", "bg-background", "text-foreground"],
    ["ghost", "text-muted-foreground", "hover:text-accent-foreground"],
    ["destructive", "bg-destructive", "text-destructive-foreground"],
    ["kick", "bg-success", "text-success-foreground"]
  ] as const)("uses semantic colors for the %s button", (variant, background, foreground) => {
    render(<Button variant={variant}>Action</Button>);

    expect(screen.getByRole("button", { name: "Action" }).className).toContain(background);
    expect(screen.getByRole("button", { name: "Action" }).className).toContain(foreground);
  });

  it("preserves semantic foreground colors for external anchor buttons", () => {
    render(
      <Button asChild>
        <a href="https://example.com">Invite bot</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: "Invite bot" });
    expect(link.className).toContain("bg-primary");
    expect(link.className).toContain("text-primary-foreground");
  });

  it("preserves semantic foreground colors for router-link buttons", () => {
    render(
      <MemoryRouter>
        <Button asChild>
          <Link to="/notifications">Open notifications</Link>
        </Button>
      </MemoryRouter>
    );

    const link = screen.getByRole("link", { name: "Open notifications" });
    expect(link.className).toContain("bg-primary");
    expect(link.className).toContain("text-primary-foreground");
  });

  it.each([
    ["success", "bg-success-muted", "text-success-muted-foreground"],
    ["warning", "bg-warning-muted", "text-warning-muted-foreground"],
    ["destructive", "bg-destructive", "text-destructive-foreground"]
  ] as const)("uses accessible semantic colors for the %s badge", (variant, background, foreground) => {
    render(<Badge variant={variant}>Status</Badge>);

    const badge = screen.getByText("Status");
    expect(badge.className).toContain(background);
    expect(badge.className).toContain(foreground);
  });
});
