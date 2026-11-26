import { and, asc, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireDoctor } from "@/lib/auth";
import { nowIn } from "@/lib/slots";
import { formatDate } from "@/lib/format";
import { addHoliday, removeHoliday, saveClinicProfile, saveTimings } from "@/app/admin/actions";
import { Field, Flash, PageHead, btn, btnGhost, card, input } from "@/components/admin/ui";

export const metadata = { title: "Settings" };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const t5 = (v: string | null | undefined) => (v ? v.slice(0, 5) : "");

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { clinic: c } = await requireDoctor();
  const sp = await searchParams;
  const db = getDb();
  const [[s], holidays] = await Promise.all([
    db.select().from(schema.clinicSettings).where(eq(schema.clinicSettings.clinicId, c.id)),
    db.select().from(schema.holidays).where(and(eq(schema.holidays.clinicId, c.id), gte(schema.holidays.date, nowIn().date))).orderBy(asc(schema.holidays.date)),
  ]);
  const text = (name: keyof typeof c, labelText: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field name={name} labelText={labelText}>
      <input id={name} name={name} defaultValue={(c[name] as string | number | null) ?? ""} className={input} {...extra} />
    </Field>
  );

  return (
    <>
      <PageHead title="Settings" sub="Only the doctor login can change these" />
      <Flash ok={sp.ok} error={sp.error} />

      <section className={`${card} flex flex-col gap-4 p-6`}>
        <h2 className="text-lg font-extrabold">Timings &amp; slots</h2>
        <form action={saveTimings} className="grid gap-4 md:grid-cols-2">
          <fieldset className="md:col-span-2">
            <legend className="mb-2 text-[13px] font-bold">Open days</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d, i) => (
                <label key={d} className="flex min-h-10 items-center gap-1.5 rounded-lg border border-[#dde7e6] px-3 text-sm font-semibold">
                  <input type="checkbox" name="openDays" value={i} defaultChecked={s?.openDays.includes(i) ?? i !== 0} className="accent-brand-600" />{d}
                </label>
              ))}
            </div>
          </fieldset>
          <Field name="morningStart" labelText="Morning from"><input id="morningStart" name="morningStart" type="time" defaultValue={t5(s?.morningStart)} className={input} /></Field>
          <Field name="morningEnd" labelText="Morning until"><input id="morningEnd" name="morningEnd" type="time" defaultValue={t5(s?.morningEnd)} className={input} /></Field>
          <Field name="eveningStart" labelText="Evening from"><input id="eveningStart" name="eveningStart" type="time" defaultValue={t5(s?.eveningStart)} className={input} /></Field>
          <Field name="eveningEnd" labelText="Evening until"><input id="eveningEnd" name="eveningEnd" type="time" defaultValue={t5(s?.eveningEnd)} className={input} /></Field>
          <Field name="slotMinutes" labelText="Slot length (minutes)"><input id="slotMinutes" name="slotMinutes" type="number" min={10} max={120} step={5} defaultValue={s?.slotMinutes ?? 30} className={input} /></Field>
          <Field name="chairs" labelText="Patients per slot (chairs)"><input id="chairs" name="chairs" type="number" min={1} max={20} defaultValue={s?.chairs ?? 1} className={input} /></Field>
          <Field name="daysAhead" labelText="Bookable days ahead"><input id="daysAhead" name="daysAhead" type="number" min={1} max={90} defaultValue={s?.daysAhead ?? 14} className={input} /></Field>
          <Field name="minNoticeMinutes" labelText="Minimum notice (minutes)"><input id="minNoticeMinutes" name="minNoticeMinutes" type="number" min={0} step={15} defaultValue={s?.minNoticeMinutes ?? 60} className={input} /></Field>
          <p className="text-[13px] text-muted md:col-span-2">Leave a session's times empty if the clinic doesn't open then.</p>
          <div className="md:col-span-2"><button type="submit" className={btn}>Save timings</button></div>
        </form>
      </section>

      <section className={`${card} flex flex-col gap-4 p-6`}>
        <h2 className="text-lg font-extrabold">Holidays &amp; doctor leave</h2>
        <form action={addHoliday} className="flex flex-wrap items-end gap-2">
          <Field name="hdate" labelText="Date"><input id="hdate" name="date" type="date" required className={input} /></Field>
          <Field name="reason" labelText="Reason (optional)"><input id="reason" name="reason" placeholder="Diwali" className={input} /></Field>
          <button type="submit" className={btn}>Add</button>
        </form>
        {holidays.length > 0 && (
          <ul className="flex flex-col divide-y divide-line">
            {holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span><b>{formatDate(h.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</b>{h.reason ? ` · ${h.reason}` : ""}</span>
                <form action={removeHoliday}><input type="hidden" name="id" value={h.id} /><button type="submit" className={btnGhost}>Remove</button></form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${card} flex flex-col gap-4 p-6`}>
        <h2 className="text-lg font-extrabold">Clinic &amp; doctor details</h2>
        <form action={saveClinicProfile} className="grid gap-4 md:grid-cols-2">
          {text("name", "Clinic name", { required: true })}
          {text("tagline", "Headline on home page")}
          {text("phone", "Clinic phone", { required: true, inputMode: "tel" })}
          {text("whatsappNumber", "WhatsApp number", { inputMode: "tel" })}
          {text("email", "Email", { type: "email" })}
          {text("address", "Street address", { required: true })}
          {text("area", "Area (e.g. Vijay Nagar)")}
          {text("city", "City")}
          {text("mapUrl", "Google Maps link", { type: "url" })}
          {text("mapEmbedUrl", "Map on website (paste the code from Google Maps › Share › Embed a map)", { placeholder: '<iframe src="https://www.google.com/maps/embed?…' })}
          {text("doctorName", "Doctor name")}
          {text("doctorDegrees", "Degrees (e.g. BDS, MDS (Endodontics))")}
          {text("doctorRegNo", "Registration number")}
          {text("doctorExperience", "Years of experience", { type: "number", min: 0 })}
          {text("languages", "Languages")}
          {text("googleReviewsUrl", "Google reviews link", { type: "url" })}
          {text("googleRating", "Google rating (e.g. 4.8)", { type: "number", step: 0.1, min: 1, max: 5 })}
          {text("googleReviewCount", "Number of Google reviews", { type: "number", min: 0 })}
          <div className="md:col-span-2">
            <Field name="doctorBio" labelText="Doctor introduction">
              <textarea id="doctorBio" name="doctorBio" rows={4} defaultValue={c.doctorBio ?? ""} className={input} />
            </Field>
          </div>
          <div className="md:col-span-2"><button type="submit" className={btn}>Save details</button></div>
        </form>
      </section>
    </>
  );
}
