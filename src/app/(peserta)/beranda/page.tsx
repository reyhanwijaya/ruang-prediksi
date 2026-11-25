import type { Metadata } from "next";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { KodeForm } from "@/components/kode-form";
import { Card } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { KodeSaya } from "@/lib/types";
import { namaDepan } from "@/lib/utils";

export const metadata: Metadata = { title: "Beranda" };

const LANGKAH = [
  { n: 1, judul: "Masukkan kode", isi: "Dapatkan kode 8 karakter dari admin, lalu ketik di kolom di atas." },
  { n: 2, judul: "Kerjakan dalam layar penuh", isi: "Timer berjalan di server. Pindah tab atau keluar layar penuh akan dicatat." },
  { n: 3, judul: "Lihat hasil & pembahasan", isi: "Skor, kunci, dan pembahasan tersimpan di Riwayat." },
];

export default async function Beranda() {
  const profil = await requireProfile();
  const db = await createClient();
  const { data: kodeSaya } = await db.rpc("kode_saya");
  const berjalan = ((kodeSaya ?? []) as KodeSaya[]).find((k) => k.status === "berjalan");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Halo,</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-primary-deep sm:text-3xl">
          {namaDepan(profil.nama, profil.email)} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Siap latihan hari ini?</p>
      </div>

      {berjalan && (
        <Link
          href={`/ujian/${berjalan.pemakaian_id}`}
          className="flex items-center gap-3 rounded-2xl border border-warning/50 bg-warning/15 p-4 transition-opacity hover:opacity-90"
        >
          <PlayCircle className="size-8 shrink-0 text-[#8a4a12] dark:text-warning" />
          <span className="min-w-0 text-sm">
            <b className="block text-[#8a4a12] dark:text-warning">Ada ujian yang sedang berjalan</b>
            <span className="block truncate text-muted-foreground">{berjalan.judul}. Ketuk untuk melanjutkan.</span>
          </span>
        </Link>
      )}

      <Card className="bg-primary-soft/60 sm:p-6">
        <h2 className="text-base font-bold text-primary-deep">Masukkan kode ujian</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Satu kode terikat pada satu ujian. Huruf kapital dan angka 2–9.
        </p>
        <KodeForm />
      </Card>

      <section>
        <h2 className="mb-3 text-base font-bold">Cara memakai</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {LANGKAH.map((l) => (
            <li key={l.n}>
              <Card className="h-full">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-[#4a3a00]">
                  {l.n}
                </span>
                <p className="mt-3 text-sm font-bold">{l.judul}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{l.isi}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
