import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/peserta-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Profil" };

export default async function Profil() {
  const profil = await requireProfile();
  const admin = profil.peran === "admin";

  return (
    <div>
      <PageHeader judul="Profil" />

      <Card className="flex flex-col items-center gap-3 py-8 text-center sm:flex-row sm:text-left">
        <Avatar nama={profil.nama} email={profil.email} foto={profil.foto_url} besar />
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold">{profil.nama ?? "Peserta"}</p>
          <p className="truncate text-sm text-muted-foreground">{profil.email}</p>
          <div className="mt-2">
            <Badge tone={admin ? "kuning" : "biru"}>{admin ? "Admin" : "Peserta"}</Badge>
          </div>
        </div>
      </Card>

      <div className="mt-4 space-y-3">
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Tema tampilan</p>
            <p className="text-xs text-muted-foreground">Terang atau gelap.</p>
          </div>
          <ThemeToggle className="border border-border" />
        </Card>

        {admin && (
          <Link href="/admin" className={cn(buttonVariants({ variant: "soft", size: "lg" }), "w-full")}>
            <ShieldCheck className="size-5" />
            Buka panel admin
          </Link>
        )}

        <form action="/auth/keluar" method="post">
          <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
            <LogOut className="size-5" />
            Keluar
          </button>
        </form>
      </div>
    </div>
  );
}
