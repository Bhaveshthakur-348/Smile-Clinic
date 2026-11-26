import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { getSlots } from "@/lib/booking";
import { formatDate, formatTime } from "@/lib/format";
import { isIsoDate } from "@/lib/slots";
import { rescheduleBooking } from "@/app/admin/actions";
import { Field, Flash, PageHead, btn, btnGhost, card, input } from "@/components/admin/ui";
import { SlotPicker } from "@/components/admin/SlotPicker";

export const metadata = { title: "Reschedule" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ date?: string; error?: string }> };

export default async function Reschedule({ params, searchParams }: Props) {
  const { clinic } = await requireStaff();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const [b] = await getDb()
    .select({ date: schema.bookings.date, time: schema.bookings.startTime, name: schema.patients.name })
    .from(schema.bookings)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.bookings.patientId))
    .where(and(eq(schema.bookings.id, id), eq(schema.bookings.clinicId, clinic.id)));
  if (!b) notFound();
  const date = sp.date && isIsoDate(sp.date) ? sp.date : b.date;
  const slots = await getSlots(clinic.id, date, { ignoreNotice: true }).catch(() => []);

  return (
    <>
      <PageHead title={`Reschedule ${b.name}`} sub={`Currently ${formatDate(b.date)} at ${formatTime(b.time)}`}>
        <Link href={`/admin/bookings?date=${b.date}`} className={btnGhost}>← Back</Link>
      </PageHead>
      <Flash error={sp.error} />
      <div className={`${card} flex max-w-xl flex-col gap-5 p-6`}>
        <form className="flex items-end gap-2">
          <Field name="date" labelText="New date"><input id="date" type="date" name="date" defaultValue={date} className={input} /></Field>
          <button type="submit" className={btnGhost}>Show slots</button>
        </form>
        <form action={rescheduleBooking} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="date" value={date} />
          <Field name="time" labelText="New time"><SlotPicker slots={slots} /></Field>
          <p className="text-[13px] text-muted">The patient will get a WhatsApp update once WhatsApp is connected (Phase 3).</p>
          <button type="submit" className={btn} disabled={!slots.some((s) => s.free)}>Move booking</button>
        </form>
      </div>
    </>
  );
}
