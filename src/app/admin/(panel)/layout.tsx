import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { signOut } from "@/app/admin/actions";

export const metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { clinic, staff } = await requireStaff();
  const nav = [
    ["/admin/bookings", "Bookings"],
    ["/admin/media", "Media"],
    ["/admin/treatments", "Treatments"],
    ...(staff.role === "doctor" ? [["/admin/settings", "Settings"]] : []),
  ];
  return (
    <div className="flex min-h-screen flex-wrap bg-[#f5f8f8]">
      <aside className="flex w-full flex-col gap-1 bg-ink px-4 py-4 text-[#c9dedb] md:min-h-screen md:w-60 md:py-6">
        <span className="px-2.5 pb-3 text-[17px] font-extrabold text-white">{clinic.name}</span>
        <nav aria-label="Admin" className="flex flex-wrap gap-1 md:flex-col">
          {nav.map(([href, text]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#c9dedb] hover:bg-[#1e4a50] hover:text-white">{text}</Link>
          ))}
          <Link href="/" target="_blank" className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#c9dedb] hover:bg-[#1e4a50] hover:text-white">View website ↗</Link>
        </nav>
        <form action={signOut} className="mt-2 md:mt-auto">
          <span className="block px-3 pb-2 text-[13px]">{staff.name} · {staff.role}</span>
          <button type="submit" className="rounded-lg px-3 py-2 text-[13px] font-semibold text-[#c9dedb] underline">Sign out</button>
        </form>
      </aside>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 p-5 md:p-8">{children}</main>
    </div>
  );
}
