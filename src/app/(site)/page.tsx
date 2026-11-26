import Link from "next/link";
import { getSiteContent, requireClinic } from "@/lib/data";
import { waLink } from "@/lib/phone";
import { closedDaysLabel, openDaysLabel, sessionsLabel } from "@/lib/format";
import { MediaBox } from "@/components/site/MediaBox";
import { ChatIcon, CheckIcon, ToothIcon } from "@/components/site/icons";

const eyebrow = "text-sm font-bold tracking-wide text-brand-600 uppercase";
const h2 = "text-3xl font-extrabold tracking-tight md:text-4xl";

export default async function Home() {
  const c = await requireClinic();
  const { settings, treatments, media } = await getSiteContent(c.id);
  const by = (section: string) => media.filter((m) => m.section === section);
  const hero = by("hero")[0];
  const doctorPhoto = by("doctor")[0];
  const gallery = [...by("clinic"), ...by("gallery")];
  const wa = c.whatsappNumber ? waLink(c.whatsappNumber, "Hi, I want to book an appointment") : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: c.name,
    telephone: c.phone,
    address: { "@type": "PostalAddress", streetAddress: c.address, addressLocality: c.city, addressRegion: "MP", addressCountry: "IN" },
    ...(c.mapUrl ? { hasMap: c.mapUrl } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="bg-brand-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-5 py-14 md:py-20">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
            <span className="self-start rounded-full bg-brand-200 px-3 py-1.5 text-sm font-bold text-[#0b5958]">
              Dental clinic · {c.area ? `${c.area}, ` : ""}{c.city}
            </span>
            <h1 className="text-4xl leading-[1.08] font-extrabold tracking-tight md:text-5xl">
              {c.tagline ?? "Gentle dental care for your whole family"}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-ink-soft">
              Root canals, implants, braces and everyday check-ups — explained clearly, done carefully, with instruments sterilised for every patient.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/book" className="rounded-2xl bg-brand-600 px-6 py-4 font-bold text-white hover:bg-brand-700">Book Appointment</Link>
              {wa && (
                <a href={wa} className="flex items-center gap-2 rounded-2xl border-[1.5px] border-[#cfe2df] bg-white px-6 py-4 font-bold">
                  <ChatIcon className="h-5 w-5 text-brand-600" />Chat on WhatsApp
                </a>
              )}
            </div>
            <ul className="flex flex-wrap gap-5 pt-1 text-sm font-semibold text-[#334b4f]">
              {[c.doctorDegrees ? `${c.doctorDegrees.split("(")[0].trim()} dentist` : "Qualified dentist", "Sterilised instruments", settings ? `Open ${openDaysLabel(settings.openDays)}` : null]
                .filter(Boolean)
                .map((t) => (
                  <li key={t} className="flex items-center gap-1.5"><CheckIcon className="h-4 w-4 text-brand-600" />{t}</li>
                ))}
            </ul>
          </div>
          <MediaBox item={hero} placeholder="Add a hero photo in Admin › Media" className="h-80 min-w-0 flex-[1_1_380px] md:h-[440px]" />
        </div>
      </section>

      {/* Treatments */}
      <section id="treatments" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-8 px-5 py-16 md:py-20">
        <div className="flex flex-col gap-2">
          <span className={eyebrow}>Treatments</span>
          <h2 className={h2}>What we can help with</h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
          {treatments.map((t) => (
            <Link key={t.id} href={`/treatments/${t.slug}`} className="flex flex-col gap-2.5 rounded-3xl border border-line bg-white p-6 transition hover:border-brand-300 hover:shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-600"><ToothIcon className="h-6 w-6" /></span>
              <span className="text-lg font-bold">{t.name}</span>
              <span className="text-sm leading-relaxed text-muted">{t.shortDesc}</span>
              <span className="mt-auto text-sm font-bold text-brand-600">Learn more →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Doctor */}
      {c.doctorName && (
        <section id="doctor" className="scroll-mt-20 bg-brand-50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-5 py-16 md:py-20">
            <MediaBox item={doctorPhoto} placeholder="Doctor photo" className="h-96 min-w-0 flex-[1_1_320px]" />
            <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
              <span className={eyebrow}>Your dentist</span>
              <h2 className={h2}>{c.doctorName}</h2>
              <p className="font-semibold text-ink-soft">
                {[c.doctorDegrees, c.doctorRegNo ? `Reg. No. ${c.doctorRegNo}` : null].filter(Boolean).join(" · ")}
              </p>
              {c.doctorBio && <p className="text-[17px] leading-relaxed text-ink-soft">{c.doctorBio}</p>}
              <div className="flex flex-wrap gap-3 text-sm font-semibold">
                {c.doctorExperience && <span className="rounded-xl border border-[#cfe2df] bg-white px-4 py-2.5">{c.doctorExperience} years experience</span>}
                {c.languages && <span className="rounded-xl border border-[#cfe2df] bg-white px-4 py-2.5">{c.languages}</span>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Clinic */}
      <section id="clinic" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-8 px-5 py-16 md:py-20">
        <div className="flex flex-col gap-2">
          <span className={eyebrow}>Clinic &amp; safety</span>
          <h2 className={h2}>Clean, modern and calm</h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          {[
            ["Sterilisation every time", "Autoclave-sterilised instruments and single-use items for each patient."],
            ["Clear treatment plans", "Options and costs explained before any treatment starts."],
            ["Reminders on WhatsApp", "Booking confirmation and a reminder the day before."],
          ].map(([t, d]) => (
            <div key={t} className="flex flex-col gap-2 rounded-3xl bg-brand-50 p-6">
              <span className="text-[17px] font-bold">{t}</span>
              <span className="text-[15px] leading-relaxed text-muted">{d}</span>
            </div>
          ))}
        </div>
        {gallery.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {gallery.map((m) => (
              <MediaBox key={m.id} item={m} placeholder="" className="h-48 w-full" />
            ))}
          </div>
        )}
      </section>

      {/* Reviews — link to real Google reviews only */}
      {c.googleReviewsUrl && (
        <section className="bg-ink text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-14">
            <div className="flex flex-col gap-2">
              <h2 className={h2}>What patients say</h2>
              {c.googleRating && (
                <p className="text-[#c9dedb]">
                  <span className="text-[#f6c453]" aria-hidden="true">★</span> {String(c.googleRating)} on Google
                  {c.googleReviewCount ? ` · ${c.googleReviewCount} reviews` : ""}
                </p>
              )}
            </div>
            <a href={c.googleReviewsUrl} className="rounded-2xl bg-white px-6 py-4 font-bold text-ink">Read our Google reviews</a>
          </div>
        </section>
      )}

      {/* How booking works */}
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 md:py-20">
        <h2 className={h2}>Book in under a minute</h2>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
          {[
            ["Pick a treatment", "Or choose Check-up if you're not sure."],
            ["Choose a free slot", "Only open times are shown."],
            ["Get WhatsApp confirmation", "Plus a reminder the day before."],
          ].map(([t, d], i) => (
            <li key={t} className="flex items-start gap-4">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-600 font-extrabold text-white">{i + 1}</span>
              <div className="flex flex-col gap-1">
                <span className="text-[17px] font-bold">{t}</span>
                <span className="text-[15px] text-muted">{d}</span>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/book" className="self-start rounded-2xl bg-brand-600 px-6 py-4 font-bold text-white hover:bg-brand-700">Book Appointment</Link>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 bg-brand-50">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-10 px-5 py-16 md:py-20">
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
            <h2 className={h2}>Visit us</h2>
            <p className="leading-relaxed text-ink-soft">{c.address}{c.area ? `, ${c.area}` : ""}, {c.city}</p>
            {settings && (
              <dl className="flex flex-col gap-3 rounded-3xl bg-white p-5 text-[15px]">
                <div className="flex flex-wrap justify-between gap-3">
                  <dt className="font-semibold">{openDaysLabel(settings.openDays)}</dt>
                  <dd className="text-ink-soft">{sessionsLabel(settings)}</dd>
                </div>
                {closedDaysLabel(settings.openDays) && (
                  <div className="flex justify-between gap-3">
                    <dt className="font-semibold">{closedDaysLabel(settings.openDays)}</dt>
                    <dd className="text-ink-soft">Closed</dd>
                  </div>
                )}
              </dl>
            )}
            <div className="flex flex-wrap gap-3">
              <a href={`tel:${c.phone}`} className="rounded-xl bg-brand-600 px-5 py-3.5 font-bold text-white">Call {c.phone}</a>
              {c.mapUrl && <a href={c.mapUrl} className="rounded-xl border-[1.5px] border-[#cfe2df] bg-white px-5 py-3.5 font-bold text-ink">Get directions</a>}
            </div>
            <p className="text-sm text-muted">Dental emergency outside hours? Call or WhatsApp the number above.</p>
          </div>
          {c.mapEmbedUrl ? (
            <iframe src={c.mapEmbedUrl} title="Clinic location on map" loading="lazy" className="h-80 min-w-0 flex-[1_1_380px] rounded-3xl border-0" />
          ) : (
            <MediaBox placeholder="Add the Google Maps embed link in Settings" className="h-80 min-w-0 flex-[1_1_380px]" />
          )}
        </div>
      </section>
    </>
  );
}
