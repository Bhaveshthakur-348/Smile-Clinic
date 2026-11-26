export const input = "w-full rounded-xl border border-[#dde7e6] bg-white px-3.5 py-2.5 text-sm";
export const btn = "inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60";
export const btnGhost = "inline-flex min-h-9 items-center justify-center rounded-lg border border-[#cfe2df] bg-white px-3 text-[13px] font-semibold hover:border-brand-300";
export const card = "rounded-2xl border border-line bg-white";
export const label = "text-[13px] font-bold";

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold md:text-[28px]">{title}</h1>
        {sub && <span className="text-sm text-muted">{sub}</span>}
      </div>
      {children && <div className="flex flex-wrap gap-2.5">{children}</div>}
    </div>
  );
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p role="alert" className="rounded-xl bg-[#fbe7e2] px-4 py-3 text-sm font-semibold text-[#9a3412]">{error}</p>;
  if (ok) return <p role="status" className="rounded-xl bg-brand-200 px-4 py-3 text-sm font-semibold text-[#0b5958]">{ok}</p>;
  return null;
}

export function Field({ name, labelText, children }: { name: string; labelText: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={label}>{labelText}</label>
      {children}
    </div>
  );
}
