import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { and, asc, eq, gte, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { nowIn, type SlotSettings } from "@/lib/slots";

export const clinicTag = (clinicId: string) => `clinic:${clinicId}`;

/** Find the clinic for this request: by custom domain, else DEFAULT_CLINIC_SLUG (localhost, *.vercel.app). */
export const getClinic = cache(async () => {
  const host = ((await headers()).get("host") ?? "").split(":")[0].replace(/^www\./, "");
  const slug = process.env.DEFAULT_CLINIC_SLUG ?? "smile-care-dental";
  return unstable_cache(
    async () => {
      const rows = await getDb()
        .select()
        .from(schema.clinics)
        .where(or(eq(schema.clinics.domain, host), eq(schema.clinics.slug, slug)));
      return rows.find((r) => r.domain === host) ?? rows.find((r) => r.slug === slug) ?? null;
    },
    ["clinic-by-host", host, slug],
    { tags: ["clinics"], revalidate: 3600 },
  )();
});

export async function requireClinic() {
  const clinic = await getClinic();
  if (!clinic) throw new Error("No clinic found — run supabase/002_seed_demo.sql or check DEFAULT_CLINIC_SLUG");
  return clinic;
}

/** Everything the public site renders, cached until an admin edit calls updateTag(clinicTag(id)). */
export function getSiteContent(clinicId: string) {
  return unstable_cache(
    async () => {
      const db = getDb();
      const [settings] = await db.select().from(schema.clinicSettings).where(eq(schema.clinicSettings.clinicId, clinicId));
      const treatments = await db
        .select()
        .from(schema.treatments)
        .where(and(eq(schema.treatments.clinicId, clinicId), eq(schema.treatments.isActive, true)))
        .orderBy(asc(schema.treatments.sort), asc(schema.treatments.name));
      const media = await db
        .select()
        .from(schema.media)
        .where(and(eq(schema.media.clinicId, clinicId), eq(schema.media.isVisible, true)))
        .orderBy(asc(schema.media.sort), asc(schema.media.createdAt));
      return { settings: settings ?? null, treatments, media };
    },
    ["site-content", clinicId],
    { tags: [clinicTag(clinicId)], revalidate: 3600 },
  )();
}

export async function getHolidayDates(clinicId: string) {
  const today = nowIn().date;
  const rows = await getDb()
    .select({ date: schema.holidays.date })
    .from(schema.holidays)
    .where(and(eq(schema.holidays.clinicId, clinicId), gte(schema.holidays.date, today)));
  return rows.map((r) => r.date);
}

export function toSlotSettings(s: typeof schema.clinicSettings.$inferSelect): SlotSettings {
  const t = (v: string | null) => (v ? v.slice(0, 5) : null);
  return {
    openDays: s.openDays,
    morningStart: t(s.morningStart),
    morningEnd: t(s.morningEnd),
    eveningStart: t(s.eveningStart),
    eveningEnd: t(s.eveningEnd),
    slotMinutes: s.slotMinutes,
    chairs: s.chairs,
    daysAhead: s.daysAhead,
    minNoticeMinutes: s.minNoticeMinutes,
  };
}
