import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { MEDIA_SECTIONS, type MediaSection } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { addVideoLink, updateMedia } from "@/app/admin/actions";
import { Flash, PageHead, btn, btnGhost, card, input } from "@/components/admin/ui";
import { MediaBox } from "@/components/site/MediaBox";
import { Uploader } from "./Uploader";

export const metadata = { title: "Media" };

const LABEL: Record<MediaSection, string> = { hero: "Hero", doctor: "Doctor", clinic: "Clinic", gallery: "Gallery", treatment: "Treatments" };
const HINT: Record<MediaSection, string> = {
  hero: "The first visible item is the big photo at the top of the home page.",
  doctor: "The first visible item shows next to the doctor's introduction.",
  clinic: "Shown in the Clinic & safety section, before gallery items.",
  gallery: "Extra photos and videos in the Clinic & safety section.",
  treatment: "Pick a treatment for each item — it shows on that treatment's page.",
};

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ section?: string; error?: string }> }) {
  const { clinic } = await requireStaff();
  const sp = await searchParams;
  const section = (MEDIA_SECTIONS as readonly string[]).includes(sp.section ?? "") ? (sp.section as MediaSection) : "hero";
  const db = getDb();
  const [all, treatments] = await Promise.all([
    db.select().from(schema.media).where(eq(schema.media.clinicId, clinic.id)).orderBy(asc(schema.media.sort), asc(schema.media.createdAt)),
    db.select({ id: schema.treatments.id, name: schema.treatments.name }).from(schema.treatments)
      .where(and(eq(schema.treatments.clinicId, clinic.id))).orderBy(asc(schema.treatments.sort)),
  ]);
  const items = all.filter((m) => m.section === section);

  return (
    <>
      <PageHead title="Media" sub="Photos and videos shown on the website">
        <Link href="/" target="_blank" className={btnGhost}>View website ↗</Link>
      </PageHead>
      <Flash error={sp.error} />

      <nav aria-label="Website section" className="flex flex-wrap gap-2">
        {MEDIA_SECTIONS.map((s) => {
          const on = s === section;
          return (
            <Link key={s} href={`/admin/media?section=${s}`} aria-current={on ? "page" : undefined}
              className={`rounded-full border px-4 py-2 text-[13px] font-bold ${on ? "border-ink bg-ink text-white" : "border-[#dde7e6] bg-white text-[#334b4f]"}`}>
              {LABEL[s]} ({all.filter((m) => m.section === s).length})
            </Link>
          );
        })}
      </nav>
      <p className="-mt-3 text-[13px] text-muted">{HINT[section]} Hidden items stay saved but don&apos;t show.</p>

      <Uploader section={section} />

      <form action={addVideoLink} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="section" value={section} />
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
          <label htmlFor="yt" className="text-[13px] font-bold">…or add a YouTube video link</label>
          <input id="yt" name="url" placeholder="https://youtu.be/…" className={input} />
        </div>
        <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5">
          <label htmlFor="ytt" className="text-[13px] font-bold">Title</label>
          <input id="ytt" name="title" placeholder="Clinic tour" className={input} />
        </div>
        <button type="submit" className={btn}>Add video</button>
      </form>

      {items.length === 0 ? (
        <p className={`${card} p-8 text-center text-muted`}>Nothing in {LABEL[section]} yet.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
          {items.map((m, i) => (
            <li key={m.id} className={`${card} flex flex-col overflow-hidden ${m.isVisible ? "" : "opacity-60"}`}>
              <div className="relative">
                <MediaBox item={m} placeholder="" className="h-36 w-full rounded-none" />
                <span className="absolute top-2.5 left-2.5 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold">{m.kind === "video" ? "Video" : "Photo"}</span>
              </div>
              <div className="flex flex-col gap-2.5 p-3.5">
                <form action={updateMedia} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="action" value="save" />
                  <label htmlFor={`alt-${m.id}`} className="text-xs font-bold">Description (for Google &amp; screen readers)</label>
                  <input id={`alt-${m.id}`} name="alt" defaultValue={m.alt} className={input} />
                  {section === "treatment" && (
                    <select name="treatmentId" defaultValue={m.treatmentId ?? ""} aria-label="Treatment" className={input}>
                      <option value="">Choose treatment…</option>
                      {treatments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                  <button type="submit" className={btnGhost}>Save</button>
                </form>
                <div className="flex flex-wrap gap-1.5">
                  <MediaAction id={m.id} action="toggle" text={m.isVisible ? "Visible · hide" : "Hidden · show"} />
                  {i > 0 && <MediaAction id={m.id} action="up" text="↑" label="Move earlier" />}
                  {i < items.length - 1 && <MediaAction id={m.id} action="down" text="↓" label="Move later" />}
                  <MediaAction id={m.id} action="delete" text="Delete" danger />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function MediaAction({ id, action, text, label, danger }: { id: string; action: string; text: string; label?: string; danger?: boolean }) {
  return (
    <form action={updateMedia}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button type="submit" aria-label={label} className={`${btnGhost} ${danger ? "border-[#f1d1c8] text-[#9a3412]" : ""}`}>{text}</button>
    </form>
  );
}
