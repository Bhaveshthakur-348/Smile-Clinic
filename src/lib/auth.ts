import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { supabaseServer } from "@/lib/supabase/server";

/** Logged-in staff member + their clinic. Every admin query must filter by staff.clinicId. */
export const requireStaff = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/admin/login");
  const db = getDb();
  const [member] = await db.select().from(schema.staff).where(eq(schema.staff.userId, data.user.id));
  if (!member) redirect("/admin/login?error=no-access");
  const [clinic] = await db.select().from(schema.clinics).where(eq(schema.clinics.id, member.clinicId));
  return { user: data.user, staff: member, clinic };
});

export async function requireDoctor() {
  const ctx = await requireStaff();
  if (ctx.staff.role !== "doctor") redirect("/admin/bookings?error=doctor-only");
  return ctx;
}
