import { LoginButton } from "@/components/login-button";
import { Logo, TEKS_FOOTER } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function Masuk({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string }>;
}) {
  const { galat } = await searchParams;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-primary-soft to-background px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4" />

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo ukuran="lg" className="flex-col" />
          <p className="mt-3 text-sm text-muted-foreground">Latihan terarah, belajar lebih siap.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h1 className="text-lg font-extrabold text-primary-deep">Masuk</h1>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">
            Gunakan akun Google untuk mulai mengerjakan soal prediksi.
          </p>

          {galat && (
            <p className="mb-4 rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">
              Login belum berhasil. Silakan coba lagi.
            </p>
          )}

          <LoginButton />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">{TEKS_FOOTER}</p>
      </div>
    </main>
  );
}
