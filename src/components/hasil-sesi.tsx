import Link from "next/link";
import { CheckCircle2, Hourglass, Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { HasilSesi } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Ringkasan setelah sesi berakhir (dikumpulkan, waktu habis, atau dikunci). */
export function HasilPanel({ judul, hasil }: { judul: string; hasil: HasilSesi }) {
  const dikunci = hasil.status === "dikunci";
  const habis = hasil.status === "waktu_habis";

  const Ikon = dikunci ? Lock : habis ? Hourglass : CheckCircle2;
  const warna = dikunci
    ? "bg-danger/15 text-[#b23b3b] dark:text-danger"
    : habis
      ? "bg-warning/20 text-[#8a4a12] dark:text-warning"
      : "bg-success/20 text-[#1f6b3f] dark:text-success";

  return (
    <Card className="p-6 text-center sm:p-8">
      <span className={cn("mx-auto flex size-16 items-center justify-center rounded-full", warna)}>
        <Ikon className="size-8" />
      </span>

      <h1 className="mt-4 text-xl font-extrabold text-primary-deep">
        {dikunci ? "Sesi dikunci" : habis ? "Waktu habis" : "Jawaban terkirim"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{judul}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed">
        {dikunci
          ? "Sesi dikunci karena pelanggaran mencapai batas. Jawaban yang sudah tersimpan tetap dinilai."
          : habis
            ? "Jawaban yang sudah tersimpan otomatis dikumpulkan. Hasil akan tersedia di riwayat."
            : "Jawaban terkirim. Hasil akan tersedia di riwayat."}
      </p>

      <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-primary-soft p-3">
          <dt className="text-xs font-semibold text-muted-foreground">Skor</dt>
          <dd className="mt-1 text-2xl font-extrabold text-primary-deep">
            {hasil.skor === null ? "–" : Math.round(hasil.skor)}
          </dd>
        </div>
        <div className="rounded-xl bg-primary-soft p-3">
          <dt className="text-xs font-semibold text-muted-foreground">Benar</dt>
          <dd className="mt-1 text-2xl font-extrabold text-primary-deep">
            {hasil.jumlah_benar}
            <span className="text-sm font-semibold text-muted-foreground">/{hasil.jumlah_soal}</span>
          </dd>
        </div>
        <div className="rounded-xl bg-primary-soft p-3">
          <dt className="text-xs font-semibold text-muted-foreground">Pelanggaran</dt>
          <dd className="mt-1 text-2xl font-extrabold text-primary-deep">{hasil.pelanggaran}</dd>
        </div>
      </dl>

      {hasil.menunggu_esai && (
        <p className="mt-4 rounded-xl bg-accent/40 px-3.5 py-2.5 text-sm font-medium text-[#4a3a00] dark:text-accent">
          Menunggu nilai esai. Skor akhir muncul setelah admin selesai menilai.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/riwayat" className={cn(buttonVariants({ size: "lg" }))}>
          Lihat riwayat
        </Link>
        <Link href="/beranda" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
          Kembali ke beranda
        </Link>
      </div>
    </Card>
  );
}
