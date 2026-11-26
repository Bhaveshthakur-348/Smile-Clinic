// Pure slot logic shared by the website form (and later the WhatsApp bot).
// free slots = clinic sessions − holidays − closed days − booked chairs − too-soon times
// All dates are "YYYY-MM-DD" and times "HH:MM" in clinic local time (Asia/Kolkata).

export type SlotSettings = {
  openDays: number[]; // 0 = Sunday … 6 = Saturday
  morningStart: string | null;
  morningEnd: string | null;
  eveningStart: string | null;
  eveningEnd: string | null;
  slotMinutes: number;
  chairs: number;
  daysAhead: number;
  minNoticeMinutes: number;
};

export type Slot = { time: string; label: string; session: "morning" | "evening"; free: boolean };

export const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const toHHMM = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
export const hhmm = (t: string) => t.slice(0, 5); // "10:30:00" → "10:30"

export function label12(t: string) {
  const mins = toMinutes(t);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Current date and minutes-since-midnight in a time zone (default IST). */
export function nowIn(timeZone = "Asia/Kolkata", now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** True for a real calendar date in YYYY-MM-DD form (rejects 2026-13-45 and 2026-02-30). */
export function isIsoDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
export const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/** Dates a patient can pick: today … today + daysAhead, open days only, no holidays. */
export function bookableDates(s: SlotSettings, holidays: string[], today: string) {
  const off = new Set(holidays);
  const out: string[] = [];
  for (let i = 0; i <= s.daysAhead; i++) {
    const d = addDays(today, i);
    if (s.openDays.includes(weekday(d)) && !off.has(d)) out.push(d);
  }
  return out;
}

/** Every slot start time in the clinic's sessions (a slot must end by session end). */
export function sessionSlots(s: SlotSettings) {
  const out: { time: string; session: "morning" | "evening" }[] = [];
  const add = (start: string | null, end: string | null, session: "morning" | "evening") => {
    if (!start || !end) return;
    for (let m = toMinutes(start); m + s.slotMinutes <= toMinutes(end); m += s.slotMinutes) {
      out.push({ time: toHHMM(m), session });
    }
  };
  add(s.morningStart, s.morningEnd, "morning");
  add(s.eveningStart, s.eveningEnd, "evening");
  return out;
}

/**
 * Slots for one date, each marked free or taken.
 * bookedChairs: start time ("HH:MM") → number of active bookings at that time.
 */
export function slotsForDate(opts: {
  settings: SlotSettings;
  date: string;
  holidays: string[];
  bookedChairs: Record<string, number>;
  now: { date: string; minutes: number };
}): Slot[] {
  const { settings: s, date, holidays, bookedChairs, now } = opts;
  if (!bookableDates(s, holidays, now.date).includes(date)) return [];
  const earliest = date === now.date ? now.minutes + s.minNoticeMinutes : -1;
  return sessionSlots(s).map(({ time, session }) => ({
    time,
    session,
    label: label12(time),
    free: toMinutes(time) >= earliest && (bookedChairs[time] ?? 0) < s.chairs,
  }));
}

/** Lowest chair number not already used at this time, or null when full. */
export function freeChair(taken: number[], chairs: number) {
  for (let c = 1; c <= chairs; c++) if (!taken.includes(c)) return c;
  return null;
}
