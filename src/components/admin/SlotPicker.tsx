import type { Slot } from "@/lib/slots";
import { input } from "./ui";

/** Server-rendered <select> of free slots for one date. */
export function SlotPicker({ slots, name = "time" }: { slots: Slot[]; name?: string }) {
  const free = slots.filter((s) => s.free);
  if (slots.length === 0) return <p className="text-sm font-semibold text-[#9a3412]">Clinic is closed on this date.</p>;
  if (free.length === 0) return <p className="text-sm font-semibold text-[#9a3412]">No free slots on this date.</p>;
  return (
    <select id={name} name={name} required className={input}>
      {free.map((s) => <option key={s.time} value={s.time}>{s.label} ({s.session})</option>)}
    </select>
  );
}
