import { LoginForm } from "./LoginForm";

export const metadata = { title: "Clinic login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 p-5">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold">Clinic login</h1>
        {error === "no-access" && (
          <p role="alert" className="rounded-xl bg-[#fbe7e2] px-4 py-3 text-sm font-semibold text-[#9a3412]">
            This login isn&apos;t linked to a clinic yet. Ask your admin to add you as staff.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
