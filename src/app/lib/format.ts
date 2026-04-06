import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

function parseDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(value?: string | null): string {
  const parsed = parseDate(value);
  return parsed ? format(parsed, "MMM d, yyyy 'at' p") : "Not available";
}

export function formatRelativeTime(value?: string | null): string {
  const parsed = parseDate(value);
  return parsed ? formatDistanceToNowStrict(parsed, { addSuffix: true }) : "Never";
}

export function formatCompactDate(value?: string | null): string {
  const parsed = parseDate(value);
  return parsed ? format(parsed, "MMM d, yyyy") : "Not available";
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getInitials(name?: string | null): string {
  if (!name) {
    return "?";
  }

  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
