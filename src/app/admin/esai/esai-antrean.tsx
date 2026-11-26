"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { GambarSoal, TeksSoal } from "@/components/teks-soal";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { cn, formatTanggal } from "@/lib/utils";
import { nilaiEsai } from "./actions";

export interface ItemEsai {
  jawaban_id: string;
  pemakaian_id: string;
  peserta_nama: string | null;
  peserta_email: string | null;
  ujian_id: string;
  ujian_judul: string;
  nomor: number;
  teks: string;
  gambar_url: string | null;
  rubrik: string | null;
  bobot: number;
  jawaban: string;
  nilai: number | null;
  komentar: string | null;
  dinilai_pada: string | null;
  selesai_pada: string | null;
}

const TAB: { nilai: "menunggu" | "dinilai" | "semua"; label: string }[] = [
  { nilai: "menunggu", label: "Menunggu" },
  { nilai: "dinilai", label: "Sudah dinilai" },
  { nilai: "semua", label: "Semua" },
];

export function EsaiAntrean({
  item,
  ujian,
  status,
  ujianId,
}: {
  item: ItemEsai[];
  ujian: { id: string; judul: string }[];
  status: string;
  ujianId: string;
}) {
  const router = useRouter();

  function ganti(s: string, u: string) {
    const p = new URLSearchParams();
    if (s !== "menunggu") p.set("status", s);
    if (u) p.set("ujian", u);
    const qs = p.toString();
    router.push(qs ? `/admin/esai?${qs}` : "/admin/esai");
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Status" className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted p-1 sm:w-auto">
          {TAB.map((t) => (
            <button
              key={t.nilai}
              type="button"
              aria-pressed={status === t.nilai}
              onClick={() => ganti(t.nilai, ujianId)}
              className={cn(
                "h-9 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-colors",
                status === t.nilai ? "bg-card text-primary-deep shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Select
          value={ujianId}
          onChange={(e) => ganti(status, e.target.value)}
          aria-label="Filter ujian"
          className="sm:max-w-xs"
        >
          <option value="">Semua ujian</option>
          {ujian.map((u) => (
            <option key={u.id} value={u.id}>
              {u.judul}
            </option>
          ))}
        </Select>
      </Card>

      {item.length === 0 ? (
        <EmptyState
          ikon={<PenLine className="size-10" />}
          judul={status === "menunggu" ? "Tidak ada esai yang menunggu nilai." : "Tidak ada esai pada filter ini."}
        >
          Esai muncul di sini setelah peserta mengumpulkan ujiannya.
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {item.map((x) => (
            <li key={x.jawaban_id}>
              <KartuEsai x={x} />
            </li>
          ))}
        </ul>
      )}
      {item.length >= 500 && (
        <p className="text-center text-xs text-muted-foreground">Menampilkan 500 esai pertama. Persempit dengan filter.</p>
      )}
    </div>
  );
}

function KartuEsai({ x }: { x: ItemEsai }) {
  const [nilai, setNilai] = useState(x.nilai === null ? "" : String(x.nilai));
  const [komentar, setKomentar] = useState(x.komentar ?? "");
  const [galat, setGalat] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [proses, mulai] = useTransition();
  const dinilai = x.nilai !== null || info !== null;

  function simpan() {
    setGalat(null);
    setInfo(null);
    const n = Number(nilai.replace(",", "."));
    if (!nilai.trim() || !Number.isFinite(n)) return setGalat("Isi nilai berupa angka.");
    if (n < 0 || n > x.bobot) return setGalat(`Nilai harus antara 0 dan ${x.bobot}.`);
    mulai(async () => {
      const r = await nilaiEsai({ jawabanId: x.jawaban_id, nilai: n, komentar });
      if (!r.ok) setGalat(r.error);
      else setInfo(r.skor === null ? "Tersimpan. Skor sesi masih menunggu esai lain." : `Tersimpan. Skor sesi: ${r.skor}.`);
    });
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold">{x.peserta_nama || x.peserta_email || "Peserta"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {x.peserta_email} · selesai {x.selesai_pada ? formatTanggal(x.selesai_pada) : "-"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="biru">{x.ujian_judul}</Badge>
          <Badge>Soal {x.nomor}</Badge>
          <Badge tone={dinilai ? "hijau" : "kuning"}>{dinilai ? "Sudah dinilai" : "Menunggu"}</Badge>
        </div>
      </div>

      <div className="space-y-2 rounded-xl bg-muted/60 p-3.5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Soal</p>
        <TeksSoal teks={x.teks} className="text-sm leading-relaxed" />
        {x.gambar_url && <GambarSoal src={x.gambar_url} className="max-h-48" />}
        {x.rubrik && (
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-primary-deep">Rubrik penilaian</summary>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{x.rubrik}</p>
          </details>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Jawaban peserta</p>
        <p className="whitespace-pre-wrap break-words rounded-xl border border-border p-3.5 text-sm leading-relaxed">
          {x.jawaban}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
        <label className="block space-y-1.5">
          <span className="block text-sm font-semibold">Nilai (0–{x.bobot})</span>
          <Input
            value={nilai}
            onChange={(e) => setNilai(e.target.value)}
            inputMode="decimal"
            placeholder={`0–${x.bobot}`}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="block text-sm font-semibold">Komentar (opsional)</span>
          <Textarea value={komentar} onChange={(e) => setKomentar(e.target.value)} rows={2} maxLength={1000} />
        </label>
      </div>

      {galat && (
        <p className="rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">{galat}</p>
      )}
      {info && (
        <p className="rounded-xl bg-success/20 px-3.5 py-2.5 text-sm font-medium text-[#1f6b3f] dark:text-success">{info}</p>
      )}

      <div className="flex justify-end">
        <Button onClick={simpan} disabled={proses}>
          {proses ? "Menyimpan…" : dinilai ? "Simpan perubahan" : "Simpan nilai"}
        </Button>
      </div>
    </Card>
  );
}
