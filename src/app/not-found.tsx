import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

export default function TidakDitemukan() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-b from-primary-soft to-background px-4 text-center">
      <Logo />
      <p className="text-5xl font-extrabold text-primary-deep">404</p>
      <p className="text-sm text-muted-foreground">Halaman yang kamu cari tidak ditemukan.</p>
      <Link href="/" className={buttonVariants()}>
        Kembali ke beranda
      </Link>
    </main>
  );
}
