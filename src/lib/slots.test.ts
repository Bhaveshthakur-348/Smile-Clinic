import { test } from "node:test";
import assert from "node:assert/strict";
import { bookableDates, sessionSlots, slotsForDate, freeChair, label12, nowIn, type SlotSettings } from "./slots.ts";

const s: SlotSettings = {
  openDays: [1, 2, 3, 4, 5, 6], morningStart: "10:00", morningEnd: "14:00",
  eveningStart: "17:00", eveningEnd: "21:00", slotMinutes: 30, chairs: 1, daysAhead: 7, minNoticeMinutes: 60,
};

test("sessions produce 8 + 8 half-hour slots", () => {
  const slots = sessionSlots(s);
  assert.equal(slots.length, 16);
  assert.equal(slots[0].time, "10:00");
  assert.equal(slots[7].time, "13:30");
  assert.equal(slots[8].time, "17:00");
  assert.equal(slots.at(-1)!.time, "20:30");
});

test("Sundays and holidays are not bookable", () => {
  // 2026-11-25 is a Wednesday; 2026-11-29 is a Sunday
  const d = bookableDates(s, ["2026-11-27"], "2026-11-25");
  assert.ok(!d.includes("2026-11-29"));
  assert.ok(!d.includes("2026-11-27"));
  assert.ok(d.includes("2026-11-26"));
});

test("booked and too-soon slots are taken", () => {
  const slots = slotsForDate({
    settings: s, date: "2026-11-25", holidays: [],
    bookedChairs: { "17:00": 1 }, now: { date: "2026-11-25", minutes: 11 * 60 },
  });
  const get = (t: string) => slots.find((x) => x.time === t)!;
  assert.equal(get("11:30").free, false); // within 60 min notice
  assert.equal(get("12:00").free, true);
  assert.equal(get("17:00").free, false); // booked
  assert.equal(get("17:30").free, true);
});

test("two chairs allow two bookings per slot", () => {
  const slots = slotsForDate({
    settings: { ...s, chairs: 2 }, date: "2026-11-26", holidays: [],
    bookedChairs: { "10:00": 1 }, now: { date: "2026-11-25", minutes: 0 },
  });
  assert.equal(slots[0].free, true);
  assert.equal(freeChair([1], 2), 2);
  assert.equal(freeChair([1, 2], 2), null);
});

test("closed date returns no slots; labels and IST clock", () => {
  assert.equal(slotsForDate({ settings: s, date: "2026-11-29", holidays: [], bookedChairs: {}, now: { date: "2026-11-25", minutes: 0 } }).length, 0);
  assert.equal(label12("17:30"), "5:30 PM");
  assert.equal(label12("12:00"), "12:00 PM");
  assert.deepEqual(nowIn("Asia/Kolkata", new Date("2026-11-25T18:45:00Z")), { date: "2026-11-26", minutes: 15 });
});
