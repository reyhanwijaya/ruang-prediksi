"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FolderTree, KeyRound, LayoutDashboard, LogOut, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const MENU = [
  { href: "/admin", label: "Ringkasan", ikon: LayoutDashboard, tepat: true },
  { href: "/admin/kategori", label: "Kategori", ikon: FolderTree },
  { href: "/admin/ujian", label: "Ujian & soal", ikon: ClipboardList },
  { href: "/admin/kode", label: "Kode ujian", ikon: KeyRound },
];

export function AdminShell({ children, nama }: { children: React.ReactNode; nama: string | null }) {
  const path = usePathname();
  const aktif = (m: (typeof MENU)[number]) =>
    m.tepat ? path === m.href : path === m.href || path.startsWith(m.href + "/");

  return (
    <div className="min-h-dvh bg-muted/40">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card p-4 lg:flex">
        <Link href="/admin" className="px-2 py-2">
          <Logo />
        </Link>
        <p className="mt-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Panel admin</p>

        <nav className="mt-5 flex flex-1 flex-col gap-1">
          {MENU.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                aktif(m)
                  ? "bg-primary-soft text-primary-deep"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <m.ikon className="size-5" />
              {m.label}
            </Link>
          ))}
          <Link
            href="/beranda"
            className="mt-2 flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Users className="size-5" />
            Lihat sebagai peserta
          </Link>
        </nav>

        <div className="flex items-center gap-2 border-t border-border pt-4">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{nama ?? "Admin"}</p>
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

      {/* Bilah atas + menu geser: HP & tablet */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/beranda"
              aria-label="Lihat sebagai peserta"
              title="Lihat sebagai peserta"
              className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
            >
              <Users className="size-5" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <nav className="tanpa-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
          {MENU.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
                aktif(m) ? "bg-solid text-solid-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              <m.ikon className="size-4" />
              {m.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 lg:pt-10">{children}</div>
      </main>
    </div>
  );
}
