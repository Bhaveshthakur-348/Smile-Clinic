"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, isUniqueViolation, schema } from "@/db";
import { BOOKING_STATUSES, MEDIA_SECTIONS } from "@/db/schema";
import { requireDoctor, requireStaff } from "@/lib/auth";
import { BookingError, createBooking, getSlots, markVisit } from "@/lib/booking";
import { clinicTag } from "@/lib/data";
import { isIsoDate } from "@/lib/slots";
import { normalizeIndianMobile } from "@/lib/phone";
import { notifyBookingChanged } from "@/lib/notify";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optional = (f: FormData, k: string) => str(f, k) || null;
const back = (path: string, params: Record<string, string>) => redirect(`${path}?${new URLSearchParams(params)}`);

export async function signOut() {
  await (await supabaseServer()).auth.signOut();
  redirect("/admin/login");
}

// ─────────────── Bookings ───────────────

export async function setBookingStatus(form: FormData) {
  const { clinic } = await requireStaff();
  const id = str(form, "id");
  const status = z.enum(BOOKING_STATUSES).parse(str(form, "status"));
  let b: typeof schema.bookings.$inferSelect | undefined;
  try {
    [b] = await getDb()
      .update(schema.bookings)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(schema.bookings.id, id), eq(schema.bookings.clinicId, clinic.id)))
      .returning();
  } catch (e) {
    if (isUniqueViolation(e)) {
      return back("/admin/bookings", { date: str(form, "returnDate"), error: "That slot has been booked again — reschedule instead" });
    }
    throw e;
  }
  if (b && status === "completed") await markVisit(clinic.id, b.patientId);
  if (b && status === "cancelled") await notifyBookingChanged(b.id, "cancelled");
  back("/admin/bookings", { date: str(form, "returnDate") || b?.date || "" });
}

export async function createManualBooking(form: FormData) {
  const { clinic } = await requireStaff();
  const date = str(form, "date");
  const phone = normalizeIndianMobile(str(form, "phone"));
  const fail = (error: string) => back("/admin/bookings/new", { date, error });
  if (!phone) return fail("Enter a valid 10-digit mobile number");
  if (str(form, "name").length < 2) return fail("Enter the patient's name");
  try {
    await createBooking({
      clinicId: clinic.id, source: "manual", consent: form.get("consent") === "on",
      treatmentId: optional(form, "treatmentId"), date, time: str(form, "time"),
      name: str(form, "name"), phone, notes: optional(form, "notes"),
    });
  } catch (e) {
    if (e instanceof BookingError) return fail(e.message);
    throw e;
  }
  back("/admin/bookings", { date, ok: "Booking added" });
}

export async function rescheduleBooking(form: FormData) {
  const { clinic } = await requireStaff();
  const id = str(form, "id");
  const date = str(form, "date");
  const time = str(form, "time");
  const fail = (error: string) => back(`/admin/bookings/${id}`, { date, error });
  const slot = (await getSlots(clinic.id, date, { ignoreNotice: true })).find((s) => s.time === time);
  if (!slot?.free) return fail("That time is not free");
  try {
    // Single-chair clinics: chair 1. Multi-chair: pick the next free chair.
    const taken = await getDb()
      .select({ chair: schema.bookings.chairNo })
      .from(schema.bookings)
      .where(and(eq(schema.bookings.clinicId, clinic.id), eq(schema.bookings.date, date),
        eq(schema.bookings.startTime, time), sql`${schema.bookings.status} <> 'cancelled'`, sql`${schema.bookings.id} <> ${id}`));
    const used = taken.map((t) => t.chair);
    let chair = 1;
    while (used.includes(chair)) chair++;
    const moved = await getDb()
      .update(schema.bookings)
      .set({ date, startTime: time, chairNo: chair, status: "confirmed", updatedAt: new Date() })
      .where(and(eq(schema.bookings.id, id), eq(schema.bookings.clinicId, clinic.id)))
      .returning({ id: schema.bookings.id });
    if (!moved.length) return fail("Booking not found");
  } catch (e) {
    if (isUniqueViolation(e)) return fail("That time was just taken");
    throw e;
  }
  await notifyBookingChanged(id, "rescheduled");
  back("/admin/bookings", { date, ok: "Booking moved" });
}

// ─────────────── Media ───────────────

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 200 * 1024 * 1024;

/** Step 1 of an upload: the browser asks for a one-time signed URL, then uploads straight to storage. */
export async function getUploadUrl(fileName: string, contentType: string, size: number) {
  const { clinic } = await requireStaff();
  const kind = contentType.startsWith("video/") ? "video" : contentType.startsWith("image/") ? "image" : null;
  if (!kind) return { error: "Only images and videos can be uploaded" };
  if (size > (kind === "video" ? MAX_VIDEO : MAX_IMAGE)) return { error: kind === "video" ? "Videos up to 200 MB" : "Images up to 10 MB" };
  const ext = (fileName.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${clinic.id}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin().storage.from("media").createSignedUploadUrl(path);
  if (error || !data) return { error: "Could not start upload" };
  return { path, token: data.token, kind };
}

/** Step 2: after the upload finishes, save the media row. */
export async function saveMedia(input: { path: string; kind: "image" | "video"; section: string; title: string }) {
  const { clinic } = await requireStaff();
  if (!input.path.startsWith(`${clinic.id}/`)) throw new Error("Bad path");
  const section = z.enum(MEDIA_SECTIONS).parse(input.section);
  const url = supabaseAdmin().storage.from("media").getPublicUrl(input.path).data.publicUrl;
  const [{ max }] = await getDb()
    .select({ max: sql<number>`coalesce(max(${schema.media.sort}), 0)` })
    .from(schema.media)
    .where(and(eq(schema.media.clinicId, clinic.id), eq(schema.media.section, section)));
  await getDb().insert(schema.media).values({
    clinicId: clinic.id, kind: input.kind, url, storagePath: input.path, section,
    title: input.title.slice(0, 120), alt: input.title.slice(0, 200), sort: Number(max) + 1, isVisible: true,
  });
  updateTag(clinicTag(clinic.id));
}

export async function addVideoLink(form: FormData) {
  const { clinic } = await requireStaff();
  const section = z.enum(MEDIA_SECTIONS).parse(str(form, "section"));
  const url = str(form, "url");
  if (!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) return back("/admin/media", { section, error: "Paste a YouTube link" });
  await getDb().insert(schema.media).values({
    clinicId: clinic.id, kind: "video", url, section, title: str(form, "title"), alt: str(form, "title"),
    sort: Date.now() % 1_000_000, isVisible: true,
  });
  updateTag(clinicTag(clinic.id));
  back("/admin/media", { section });
}

export async function updateMedia(form: FormData) {
  const { clinic } = await requireStaff();
  const id = str(form, "id");
  const action = str(form, "action");
  const db = getDb();
  const where = and(eq(schema.media.id, id), eq(schema.media.clinicId, clinic.id));
  const [item] = await db.select().from(schema.media).where(where);
  if (!item) return;
  if (action === "toggle") await db.update(schema.media).set({ isVisible: !item.isVisible }).where(where);
  if (action === "save") {
    await db.update(schema.media).set({
      alt: str(form, "alt"), title: str(form, "alt"),
      treatmentId: optional(form, "treatmentId"),
    }).where(where);
  }
  if (action === "up" || action === "down") {
    const siblings = await db.select().from(schema.media)
      .where(and(eq(schema.media.clinicId, clinic.id), eq(schema.media.section, item.section)))
      .orderBy(schema.media.sort, schema.media.createdAt);
    const i = siblings.findIndex((m) => m.id === id);
    const j = action === "up" ? i - 1 : i + 1;
    if (siblings[j]) {
      const order = [...siblings];
      [order[i], order[j]] = [order[j], order[i]];
      await db.transaction(async (tx) => {
        for (const [n, m] of order.entries()) {
          await tx.update(schema.media).set({ sort: n }).where(eq(schema.media.id, m.id));
        }
      });
    }
  }
  if (action === "delete") {
    if (item.storagePath) await supabaseAdmin().storage.from("media").remove([item.storagePath]);
    await db.delete(schema.media).where(where);
  }
  updateTag(clinicTag(clinic.id));
  back("/admin/media", { section: item.section });
}

// ─────────────── Treatments ───────────────

/** FAQs are edited as lines: "Question? | Answer" */
function parseFaqs(text: string) {
  return text.split("\n").map((l) => l.split("|")).filter((p) => p.length >= 2 && p[0].trim())
    .map(([q, ...a]) => ({ q: q.trim(), a: a.join("|").trim() }));
}
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export async function saveTreatment(form: FormData) {
  const { clinic } = await requireStaff();
  const id = optional(form, "id");
  const name = str(form, "name");
  if (name.length < 2) return back("/admin/treatments", { error: "Treatment name is required" });
  const slug = slugify(str(form, "slug") || name);
  if (!slug) return back("/admin/treatments", { error: "Type the web address (slug) in English letters, e.g. teeth-cleaning" });
  const values = {
    name,
    slug,
    shortDesc: str(form, "shortDesc"),
    body: str(form, "body"),
    faqs: parseFaqs(str(form, "faqs")),
    durationMinutes: Math.max(5, Number(str(form, "durationMinutes")) || 30),
    sort: Number(str(form, "sort")) || 0,
    isActive: form.get("isActive") === "on",
  };
  try {
    if (id) {
      await getDb().update(schema.treatments).set(values)
        .where(and(eq(schema.treatments.id, id), eq(schema.treatments.clinicId, clinic.id)));
    } else {
      await getDb().insert(schema.treatments).values({ ...values, clinicId: clinic.id });
    }
  } catch (e) {
    if (isUniqueViolation(e)) return back("/admin/treatments", { error: "Another treatment already uses that web address (slug)" });
    throw e;
  }
  updateTag(clinicTag(clinic.id));
  back("/admin/treatments", { ok: "Saved" });
}

// ─────────────── Settings (doctor only) ───────────────

/** Accepts the embed link or the whole <iframe …> code from Google Maps › Share › Embed. Only Google Maps embeds are kept. */
function mapEmbedSrc(input: string) {
  const src = (input.match(/src\s*=\s*["']([^"']+)["']/i)?.[1] ?? input).trim().replace(/&amp;/g, "&");
  return /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed\?/.test(src) ? src : null;
}

export async function saveClinicProfile(form: FormData) {
  const { clinic } = await requireDoctor();
  const phone = normalizeIndianMobile(str(form, "phone"));
  if (!phone) return back("/admin/settings", { error: "Enter a valid clinic phone number" });
  if (str(form, "mapEmbedUrl") && !mapEmbedSrc(str(form, "mapEmbedUrl"))) {
    return back("/admin/settings", { error: "Map: paste the code from Google Maps › Share › Embed a map" });
  }
  const wa = normalizeIndianMobile(str(form, "whatsappNumber"));
  const rating = Number(str(form, "googleRating"));
  await getDb().update(schema.clinics).set({
    name: str(form, "name"), tagline: optional(form, "tagline"), phone,
    whatsappNumber: wa ? wa.replace("+", "") : null, email: optional(form, "email"),
    address: str(form, "address"), area: optional(form, "area"), city: str(form, "city") || "Indore",
    mapUrl: optional(form, "mapUrl"), mapEmbedUrl: mapEmbedSrc(str(form, "mapEmbedUrl")),
    doctorName: optional(form, "doctorName"), doctorDegrees: optional(form, "doctorDegrees"),
    doctorRegNo: optional(form, "doctorRegNo"), doctorBio: optional(form, "doctorBio"),
    doctorExperience: Number(str(form, "doctorExperience")) || null, languages: optional(form, "languages"),
    googleReviewsUrl: optional(form, "googleReviewsUrl"),
    googleRating: rating >= 1 && rating <= 5 ? String(rating) : null,
    googleReviewCount: Number(str(form, "googleReviewCount")) || null,
  }).where(eq(schema.clinics.id, clinic.id));
  updateTag("clinics");
  updateTag(clinicTag(clinic.id));
  back("/admin/settings", { ok: "Clinic details saved" });
}

export async function saveTimings(form: FormData) {
  const { clinic } = await requireDoctor();
  const t = (k: string) => (/^\d{2}:\d{2}$/.test(str(form, k)) ? str(form, k) : null);
  const values = {
    openDays: form.getAll("openDays").map(Number).filter((d) => d >= 0 && d <= 6),
    morningStart: t("morningStart"), morningEnd: t("morningEnd"),
    eveningStart: t("eveningStart"), eveningEnd: t("eveningEnd"),
    slotMinutes: Math.min(120, Math.max(10, Number(str(form, "slotMinutes")) || 30)),
    chairs: Math.min(20, Math.max(1, Number(str(form, "chairs")) || 1)),
    daysAhead: Math.min(90, Math.max(1, Number(str(form, "daysAhead")) || 14)),
    minNoticeMinutes: Math.max(0, Number(str(form, "minNoticeMinutes")) || 0),
  };
  await getDb().insert(schema.clinicSettings).values({ clinicId: clinic.id, ...values })
    .onConflictDoUpdate({ target: schema.clinicSettings.clinicId, set: values });
  updateTag(clinicTag(clinic.id));
  back("/admin/settings", { ok: "Timings saved" });
}

export async function addHoliday(form: FormData) {
  const { clinic } = await requireDoctor();
  const date = str(form, "date");
  if (!isIsoDate(date)) return back("/admin/settings", { error: "Pick a date" });
  await getDb().insert(schema.holidays).values({ clinicId: clinic.id, date, reason: optional(form, "reason") }).onConflictDoNothing();
  back("/admin/settings", { ok: "Holiday added" });
}

export async function removeHoliday(form: FormData) {
  const { clinic } = await requireDoctor();
  await getDb().delete(schema.holidays)
    .where(and(eq(schema.holidays.id, str(form, "id")), eq(schema.holidays.clinicId, clinic.id)));
  back("/admin/settings", {});
}
