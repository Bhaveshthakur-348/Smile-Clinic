import { label12 } from "@/lib/slots";
import type { ClinicSettings } from "@/db/schema";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });
}

export function formatTime(t: string) {
  return label12(t.slice(0, 5));
}

/** "Mon – Sat" style label for open days. */
export function openDaysLabel(days: number[]) {
  const s = [...days].sort((a, b) => a - b);
  const contiguous = s.every((d, i) => i === 0 || d === s[i - 1] + 1);
  return contiguous && s.length > 2 ? `${DAY[s[0]]} – ${DAY[s.at(-1)!]}` : s.map((d) => DAY[d]).join(", ");
}

export function sessionsLabel(s: ClinicSettings) {
  const parts: string[] = [];
  if (s.morningStart && s.morningEnd) parts.push(`${formatTime(s.morningStart)} – ${formatTime(s.morningEnd)}`);
  if (s.eveningStart && s.eveningEnd) parts.push(`${formatTime(s.eveningStart)} – ${formatTime(s.eveningEnd)}`);
  return parts.join(" · ");
}

export const closedDaysLabel = (days: number[]) => DAY.filter((_, i) => !days.includes(i)).join(", ");
