import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Hsl = readonly [number, number, number];

const stylesheet = readFileSync(
  resolve(process.cwd(), "src/styles/index.css"),
  "utf8"
);

function parseVariables(block: string): Map<string, Hsl> {
  const variables = new Map<string, Hsl>();
  const pattern = /--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%;/g;

  for (const match of block.matchAll(pattern)) {
    variables.set(match[1], [Number(match[2]), Number(match[3]), Number(match[4])]);
  }

  return variables;
}

function themeVariables(theme: "light" | "dark"): Map<string, Hsl> {
  const pattern =
    theme === "light"
      ? /:root\s*\{([\s\S]*?)\}/
      : /\.dark,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/;
  const block = stylesheet.match(pattern)?.[1];

  if (!block) {
    throw new Error(`Unable to find ${theme} theme variables`);
  }

  return parseVariables(block);
}

function hslToRgb([hue, saturationPercent, lightnessPercent]: Hsl): [number, number, number] {
  const saturation = saturationPercent / 100;
  const lightness = lightnessPercent / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = lightness - chroma / 2;
  const [red, green, blue] =
    segment < 1
      ? [chroma, secondary, 0]
      : segment < 2
        ? [secondary, chroma, 0]
        : segment < 3
          ? [0, chroma, secondary]
          : segment < 4
            ? [0, secondary, chroma]
            : segment < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];

  return [red + match, green + match, blue + match];
}

function luminance(color: Hsl): number {
  const channels = hslToRgb(color).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: Hsl, background: Hsl): number {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

function requireColor(variables: Map<string, Hsl>, name: string): Hsl {
  const color = variables.get(name);
  if (!color) {
    throw new Error(`Missing --${name} theme variable`);
  }
  return color;
}

const textPairs = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "background"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["success-foreground", "success"],
  ["success-muted-foreground", "success-muted"],
  ["warning-foreground", "warning"],
  ["warning-muted-foreground", "warning-muted"],
  ["sidebar-foreground", "sidebar-background"],
  ["sidebar-accent-foreground", "sidebar-accent"]
] as const;

describe.each(["light", "dark"] as const)("%s theme contrast", (theme) => {
  const variables = themeVariables(theme);

  it.each(textPairs)("keeps --%s readable on --%s", (foreground, background) => {
    expect(
      contrast(requireColor(variables, foreground), requireColor(variables, background)),
      `${foreground} on ${background}`
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["ring", "background"],
    ["input", "input-background"]
  ] as const)("keeps the --%s control boundary visible on --%s", (foreground, background) => {
    expect(
      contrast(requireColor(variables, foreground), requireColor(variables, background)),
      `${foreground} on ${background}`
    ).toBeGreaterThanOrEqual(3);
  });
});
