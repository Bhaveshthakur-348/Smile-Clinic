import { getHolidayDates, getSiteContent, requireClinic, toSlotSettings } from "@/lib/data";
import { bookableDates, nowIn } from "@/lib/slots";
import { formatDate } from "@/lib/format";
import { BookingWizard } from "./BookingWizard";

export const metadata = { title: "Book an appointment" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ treatment?: string }> }) {
  const c = await requireClinic();
  const { settings, treatments } = await getSiteContent(c.id);
  if (!settings) {
    return <p className="mx-auto max-w-xl px-5 py-20 text-center">Online booking is not set up yet. Please call {c.phone}.</p>;
  }
  const dates = bookableDates(toSlotSettings(settings), await getHolidayDates(c.id), nowIn().date).map((d) => ({
    iso: d,
    dow: formatDate(d, { weekday: "short" }),
    day: formatDate(d, { day: "numeric" }),
    month: formatDate(d, { month: "short" }),
    label: formatDate(d),
  }));
  const pre = (await searchParams).treatment;
  return (
    <div className="mx-auto max-w-xl px-5 py-8 md:py-12">
      <BookingWizard
        clinic={{ name: c.name, area: c.area ?? c.city, mapUrl: c.mapUrl, phone: c.phone }}
        treatments={treatments.map((t) => ({ id: t.id, name: t.name, slug: t.slug, duration: t.durationMinutes }))}
        dates={dates}
        initialTreatmentId={treatments.find((t) => t.slug === pre)?.id ?? null}
      />
    </div>
  );
}
