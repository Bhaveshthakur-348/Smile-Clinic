import Link from "next/link";
import { requireClinic } from "@/lib/data";
import { waLink } from "@/lib/phone";
import { ChatIcon, PhoneIcon, ToothIcon } from "@/components/site/icons";

export async function generateMetadata() {
  const c = await requireClinic();
  return {
    title: { default: `${c.name} — Dentist in ${c.area ? `${c.area}, ` : ""}${c.city}`, template: `%s | ${c.name}` },
    description: c.tagline ?? `Book a dental appointment at ${c.name}, ${c.city}.`,
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const c = await requireClinic();
  const wa = c.whatsappNumber ? waLink(c.whatsappNumber, "Hi, I want to book an appointment") : null;
  const nav = [
    ["/#treatments", "Treatments"],
    ["/#doctor", "Doctor"],
    ["/#clinic", "Clinic"],
    ["/#contact", "Contact"],
  ];
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5 text-ink">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <ToothIcon className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">{c.name}</span>
          </Link>
          <nav aria-label="Main" className="hidden gap-6 text-[15px] font-medium text-[#334b4f] md:flex">
            {nav.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-brand-600">{label}</Link>
            ))}
          </nav>
          <Link href="/book" className="hidden rounded-xl bg-brand-600 px-5 py-3 text-[15px] font-bold text-white hover:bg-brand-700 sm:inline-block">
            Book Appointment
          </Link>
        </div>
      </header>

      <main className="pb-20 md:pb-0">{children}</main>

      <footer className="bg-ink text-[#c9dedb]">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-5 py-8 text-sm">
          <span className="font-bold text-white">{c.name}, {c.city}</span>
          <span>{c.address}{c.area ? `, ${c.area}` : ""}</span>
        </div>
      </footer>

      {/* Sticky action bar on phones */}
      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-2 border-t border-line bg-white p-2 md:hidden">
        <a href={`tel:${c.phone}`} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-line text-sm font-bold">
          <PhoneIcon className="h-4 w-4 text-brand-600" />Call
        </a>
        {wa ? (
          <a href={wa} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-line text-sm font-bold">
            <ChatIcon className="h-4 w-4 text-brand-600" />WhatsApp
          </a>
        ) : <span />}
        <Link href="/book" className="flex min-h-12 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
          Book
        </Link>
      </div>
    </>
  );
}
