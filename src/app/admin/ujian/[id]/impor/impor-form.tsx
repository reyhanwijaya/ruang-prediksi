"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { CONTOH_IMPOR, parseImpor } from "@/lib/impor-soal";
import { HURUF_OPSI, JENIS_LABEL, potong } from "@/lib/utils";
import { imporSoal } from "@/app/admin/actions";

export function ImporForm({ ujianId, judulUjian }: { ujianId: string; judulUjian: string }) {
  const router = useRouter();
  const [teks, setTeks] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  const hasil = useMemo(() => parseImpor(teks), [teks]);
  const bisa = hasil.soal.length > 0 && hasil.galat.length === 0;

  function simpan() {
    setGalat(null);
    mulai(async () => {
      const r = await imporSoal(ujianId, teks);
      if (!r.ok) {
        setGalat(r.error);
        return;
      }
      router.push(`/admin/ujian/${ujianId}`);
      router.refresh();
    });
  }

  return (
    <div>
      <Link
        href={`/admin/ujian/${ujianId}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {judulUjian}
      </Link>
      <h1 className="mb-1 text-xl font-extrabold tracking-tight text-primary-deep sm:text-2xl">Tempel banyak soal</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Tempel soal dengan format sederhana, periksa pratinjau, lalu simpan sekaligus.
      </p>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold">Teks soal</p>
              <Button variant="soft" size="sm" onClick={() => setTeks(CONTOH_IMPOR)}>
                Isi dengan contoh
              </Button>
            </div>
            <Textarea
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              rows={16}
              spellCheck={false}
              placeholder={"SOAL: ...\nA. ...\nB. ...\nKUNCI: A\n---\nSOAL: ..."}
              className="font-mono text-[13px]"
            />
          </Card>

          <details className="rounded-2xl border border-border bg-card p-4 text-sm">
            <summary className="cursor-pointer font-bold text-primary-deep">Aturan format</summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-muted-foreground">
              <li>
                Pisahkan antar soal dengan baris berisi <code className="font-mono">---</code>.
              </li>
              <li>
                <b>Pilihan ganda:</b> <code className="font-mono">SOAL:</code>, opsi{" "}
                <code className="font-mono">A.</code> <code className="font-mono">B.</code> …, lalu{" "}
                <code className="font-mono">KUNCI: B</code>.
              </li>
              <li>
                <b>Isian:</b> <code className="font-mono">JAWABAN: Jakarta | DKI Jakarta</code> (varian dipisah{" "}
                <code className="font-mono">|</code>).
              </li>
              <li>
                <b>Esai:</b> cukup <code className="font-mono">SOAL:</code>, opsional{" "}
                <code className="font-mono">RUBRIK:</code>.
              </li>
              <li>
                Opsional di semua jenis: <code className="font-mono">BOBOT:</code> (bawaan 1) dan{" "}
                <code className="font-mono">PEMBAHASAN:</code>.
              </li>
              <li>
                <code className="font-mono">JENIS:</code> boleh dihilangkan; jenis ditebak dari isi.
              </li>
            </ul>
          </details>
        </div>

        <Card className="space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pratinjau</p>
            {teks.trim() && (
              <Badge tone={bisa ? "hijau" : hasil.galat.length ? "merah" : "netral"}>
                {hasil.soal.length} soal terbaca
                {hasil.galat.length > 0 && ` · ${hasil.galat.length} bermasalah`}
              </Badge>
            )}
          </div>

          {!teks.trim() && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Pratinjau muncul di sini setelah kamu menempel soal.
            </p>
          )}

          {hasil.galat.length > 0 && (
            <ul className="space-y-1.5">
              {hasil.galat.map((g) => (
                <li
                  key={g.blok}
                  className="flex items-start gap-2 rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Blok {g.blok}: {g.pesan}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {hasil.soal.length > 0 && (
            <ol className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {hasil.soal.map((s, i) => (
                <li key={i} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-lg bg-primary-soft text-xs font-extrabold text-primary-deep">
                      {i + 1}
                    </span>
                    <Badge tone="biru">{JENIS_LABEL[s.jenis]}</Badge>
                    <span className="text-xs text-muted-foreground">Bobot {s.bobot}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{potong(s.teks, 160)}</p>
                  {s.jenis === "pilihan_ganda" && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {s.opsi.length} opsi · kunci {HURUF_OPSI[s.kunci_index]}
                    </p>
                  )}
                  {s.jenis === "isian" && (
                    <p className="mt-1.5 text-xs text-muted-foreground">Jawaban: {s.jawaban_isian.join(" · ")}</p>
                  )}
                </li>
              ))}
            </ol>
          )}

          {galat && (
            <p className="rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">
              {galat}
            </p>
          )}

          <Button size="lg" className="w-full" disabled={!bisa || proses} onClick={simpan}>
            <CheckCircle2 className="size-5" />
            {proses ? "Menyimpan…" : bisa ? `Simpan ${hasil.soal.length} soal` : "Simpan"}
          </Button>
          {hasil.galat.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Perbaiki blok yang bermasalah dulu. Tidak ada soal yang disimpan sebagian.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
