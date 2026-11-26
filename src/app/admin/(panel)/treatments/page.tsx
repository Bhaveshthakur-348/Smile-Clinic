import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Treatment } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { saveTreatment } from "@/app/admin/actions";
import { Field, Flash, PageHead, btn, card, input } from "@/components/admin/ui";

export const metadata = { title: "Treatments" };

export default async function TreatmentsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { clinic } = await requireStaff();
  const sp = await searchParams;
  const list = await getDb().select().from(schema.treatments)
    .where(eq(schema.treatments.clinicId, clinic.id)).orderBy(asc(schema.treatments.sort), asc(schema.treatments.name));

  return (
    <>
      <PageHead title="Treatments" sub="Each active treatment gets its own page and appears in booking" />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="flex flex-col gap-3">
        {list.map((t) => (
          <details key={t.id} className={`${card} p-4`}>
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 font-bold">
              <span>{t.name}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs ${t.isActive ? "bg-brand-200 text-[#0b5958]" : "bg-[#eef0f0] text-[#4b5a59]"}`}>
                {t.isActive ? "Active" : "Hidden"} · /treatments/{t.slug}
              </span>
            </summary>
            <TreatmentForm t={t} />
          </details>
        ))}
        <details className={`${card} p-4`} open={list.length === 0}>
          <summary className="cursor-pointer font-bold text-brand-600">+ Add treatment</summary>
          <TreatmentForm />
        </details>
      </div>
    </>
  );
}

function TreatmentForm({ t }: { t?: Treatment }) {
  const p = t?.id ?? "new";
  return (
    <form action={saveTreatment} className="mt-4 grid gap-4 md:grid-cols-2">
      {t && <input type="hidden" name="id" value={t.id} />}
      <Field name={`name-${p}`} labelText="Name"><input id={`name-${p}`} name="name" defaultValue={t?.name} required className={input} /></Field>
      <Field name={`slug-${p}`} labelText="Web address (slug)"><input id={`slug-${p}`} name="slug" defaultValue={t?.slug} placeholder="auto from name" className={input} /></Field>
      <div className="md:col-span-2">
        <Field name={`sd-${p}`} labelText="One-line description"><input id={`sd-${p}`} name="shortDesc" defaultValue={t?.shortDesc} maxLength={160} className={input} /></Field>
      </div>
      <div className="md:col-span-2">
        <Field name={`body-${p}`} labelText="Page text (blank line = new paragraph)"><textarea id={`body-${p}`} name="body" defaultValue={t?.body} rows={5} className={input} /></Field>
      </div>
      <div className="md:col-span-2">
        <Field name={`faq-${p}`} labelText="FAQs — one per line: Question? | Answer">
          <textarea id={`faq-${p}`} name="faqs" rows={4} className={input}
            defaultValue={t?.faqs.map((f) => `${f.q} | ${f.a}`).join("\n")} placeholder="Is it painful? | The area is numbed first." />
        </Field>
      </div>
      <Field name={`dur-${p}`} labelText="Duration (minutes)"><input id={`dur-${p}`} name="durationMinutes" type="number" min={5} defaultValue={t?.durationMinutes ?? 30} className={input} /></Field>
      <Field name={`sort-${p}`} labelText="Order on website"><input id={`sort-${p}`} name="sort" type="number" defaultValue={t?.sort ?? 0} className={input} /></Field>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isActive" defaultChecked={t?.isActive ?? true} className="h-5 w-5 accent-brand-600" />Show on website</label>
      <div className="md:col-span-2"><button type="submit" className={btn}>Save treatment</button></div>
    </form>
  );
}
