import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardPaste, Clock, Plus } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { SoalRingkas, Ujian } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SoalList } from "./soal-list";
import { UjianPengaturan } from "./ujian-pengaturan";

export const metadata: Metadata = { title: "Kelola ujian" };

export default async function HalamanKelolaUjian({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();

  const [{ data: ujian }, { data: kategori }, { data: soal }] = await Promise.all([
    db.from("ujian").select("*").eq("id", id).maybeSingle(),
    db.from("kategori").select("id,nama").order("nama"),
    db.from("soal").select("id,nomor,jenis,teks,bobot,diubah_pada").eq("ujian_id", id).order("nomor"),
  ]);

  if (!ujian) notFound();

  const u = ujian as Ujian;
  const daftar = (soal ?? []) as SoalRingkas[];
  const totalBobot = daftar.reduce((n, s) => n + Number(s.bobot), 0);
  const namaKategori = (kategori ?? []).find((k: { id: string }) => k.id === u.kategori_id)?.nama;

  return (
    <div>
      <Link
        href="/admin/ujian"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Semua ujian
      </Link>

      <Card className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-primary-deep sm:text-2xl">{u.judul}</h1>
            <StatusBadge status={u.status} />
          </div>
          {namaKategori && <p className="mt-0.5 text-sm text-muted-foreground">{namaKategori}</p>}
          {u.deskripsi && <p className="mt-2 text-sm leading-relaxed">{u.deskripsi}</p>}
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {u.durasi_menit} menit
            </span>
            <span>·</span>
            <span>{daftar.length} soal</span>
            <span>·</span>
            <span>Total bobot {totalBobot}</span>
            <Badge tone={u.aturan_satu_kode ? "biru" : "netral"}>
              {u.aturan_satu_kode ? "Satu kode per ujian" : "Boleh banyak kode"}
            </Badge>
            {u.kunci_pelanggaran && <Badge tone="oranye">Kunci otomatis</Badge>}
          </p>
        </div>
        <UjianPengaturan ujian={u} kategori={kategori ?? []} />
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">Daftar soal</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/ujian/${id}/impor`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ClipboardPaste className="size-4" /> Tempel banyak soal
          </Link>
          <Link
            href={`/admin/ujian/${id}/soal/baru`}
            className={cn(buttonVariants({ variant: "solid", size: "sm" }))}
          >
            <Plus className="size-4" /> Tambah soal
          </Link>
        </div>
      </div>

      <SoalList
        key={daftar.map((s) => `${s.id}:${s.nomor}:${s.diubah_pada}`).join("|")}
        ujianId={id}
        soal={daftar}
      />
    </div>
  );
}
