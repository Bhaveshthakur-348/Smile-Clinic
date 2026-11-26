"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { btn, input, label } from "@/components/admin/ui";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({
      email: String(f.get("email")), password: String(f.get("password")),
    });
    setBusy(false);
    if (error) return setError("Wrong email or password");
    router.replace("/admin/bookings");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor="email" className={label}>Email</label>
      <input id="email" name="email" type="email" required autoComplete="email" className={input} />
      <label htmlFor="password" className={label}>Password</label>
      <input id="password" name="password" type="password" required autoComplete="current-password" className={input} />
      {error && <p role="alert" className="text-sm font-semibold text-[#9a3412]">{error}</p>}
      <button type="submit" disabled={busy} className={`${btn} mt-2 h-12`}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
