"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackIcon, CheckIcon } from "@/components/site/icons";

type Treatment = { id: string; name: string; slug: string; duration: number };
type DateOpt = { iso: string; dow: string; day: string; month: string; label: string };
type Slot = { time: string; label: string; session: "morning" | "evening"; free: boolean };
type Props = {
  clinic: { name: string; area: string; mapUrl: string | null; phone: string };
  treatments: Treatment[];
  dates: DateOpt[];
  initialTreatmentId: string | null;
};

const CHECKUP = "__checkup__";
const pill = (on: boolean) =>
  on ? "border-2 border-brand-600 bg-brand-100" : "border-[1.5px] border-line bg-white hover:border-brand-300";

export function BookingWizard({ clinic, treatments, dates, initialTreatmentId }: Props) {
  const [step, setStep] = useState(initialTreatmentId ? 2 : 1);
  const [treatmentId, setTreatmentId] = useState<string | null>(initialTreatmentId);
  const [date, setDate] = useState<DateOpt | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const treatment = treatments.find((t) => t.id === treatmentId);
  const treatmentName = treatmentId === CHECKUP ? "Check-up / not sure" : treatment?.name ?? "";

  useEffect(() => {
    if (!date) return;
    let live = true;
    setSlots(null);
    setSlot(null);
    fetch(`/api/slots?date=${date.iso}`)
      .then((r) => r.json())
      .then((d) => live && setSlots(d.slots ?? []))
      .catch(() => live && setError("Couldn't load times. Please try again."));
    return () => { live = false; };
  }, [date]);

  const canNext =
    (step === 1 && treatmentId) || (step === 2 && date) || (step === 3 && slot) ||
    (step === 4 && name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 10 && consent);

  async function submit() {
    if (!date || !slot) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        treatmentId: treatmentId === CHECKUP ? null : treatmentId,
        date: date.iso, time: slot.time, name, phone, notes: notes || null, consent, website: "",
      }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) return setStep(5);
    const body = await res?.json().catch(() => null);
    setError(body?.error ?? "Booking failed. Please call the clinic.");
    if (res?.status === 409) { setStep(3); setDate({ ...date }); } // reload times
  }

  const next = () => (step === 4 ? submit() : setStep(step + 1));

  return (
    <div className="flex flex-col gap-6">
      {step < 5 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            {step > 1 ? (
              <button type="button" onClick={() => { setError(null); setStep(step - 1); }} aria-label="Back"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-line">
                <BackIcon className="h-5 w-5" />
              </button>
            ) : <span className="h-11 w-11" />}
            <span className="text-sm font-semibold text-muted">Step {step} of 4</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => <span key={n} className={`h-1.5 rounded-full ${n <= step ? "bg-brand-600" : "bg-line"}`} />)}
          </div>
        </div>
      )}

      {error && <p role="alert" className="rounded-xl bg-[#fbe7e2] px-4 py-3 text-sm font-semibold text-[#9a3412]">{error}</p>}

      {step === 1 && (
        <section className="flex flex-col gap-4">
          <h1 className="text-2xl font-extrabold">What do you need?</h1>
          <p className="text-sm text-muted">Not sure? Choose Check-up — the doctor will guide you.</p>
          <div className="flex flex-col gap-2.5">
            {(treatments.some((t) => t.slug === "check-up")
              ? treatments
              : [{ id: CHECKUP, name: "Check-up / not sure", slug: "", duration: 15 }, ...treatments]
            ).map((t) => (
              <button key={t.id} type="button" onClick={() => setTreatmentId(t.id)} aria-pressed={treatmentId === t.id}
                className={`flex min-h-14 items-center justify-between rounded-2xl px-4 text-left text-[15px] font-semibold ${pill(treatmentId === t.id)}`}>
                <span>{t.name}</span>
                <span className="text-[13px] font-medium text-muted">{t.duration} min</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-4">
          <h1 className="text-2xl font-extrabold">Pick a date</h1>
          <p className="text-sm text-muted">{treatmentName}</p>
          {dates.length === 0 && <p>No dates open right now. Please call {clinic.phone}.</p>}
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {dates.map((d) => {
              const on = date?.iso === d.iso;
              return (
                <button key={d.iso} type="button" onClick={() => setDate(d)} aria-pressed={on}
                  className={`flex min-h-[72px] flex-col items-center justify-center rounded-2xl ${on ? "bg-brand-600 text-white" : "border-[1.5px] border-line bg-white"}`}>
                  <span className="text-xs font-semibold">{d.dow}</span>
                  <span className="text-xl font-extrabold">{d.day}</span>
                  <span className="text-[11px]">{d.month}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 3 && date && (
        <section className="flex flex-col gap-4">
          <h1 className="text-2xl font-extrabold">Choose a time</h1>
          <p className="text-sm text-muted">{date.label} · greyed times are booked</p>
          {!slots && <p className="text-muted">Loading times…</p>}
          {slots && slots.filter((s) => s.free).length === 0 && <p>No free times on this day — please pick another date.</p>}
          {slots && (["morning", "evening"] as const).map((session) => {
            const list = slots.filter((s) => s.session === session);
            if (!list.length) return null;
            return (
              <div key={session} className="flex flex-col gap-2.5">
                <span className="text-[13px] font-bold capitalize text-[#334b4f]">{session}</span>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {list.map((s) => {
                    const on = slot?.time === s.time;
                    return (
                      <button key={s.time} type="button" disabled={!s.free} onClick={() => setSlot(s)} aria-pressed={on}
                        className={`min-h-12 rounded-xl text-sm font-semibold ${!s.free ? "bg-[#f4f6f6] text-[#8a9a99] line-through" : on ? "bg-brand-600 text-white" : "border-[1.5px] border-line bg-white"}`}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {step === 4 && date && slot && (
        <section className="flex flex-col gap-3">
          <h1 className="text-2xl font-extrabold">Your details</h1>
          <div className="rounded-2xl bg-brand-50 px-4 py-3.5 text-sm leading-relaxed">
            <b>{treatmentName}</b><br />{date.label} · {slot.label}
          </div>
          <label htmlFor="name" className="mt-2 text-[13px] font-bold">Full name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="e.g. Rahul Verma"
            className="h-13 rounded-xl border-[1.5px] border-[#cfe2df] px-3.5 py-3 text-[15px]" />
          <label htmlFor="phone" className="mt-2 text-[13px] font-bold">Mobile number (WhatsApp)</label>
          <div className="flex gap-2">
            <span className="flex items-center rounded-xl bg-brand-50 px-3.5 font-semibold">+91</span>
            <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel-national" placeholder="98XXXXXXXX"
              className="min-w-0 flex-1 rounded-xl border-[1.5px] border-[#cfe2df] px-3.5 py-3 text-[15px]" />
          </div>
          <label htmlFor="notes" className="mt-2 text-[13px] font-bold">Problem (optional)</label>
          <input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="e.g. pain in lower left tooth"
            className="rounded-xl border-[1.5px] border-[#cfe2df] px-3.5 py-3 text-[15px]" />
          <label className="mt-2 flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 accent-brand-600" />
            I agree that {clinic.name} may contact me on WhatsApp/phone about this appointment.
          </label>
        </section>
      )}

      {step === 5 && date && slot && (
        <section className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3 pt-6 text-center">
            <span className="flex h-18 w-18 items-center justify-center rounded-full bg-brand-200 p-4 text-brand-600"><CheckIcon className="h-9 w-9" /></span>
            <h1 className="text-2xl font-extrabold">Appointment booked</h1>
            <p className="text-muted">We&apos;ll confirm on WhatsApp. Please arrive 5 minutes early.</p>
          </div>
          <dl className="flex flex-col gap-2.5 rounded-2xl border border-line p-4 text-sm">
            {[["Treatment", treatmentName], ["Date", date.label], ["Time", slot.label], ["Where", `${clinic.name}, ${clinic.area}`]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="text-right font-bold">{v}</dd></div>
            ))}
          </dl>
          <div className="grid grid-cols-2 gap-2.5">
            {clinic.mapUrl && <a href={clinic.mapUrl} className="flex min-h-12 items-center justify-center rounded-xl border-[1.5px] border-[#cfe2df] text-sm font-bold">Get directions</a>}
            <Link href="/" className="flex min-h-12 items-center justify-center rounded-xl border-[1.5px] border-[#cfe2df] text-sm font-bold">Back to home</Link>
          </div>
        </section>
      )}

      {step < 5 && (
        <button type="button" onClick={next} disabled={!canNext || busy}
          className="h-14 w-full rounded-2xl bg-brand-600 text-base font-bold text-white disabled:bg-[#9dbfbb]">
          {busy ? "Booking…" : step === 4 ? "Confirm booking" : "Continue"}
        </button>
      )}
    </div>
  );
}
