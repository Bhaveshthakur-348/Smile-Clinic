import Link from "next/link";
import { and, asc, count as sqlCount, eq, gte, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { BookingStatus } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { addDays, isIsoDate, nowIn } from "@/lib/slots";
import { formatDate, formatTime } from "@/lib/format";
import { maskPhone } from "@/lib/phone";
import { setBookingStatus } from "@/app/admin/actions";
import { Flash, PageHead, btn, btnGhost, card, input } from "@/components/admin/ui";

export const metadata = { title: "Bookings" };

const STATUS: Record<BookingStatus, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-[#e6eefb] text-[#1d4b99]" },
  completed: { label: "Completed", cls: "bg-brand-200 text-[#0b5958]" },
  no_show: { label: "No-show", cls: "bg-[#fbe7e2] text-[#9a3412]" },
  cancelled: { label: "Cancelled", cls: "bg-[#eef0f0] text-[#4b5a59]" },
};
const SOURCE = { web: "Web", whatsapp: "WhatsApp", manual: "Manual" } as const;
const UPCOMING_LIMIT = 300;

type SP = Promise<{ date?: string; status?: string; view?: string; ok?: string; error?: string }>;

export default async function BookingsPage({ searchParams }: { searchParams: SP }) {
  const { clinic } = await requireStaff();
  const sp = await searchParams;
  const today = nowIn().date;
  const upcoming = sp.view === "upcoming";
  const date = sp.date && isIsoDate(sp.date) ? sp.date : today;
  const filter = (sp.status ?? "all") as BookingStatus | "all";
  const db = getDb();
  const b = schema.bookings;

  const columns = {
    id: b.id, date: b.date, time: b.startTime, status: b.status, source: b.source, notes: b.notes, chair: b.chairNo,
    name: schema.patients.name, phone: schema.patients.phone, treatment: schema.treatments.name,
  };
  const base = () => db.select(columns).from(b)
    .innerJoin(schema.patients, eq(schema.patients.id, b.patientId))
    .leftJoin(schema.treatments, eq(schema.treatments.id, b.treatmentId));

  // Upcoming = today onwards, still confirmed. Day view = everything on one date.
  const upcomingWhere = and(eq(b.clinicId, clinic.id), gte(b.date, today), eq(b.status, "confirmed"));
  const [rows, [{ n: upcomingCount }]] = await Promise.all([
    upcoming
      ? base().where(upcomingWhere).orderBy(asc(b.date), asc(b.startTime), asc(b.chairNo)).limit(UPCOMING_LIMIT)
      : base().where(and(eq(b.clinicId, clinic.id), eq(b.date, date))).orderBy(asc(b.startTime), asc(b.chairNo)),
    db.select({ n: sqlCount() }).from(b).where(upcomingWhere),
  ]);

  const count = (s: BookingStatus) => rows.filter((r) => r.status === s).length;
  const shown = upcoming || filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const q = (p: Record<string, string>) => `/admin/bookings?${new URLSearchParams({ date, ...(filter !== "all" ? { status: filter } : {}), ...p })}`;
  const tab = (on: boolean) => `rounded-full border px-4 py-2 text-[13px] font-bold ${on ? "border-ink bg-ink text-white" : "border-[#dde7e6] bg-white text-[#334b4f]"}`;
  const error = sp.error === "doctor-only" ? "Only the doctor login can open Settings" : sp.error;

  return (
    <>
      <PageHead
        title="Bookings"
        sub={upcoming ? `All confirmed bookings from today (${upcomingCount})` : formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      >
        {!upcoming && (
          <>
            <Link href={q({ date: addDays(date, -1) })} className={btnGhost} aria-label="Previous day">←</Link>
            <form className="flex gap-2">
              <label htmlFor="d" className="sr-only">Date</label>
              <input id="d" type="date" name="date" defaultValue={date} className={`${input} w-auto`} />
              <button type="submit" className={btnGhost}>Go</button>
            </form>
            <Link href={q({ date: addDays(date, 1) })} className={btnGhost} aria-label="Next day">→</Link>
            {date !== today && <Link href="/admin/bookings" className={btnGhost}>Today</Link>}
          </>
        )}
        <Link href={`/admin/bookings/new?date=${date}`} className={btn}>+ New booking</Link>
      </PageHead>

      <nav aria-label="Bookings view" className="flex flex-wrap gap-2">
        <Link href="/admin/bookings" aria-current={!upcoming ? "page" : undefined} className={tab(!upcoming)}>One day</Link>
        <Link href="/admin/bookings?view=upcoming" aria-current={upcoming ? "page" : undefined} className={tab(upcoming)}>
          All upcoming ({upcomingCount})
        </Link>
      </nav>

      <Flash ok={sp.ok} error={error} />

      {!upcoming && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
            {[["Bookings", rows.filter((r) => r.status !== "cancelled").length], ["Upcoming", count("confirmed")], ["Completed", count("completed")], ["No-shows", count("no_show")]].map(([l, v]) => (
              <div key={l} className={`${card} flex flex-col gap-1.5 p-4`}>
                <span className="text-[13px] font-semibold text-muted">{l}</span>
                <span className="text-3xl font-extrabold">{v}</span>
              </div>
            ))}
          </div>

          <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
            {(["all", "confirmed", "completed", "no_show", "cancelled"] as const).map((s) => {
              const on = filter === s;
              return (
                <Link key={s} href={`/admin/bookings?${new URLSearchParams({ date, ...(s !== "all" ? { status: s } : {}) })}`}
                  aria-current={on ? "true" : undefined}
                  className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold ${on ? "border-ink bg-ink text-white" : "border-[#dde7e6] bg-white text-[#334b4f]"}`}>
                  {s === "all" ? "All" : STATUS[s].label}
                </Link>
              );
            })}
          </nav>
        </>
      )}

      <div className={`${card} overflow-x-auto`}>
        {shown.length === 0 ? (
          <p className="p-8 text-center text-muted">
            {upcoming ? "No upcoming bookings." : <>No bookings for this day.{upcomingCount > 0 && <> <Link href="/admin/bookings?view=upcoming" className="font-semibold text-brand-600 underline">See all {upcomingCount} upcoming</Link></>}</>}
          </p>
        ) : (
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs tracking-wide text-muted">
                {[upcoming ? "DATE & TIME" : "TIME", "PATIENT", "TREATMENT", "SOURCE", "STATUS", "ACTIONS"].map((h) => <th key={h} className="px-4 py-3.5 font-bold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => {
                const newDay = upcoming && r.date !== shown[i - 1]?.date;
                return (
                  <tr key={r.id} className={`align-top ${newDay && i > 0 ? "border-t-2 border-[#dde7e6]" : "border-t border-[#eef3f2]"}`}>
                    <td className="px-4 py-3.5 font-bold">
                      {upcoming && (
                        <Link href={`/admin/bookings?date=${r.date}`} className={`block text-xs ${newDay ? "text-brand-600" : "text-transparent"} hover:underline`}>
                          {r.date === today ? "Today" : formatDate(r.date, { weekday: "short", day: "numeric", month: "short" })}
                        </Link>
                      )}
                      {formatTime(r.time)}
                      {r.chair > 1 && <span className="block text-xs font-medium text-muted">Chair {r.chair}</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="block font-semibold">{r.name}</span>
                      <a href={`tel:${r.phone}`} className="text-xs text-muted" title={r.phone}>{maskPhone(r.phone)}</a>
                      {r.notes && <span className="mt-1 block max-w-56 text-xs text-ink-soft">“{r.notes}”</span>}
                    </td>
                    <td className="px-4 py-3.5">{r.treatment ?? "Check-up"}</td>
                    <td className="px-4 py-3.5"><span className="rounded-full bg-[#f1eee6] px-2.5 py-1 text-xs font-bold text-[#6a5524]">{SOURCE[r.source]}</span></td>
                    <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span></td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {r.status === "confirmed" && (
                          <>
                            <StatusButton id={r.id} date={r.date} upcoming={upcoming} status="completed" text="Done" />
                            <StatusButton id={r.id} date={r.date} upcoming={upcoming} status="no_show" text="No-show" />
                            <Link href={`/admin/bookings/${r.id}`} className={btnGhost}>Reschedule</Link>
                            <StatusButton id={r.id} date={r.date} upcoming={upcoming} status="cancelled" text="Cancel" />
                          </>
                        )}
                        {r.status !== "confirmed" && <StatusButton id={r.id} date={r.date} upcoming={upcoming} status="confirmed" text="Undo" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {upcoming && Number(upcomingCount) > UPCOMING_LIMIT && (
        <p className="text-[13px] text-muted">Showing the first {UPCOMING_LIMIT}. Use the One day view for later dates.</p>
      )}
    </>
  );
}

function StatusButton({ id, date, upcoming, status, text }: { id: string; date: string; upcoming: boolean; status: BookingStatus; text: string }) {
  return (
    <form action={setBookingStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="returnDate" value={date} />
      {upcoming && <input type="hidden" name="returnView" value="upcoming" />}
      <button type="submit" className={btnGhost}>{text}</button>
    </form>
  );
}
