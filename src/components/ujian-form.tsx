"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import type { StatusKonten, Ujian } from "@/lib/types";
import { simpanUjian } from "@/app/admin/actions";

export function UjianForm({
  kategori,
  awal,
  kategoriAwal,
  onSelesai,
}: {
  kategori: { id: string; nama: string }[];
  awal?: Ujian;
  kategoriAwal?: string;
  onSelesai: (id?: string) => void;
}) {
  const [kategoriId, setKategoriId] = useState(awal?.kategori_id ?? kategoriAwal ?? kategori[0]?.id ?? "");
  const [judul, setJudul] = useState(awal?.judul ?? "");
  const [deskripsi, setDeskripsi] = useState(awal?.deskripsi ?? "");
  const [durasi, setDurasi] = useState(String(awal?.durasi_menit ?? 60));
  const [satuKode, setSatuKode] = useState(awal?.aturan_satu_kode ?? true);
  const [kunci, setKunci] = useState(awal?.kunci_pelanggaran ?? false);
  const [status, setStatus] = useState<StatusKonten>(awal?.status ?? "draf");
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    const menit = Number(durasi);
    if (!durasi.trim() || !Number.isFinite(menit)) {
      setGalat("Durasi harus berupa angka (menit).");
      return;
    }
    mulai(async () => {
      const r = await simpanUjian({
        id: awal?.id,
        kategori_id: kategoriId,
        judul,
        deskripsi,
        durasi_menit: menit,
        aturan_satu_kode: satuKode,
        kunci_pelanggaran: kunci,
        status,
      });
      if (!r.ok) setGalat(r.error);
      else onSelesai(r.id);
    });
  }

  return (
    <form onSubmit={kirim} className="space-y-4">
      <Field label="Kategori">
        <Select value={kategoriId} onChange={(e) => setKategoriId(e.target.value)} required>
          {kategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Judul ujian">
        <Input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Matematika Paket 1" required />
      </Field>
      <Field label="Deskripsi" hint="Opsional">
        <Textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={2} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Durasi (menit)">
          <Input
            value={durasi}
            onChange={(e) => setDurasi(e.target.value)}
            inputMode="numeric"
            placeholder="60"
          />
        </Field>
        <Field label="Status" hint="Peserta hanya melihat yang Terbit.">
          <Select value={status} onChange={(e) => setStatus(e.target.value as StatusKonten)}>
            <option value="draf">Draf</option>
            <option value="terbit">Terbit</option>
            <option value="arsip">Arsip</option>
          </Select>
        </Field>
      </div>

      <div className="space-y-2">
        <Switch
          checked={satuKode}
          onChange={setSatuKode}
          label="Satu kode per ujian"
          hint="Satu orang hanya boleh memakai satu kode untuk ujian ini."
        />
        <Switch
          checked={kunci}
          onChange={setKunci}
          label="Kunci otomatis saat melanggar"
          hint="Jika aktif, sesi dikunci setelah 3 pelanggaran. Jika mati, pelanggaran hanya dicatat."
        />
      </div>

      {galat && (
        <p className="rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">
          {galat}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={() => onSelesai()} disabled={proses}>
          Batal
        </Button>
        <Button type="submit" disabled={proses}>
          {proses ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
