"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Clock, ListChecks, Pencil, Plus } from "lucide-react";
import { HapusTombol } from "@/components/hapus-tombol";
import { StatusBadge } from "@/components/status-badge";
import { UjianForm } from "@/components/ujian-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/form";
import type { Ujian } from "@/lib/types";
import { cn } from "@/lib/utils";
import { hapusUjian } from "../actions";

export type BarisUjian = Ujian & {
  kategori: { nama: string } | { nama: string }[] | null;
  soal: { count: number }[];
};

export function UjianManager({
  daftar,
  kategori,
}: {
  daftar: BarisUjian[];
  kategori: { id: string; nama: string }[];
}) {
  const [dialog, setDialog] = useState<{ buka: boolean; awal?: Ujian }>({ buka: false });
  const [fKategori, setFKategori] = useState("");
  const [fStatus, setFStatus] = useState("");
  const tutup = () => setDialog({ buka: false });

  const tampil = daftar.filter(
    (u) => (!fKategori || u.kategori_id === fKategori) && (!fStatus || u.status === fStatus),
  );

  return (
    <div>
      <PageHeader
        judul="Ujian & soal"
        deskripsi="Setiap ujian berada di dalam satu kategori dan berisi soal bernomor."
        aksi={
          kategori.length > 0 && (
            <Button onClick={() => setDialog({ buka: true })}>
              <Plus className="size-4" />
              Tambah ujian
            </Button>
          )
        }
      />

      {kategori.length === 0 ? (
        <EmptyState ikon={<ClipboardList className="size-10" />} judul="Buat kategori dulu.">
          Ujian harus berada di dalam kategori.{" "}
          <Link href="/admin/kategori" className="font-semibold text-primary-deep underline">
            Ke halaman Kategori
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <Select value={fKategori} onChange={(e) => setFKategori(e.target.value)} aria-label="Filter kategori">
              <option value="">Semua kategori</option>
              {kategori.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </Select>
            <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filter status">
              <option value="">Semua status</option>
              <option value="draf">Draf</option>
              <option value="terbit">Terbit</option>
              <option value="arsip">Arsip</option>
            </Select>
          </div>

          {tampil.length === 0 ? (
            <EmptyState ikon={<ClipboardList className="size-10" />} judul="Belum ada ujian.">
              {daftar.length === 0 ? "Klik “Tambah ujian” untuk membuat yang pertama." : "Tidak ada ujian yang cocok dengan filter."}
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {tampil.map((u) => {
                const kat = Array.isArray(u.kategori) ? u.kategori[0] : u.kategori;
                const jumlahSoal = u.soal?.[0]?.count ?? 0;
                return (
                  <li key={u.id}>
                    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold leading-snug">{u.judul}</p>
                          <StatusBadge status={u.status} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{kat?.nama}</p>
                        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3.5" /> {u.durasi_menit} menit
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <ListChecks className="size-3.5" /> {jumlahSoal} soal
                          </span>
                          {u.kunci_pelanggaran && <Badge tone="oranye">Kunci otomatis</Badge>}
                          {jumlahSoal === 0 && u.status === "terbit" && <Badge tone="merah">Belum ada soal</Badge>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Link
                          href={`/admin/ujian/${u.id}`}
                          className={cn(buttonVariants({ variant: "soft", size: "sm" }))}
                        >
                          Kelola soal
                        </Link>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-9"
                          aria-label="Ubah"
                          title="Ubah"
                          onClick={() => setDialog({ buka: true, awal: u })}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <HapusTombol
                          judul="Hapus ujian ini?"
                          deskripsi={`“${u.judul}” beserta semua soalnya akan dihapus permanen. Ujian yang sudah punya riwayat peserta tidak bisa dihapus.`}
                          aksi={() => hapusUjian(u.id)}
                        />
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Dialog open={dialog.buka} onClose={tutup} judul={dialog.awal ? "Ubah ujian" : "Ujian baru"}>
        <UjianForm kategori={kategori} awal={dialog.awal} kategoriAwal={fKategori || undefined} onSelesai={tutup} />
      </Dialog>
    </div>
  );
}
