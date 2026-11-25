import Link from "next/link";
import { CheckCircle2, ClipboardList, FolderTree, ListChecks, Users } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function RingkasanAdmin() {
  const db = await createClient();

  const [kategori, ujian, soal, peserta] = await Promise.all([
    db.from("kategori").select("*", { count: "exact", head: true }),
    db.from("ujian").select("*", { count: "exact", head: true }).eq("status", "terbit"),
    db.from("soal").select("*", { count: "exact", head: true }),
    db.from("profiles").select("*", { count: "exact", head: true }).eq("peran", "peserta"),
  ]);

  const kartu = [
    { label: "Kategori", nilai: kategori.count ?? 0, ikon: FolderTree },
    { label: "Ujian terbit", nilai: ujian.count ?? 0, ikon: ClipboardList },
    { label: "Total soal", nilai: soal.count ?? 0, ikon: ListChecks },
    { label: "Peserta terdaftar", nilai: peserta.count ?? 0, ikon: Users },
  ];

  const langkah = [
    { href: "/admin/kategori", judul: "Buat kategori", isi: "Misalnya “Prediksi Soal TKA Kelas XII 2026/2027”." },
    { href: "/admin/ujian", judul: "Buat ujian di dalam kategori", isi: "Atur durasi dan aturan ujian." },
    { href: "/admin/ujian", judul: "Isi soal", isi: "Satu per satu atau tempel banyak soal sekaligus." },
  ];

  return (
    <div className="space-y-6">
      <PageHeader judul="Ringkasan" deskripsi="Dashboard lengkap (grafik, antrean esai, log) hadir di tahap berikutnya." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kartu.map(({ label, nilai, ikon: Ikon }) => (
          <Card key={label}>
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary-deep">
              <Ikon className="size-5" />
            </span>
            <p className="mt-3 text-3xl font-extrabold text-primary-deep">{nilai}</p>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-base font-bold">Mulai dari sini</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {langkah.map((l, i) => (
            <li key={l.judul}>
              <Link href={l.href} className="block h-full">
                <Card className="h-full transition-colors hover:border-primary">
                  <CheckCircle2 className="size-5 text-primary" />
                  <p className="mt-3 text-sm font-bold">
                    {i + 1}. {l.judul}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{l.isi}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
