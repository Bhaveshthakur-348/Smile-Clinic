import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteContent, requireClinic } from "@/lib/data";
import { MediaBox } from "@/components/site/MediaBox";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const c = await requireClinic();
  const { treatments, media } = await getSiteContent(c.id);
  const t = treatments.find((x) => x.slug === slug);
  return { c, t, media: t ? media.filter((m) => m.section === "treatment" && m.treatmentId === t.id) : [] };
}

export async function generateMetadata({ params }: Props) {
  const { c, t } = await load((await params).slug);
  return t ? { title: `${t.name} in ${c.city}`, description: t.shortDesc } : {};
}

export default async function TreatmentPage({ params }: Props) {
  const { t, media } = await load((await params).slug);
  if (!t) notFound();
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-12 md:py-16">
      <Link href="/#treatments" className="text-sm font-bold">← All treatments</Link>
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold tracking-tight">{t.name}</h1>
        <p className="text-lg text-ink-soft">{t.shortDesc}</p>
      </header>
      <MediaBox item={media[0]} placeholder="Add a photo or video for this treatment in Admin › Media" className="h-72 w-full" />
      <div className="flex flex-col gap-4 text-[17px] leading-relaxed text-ink-soft">
        {t.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {t.faqs.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-extrabold">Common questions</h2>
          {t.faqs.map((f) => (
            <details key={f.q} className="rounded-2xl border border-line p-5 open:bg-brand-50">
              <summary className="cursor-pointer font-bold">{f.q}</summary>
              <p className="mt-3 text-ink-soft">{f.a}</p>
            </details>
          ))}
        </section>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-brand-50 p-6">
        <span className="text-lg font-bold">Book a {t.name.toLowerCase()} visit</span>
        <Link href={`/book?treatment=${t.slug}`} className="rounded-2xl bg-brand-600 px-6 py-4 font-bold text-white hover:bg-brand-700">Book Appointment</Link>
      </div>
    </article>
  );
}
