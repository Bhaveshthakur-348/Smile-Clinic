import { NextResponse, type NextRequest } from "next/server";
import { requireClinic } from "@/lib/data";
import { BookingError, getSlots } from "@/lib/booking";
import { isIsoDate } from "@/lib/slots";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!isIsoDate(date)) return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  const clinic = await requireClinic();
  try {
    const slots = await getSlots(clinic.id, date);
    return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
