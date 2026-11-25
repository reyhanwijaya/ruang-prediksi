"use client";

import { useState, useTransition } from "react";
import { FolderTree, Pencil, Plus } from "lucide-react";
import { HapusTombol } from "@/components/hapus-tombol";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { Kategori, StatusKonten } from "@/lib/types";
import { hapusKategori, simpanKategori } from "../actions";

export type BarisKategori = Kategori & { ujian: { count: number }[] };

export function KategoriManager({ daftar }: { daftar: BarisKategori[] }) {
  const [dialog, setDialog] = useState<{ buka: boolean; awal?: Kategori }>({ buka: false });
  const tutup = () => setDialog({ buka: false });

  return (
    <div>
      <PageHeader
        judul="Kategori"
        deskripsi="Kelompok ujian, misalnya satu paket prediksi per tahun ajaran."
        aksi={
          <Button onClick={() => setDialog({ buka: true })}>
            <Plus className="size-4" />
            Tambah kategori
          </Button>
        }
      />

      {daftar.length === 0 ? (
        <EmptyState ikon={<FolderTree className="size-10" />} judul="Belum ada kategori.">
          Mulai dengan membuat satu kategori, lalu isi dengan ujian.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {daftar.map((k) => (
            <li key={k.id}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold leading-snug">{k.nama}</p>
                    {k.tahun_ajaran && <p className="mt-0.5 text-xs text-muted-foreground">TA {k.tahun_ajaran}</p>}
                  </div>
                  <StatusBadge status={k.status} />
                </div>
                {k.deskripsi && (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{k.deskripsi}</p>
                )}
                <div className="mt-4 flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-semibold text-primary-deep">
                    {k.ujian?.[0]?.count ?? 0} ujian
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9"
                      aria-label="Ubah"
                      title="Ubah"
                      onClick={() => setDialog({ buka: true, awal: k })}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <HapusTombol
                      judul="Hapus kategori ini?"
                      deskripsi={`“${k.nama}” akan dihapus. Kategori yang masih punya ujian tidak bisa dihapus.`}
                      aksi={() => hapusKategori(k.id)}
                    />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={dialog.buka}
        onClose={tutup}
        judul={dialog.awal ? "Ubah kategori" : "Kategori baru"}
      >
        <FormKategori awal={dialog.awal} onSelesai={tutup} />
      </Dialog>
    </div>
  );
}

function FormKategori({ awal, onSelesai }: { awal?: Kategori; onSelesai: () => void }) {
  const [nama, setNama] = useState(awal?.nama ?? "");
  const [tahun, setTahun] = useState(awal?.tahun_ajaran ?? "");
  const [deskripsi, setDeskripsi] = useState(awal?.deskripsi ?? "");
  const [status, setStatus] = useState<StatusKonten>(awal?.status ?? "draf");
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    mulai(async () => {
      const r = await simpanKategori({
        id: awal?.id,
        nama,
        tahun_ajaran: tahun,
        deskripsi,
        status,
      });
      if (!r.ok) setGalat(r.error);
      else onSelesai();
    });
  }

  return (
    <form onSubmit={kirim} className="space-y-4">
      <Field label="Nama kategori">
        <Input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Prediksi Soal TKA Kelas XII 2026/2027"
          autoFocus
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tahun ajaran" hint="Opsional">
          <Input value={tahun} onChange={(e) => setTahun(e.target.value)} placeholder="2026/2027" />
        </Field>
        <Field label="Status" hint="Peserta hanya melihat yang Terbit.">
          <Select value={status} onChange={(e) => setStatus(e.target.value as StatusKonten)}>
            <option value="draf">Draf</option>
            <option value="terbit">Terbit</option>
            <option value="arsip">Arsip</option>
          </Select>
        </Field>
      </div>
      <Field label="Deskripsi" hint="Opsional">
        <Textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={3} />
      </Field>

      {galat && (
        <p className="rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">
          {galat}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onSelesai} disabled={proses}>
          Batal
        </Button>
        <Button type="submit" disabled={proses}>
          {proses ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
