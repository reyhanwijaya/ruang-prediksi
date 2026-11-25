"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, KeyRound, LogOut, ShieldCheck, User } from "lucide-react";
import { Logo, TEKS_FOOTER } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn, inisial } from "@/lib/utils";

const MENU = [
  { href: "/beranda", label: "Beranda", ikon: Home },
  { href: "/kode-saya", label: "Kode saya", ikon: KeyRound },
  { href: "/riwayat", label: "Riwayat", ikon: History },
  { href: "/profil", label: "Profil", ikon: User },
];

export function PesertaShell({
  children,
  nama,
  email,
  foto,
  isAdmin,
}: {
  children: React.ReactNode;
  nama: string | null;
  email: string | null;
  foto: string | null;
  isAdmin: boolean;
}) {
  const path = usePathname();
  const aktif = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="min-h-dvh">
      {/* Sidebar: tablet besar & desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card p-4 md:flex">
        <Link href="/beranda" className="px-2 py-2">
          <Logo />
        </Link>

        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {MENU.map(({ href, label, ikon: Ikon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                aktif(href)
                  ? "bg-primary-soft text-primary-deep"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Ikon className="size-5" />
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className="mt-2 flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ShieldCheck className="size-5" />
              Panel admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Avatar nama={nama} email={email} foto={foto} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{nama ?? "Peserta"}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <ThemeToggle className="size-9" />
          <form action="/auth/keluar" method="post">
            <button
              type="submit"
              aria-label="Keluar"
              title="Keluar"
              className="flex size-9 cursor-pointer items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
      </aside>

      {/* Bilah atas: HP */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur md:hidden">
        <Link href="/beranda">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Link
              href="/admin"
              aria-label="Panel admin"
              className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
            >
              <ShieldCheck className="size-5" />
            </Link>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 sm:px-6 md:pb-12 md:pt-10">
          {children}
          <p className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">{TEKS_FOOTER}</p>
        </div>
      </main>

      {/* Navigasi bawah: HP */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-4">
          {MENU.map(({ href, label, ikon: Ikon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={aktif(href) ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                  aktif(href) ? "text-primary-deep" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    aktif(href) && "bg-primary-soft",
                  )}
                >
                  <Ikon className="size-5" />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function Avatar({
  nama,
  email,
  foto,
  besar,
}: {
  nama: string | null;
  email: string | null;
  foto: string | null;
  besar?: boolean;
}) {
  const kelas = cn(
    "shrink-0 rounded-full bg-primary-soft object-cover",
    besar ? "size-20" : "size-10",
  );
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt="" referrerPolicy="no-referrer" className={kelas} />;
  }
  return (
    <span
      className={cn(
        kelas,
        "flex items-center justify-center font-bold text-primary-deep",
        besar ? "text-3xl" : "text-base",
      )}
    >
      {inisial(nama, email)}
    </span>
  );
}
