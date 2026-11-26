import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinic } from "@/lib/data";
import { BookingError, createBooking } from "@/lib/booking";
import { normalizeIndianMobile } from "@/lib/phone";
import { isIsoDate } from "@/lib/slots";

const Body = z.object({
  treatmentId: z.string().uuid().nullable(),
  date: z.string().refine(isIsoDate),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(80),
  phone: z.string().min(10).max(16),
  notes: z.string().trim().max(300).optional().nullable(),
  consent: z.literal(true),
  website: z.string().max(0).optional(), // honeypot: real people leave it empty
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the details and try again." }, { status: 400 });
  const phone = normalizeIndianMobile(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 });

  const clinic = await requireClinic();
  try {
    const b = await createBooking({ ...parsed.data, phone, clinicId: clinic.id, source: "web" });
    return NextResponse.json({ booking: { id: b.id, date: b.date, time: b.startTime.slice(0, 5) } }, { status: 201 });
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "slot_taken" ? 409 : 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Something went wrong. Please call the clinic." }, { status: 500 });
  }
}
