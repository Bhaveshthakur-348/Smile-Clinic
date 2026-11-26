import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { getSlots } from "@/lib/booking";
import { isIsoDate, nowIn } from "@/lib/slots";
import { createManualBooking } from "@/app/admin/actions";
import { Field, Flash, PageHead, btn, btnGhost, card, input } from "@/components/admin/ui";
import { SlotPicker } from "@/components/admin/SlotPicker";

export const metadata = { title: "New booking" };

export default async function NewBooking({ searchParams }: { searchParams: Promise<{ date?: string; error?: string }> }) {
  const { clinic } = await requireStaff();
  const sp = await searchParams;
  const date = sp.date && isIsoDate(sp.date) ? sp.date : nowIn().date;
  const [slots, treatments] = await Promise.all([
    getSlots(clinic.id, date, { ignoreNotice: true }).catch(() => []),
    getDb().select({ id: schema.treatments.id, name: schema.treatments.name }).from(schema.treatments)
      .where(and(eq(schema.treatments.clinicId, clinic.id), eq(schema.treatments.isActive, true)))
      .orderBy(asc(schema.treatments.sort)),
  ]);

  return (
    <>
      <PageHead title="New booking" sub="For phone calls and walk-ins">
        <Link href={`/admin/bookings?date=${date}`} className={btnGhost}>← Back</Link>
      </PageHead>
      <Flash error={sp.error} />
      <div className={`${card} flex max-w-xl flex-col gap-5 p-6`}>
        <form className="flex items-end gap-2">
          <Field name="date" labelText="Date">
            <input id="date" type="date" name="date" defaultValue={date} className={input} />
          </Field>
          <button type="submit" className={btnGhost}>Show slots</button>
        </form>
        <form action={createManualBooking} className="flex flex-col gap-4">
          <input type="hidden" name="date" value={date} />
          <Field name="time" labelText="Time"><SlotPicker slots={slots} /></Field>
          <Field name="treatmentId" labelText="Treatment">
            <select id="treatmentId" name="treatmentId" className={input}>
              <option value="">Check-up / not sure</option>
              {treatments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field name="name" labelText="Patient name"><input id="name" name="name" required minLength={2} className={input} /></Field>
          <Field name="phone" labelText="Mobile number"><input id="phone" name="phone" required inputMode="numeric" placeholder="98XXXXXXXX" className={input} /></Field>
          <Field name="notes" labelText="Notes (optional)"><input id="notes" name="notes" maxLength={300} className={input} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="consent" defaultChecked className="h-5 w-5 accent-brand-600" />Patient agreed to WhatsApp reminders</label>
          <button type="submit" className={btn} disabled={!slots.some((s) => s.free)}>Add booking</button>
        </form>
      </div>
    </>
  );
}
