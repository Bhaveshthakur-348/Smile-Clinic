import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { getDb, isUniqueViolation, schema } from "@/db";
import { getHolidayDates, toSlotSettings } from "@/lib/data";
import { freeChair, hhmm, nowIn, slotsForDate } from "@/lib/slots";
import { notifyNewBooking } from "@/lib/notify";

export class BookingError extends Error {
  constructor(public code: "slot_taken" | "closed" | "invalid_treatment" | "not_configured", message: string) {
    super(message);
  }
}

async function loadSettings(clinicId: string) {
  const [s] = await getDb().select().from(schema.clinicSettings).where(eq(schema.clinicSettings.clinicId, clinicId));
  if (!s) throw new BookingError("not_configured", "Clinic timings are not set up yet");
  return toSlotSettings(s);
}

/** Active (non-cancelled) bookings per start time on a date: { "10:30": [1, 2] } → chair numbers. */
async function takenChairs(clinicId: string, date: string) {
  const rows = await getDb()
    .select({ time: schema.bookings.startTime, chair: schema.bookings.chairNo })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.clinicId, clinicId), eq(schema.bookings.date, date), ne(schema.bookings.status, "cancelled")));
  const map: Record<string, number[]> = {};
  for (const r of rows) (map[hhmm(r.time)] ??= []).push(r.chair);
  return map;
}

export async function getSlots(clinicId: string, date: string, opts: { ignoreNotice?: boolean } = {}) {
  const [settings, holidays, taken] = await Promise.all([loadSettings(clinicId), getHolidayDates(clinicId), takenChairs(clinicId, date)]);
  const now = nowIn();
  const bookedChairs = Object.fromEntries(Object.entries(taken).map(([t, c]) => [t, c.length]));
  return slotsForDate({
    settings: opts.ignoreNotice ? { ...settings, minNoticeMinutes: -24 * 60 } : settings,
    date, holidays, bookedChairs, now,
  });
}

export type NewBooking = {
  clinicId: string;
  treatmentId: string | null;
  date: string;
  time: string; // HH:MM
  name: string;
  phone: string; // +91XXXXXXXXXX
  notes?: string | null;
  consent: boolean;
  source: "web" | "whatsapp" | "manual";
};

/** The one place bookings are created (web form, admin manual booking, later the WhatsApp bot). */
export async function createBooking(b: NewBooking) {
  const db = getDb();
  const settings = await loadSettings(b.clinicId);

  if (b.treatmentId) {
    const [t] = await db.select({ id: schema.treatments.id }).from(schema.treatments)
      .where(and(eq(schema.treatments.id, b.treatmentId), eq(schema.treatments.clinicId, b.clinicId)));
    if (!t) throw new BookingError("invalid_treatment", "Unknown treatment");
  }

  const slots = await getSlots(b.clinicId, b.date, { ignoreNotice: b.source === "manual" });
  const slot = slots.find((s) => s.time === b.time);
  if (!slot) throw new BookingError("closed", "The clinic is closed at that time");
  if (!slot.free) throw new BookingError("slot_taken", "That slot was just taken — please pick another");

  // Two attempts: if someone grabs the same chair at the same instant, the unique index rejects
  // one insert and we retry with the next free chair.
  for (let attempt = 0; attempt < 2; attempt++) {
    const taken = (await takenChairs(b.clinicId, b.date))[b.time] ?? [];
    const chair = freeChair(taken, settings.chairs);
    if (!chair) throw new BookingError("slot_taken", "That slot was just taken — please pick another");
    try {
      const booking = await db.transaction(async (tx) => {
        const [patient] = await tx
          .insert(schema.patients)
          .values({ clinicId: b.clinicId, name: b.name, phone: b.phone, consentAt: b.consent ? new Date() : null })
          .onConflictDoUpdate({
            target: [schema.patients.clinicId, schema.patients.phone],
            set: { name: b.name, ...(b.consent ? { consentAt: new Date() } : {}) },
          })
          .returning({ id: schema.patients.id });
        const [row] = await tx
          .insert(schema.bookings)
          .values({
            clinicId: b.clinicId, patientId: patient.id, treatmentId: b.treatmentId,
            date: b.date, startTime: b.time, chairNo: chair, status: "confirmed",
            source: b.source, notes: b.notes ?? null,
          })
          .returning();
        return row;
      });
      await notifyNewBooking(booking.id).catch((e) => console.error("notify failed", e));
      return booking;
    } catch (e) {
      if (isUniqueViolation(e) && attempt === 0) continue; // retry once
      if (isUniqueViolation(e)) throw new BookingError("slot_taken", "That slot was just taken — please pick another");
      throw e;
    }
  }
  throw new BookingError("slot_taken", "That slot was just taken — please pick another");
}

/** Used by admin status changes to keep patients.last_visit_at fresh. */
export async function markVisit(clinicId: string, patientId: string) {
  await getDb().update(schema.patients).set({ lastVisitAt: sql`now()` })
    .where(and(eq(schema.patients.id, patientId), eq(schema.patients.clinicId, clinicId)));
}
