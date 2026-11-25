"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, RotateCcw, X } from "lucide-react";
import { SoalPreview } from "@/components/soal-preview";
import { UnggahGambar } from "@/components/unggah-gambar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import type { JenisSoal, SoalForm as Bentuk } from "@/lib/types";
import { HURUF_OPSI, JENIS_LABEL, cn } from "@/lib/utils";
import { simpanSoal } from "@/app/admin/actions";

const KOSONG: Bentuk = {
  jenis: "pilihan_ganda",
  teks: "",
  gambar: "",
  bobot: "1",
  opsi: ["", "", "", "", ""],
  opsiGambar: ["", "", "", "", ""],
  kunci: -1,
  jawaban: [],
  rubrik: "",
  pembahasan: "",
};

const JENIS: JenisSoal[] = ["pilihan_ganda", "isian", "esai"];

function tanpaIsi(f: Bentuk) {
  return (
    !f.teks.trim() &&
    !f.gambar &&
    f.opsiGambar.every((g) => !g) &&
    f.opsi.every((o) => !o.trim()) &&
    f.jawaban.length === 0 &&
    !f.rubrik.trim() &&
    !f.pembahasan.trim()
  );
}

export function SoalForm({
  ujianId,
  judulUjian,
  soalId,
  nomor,
  awal,
}: {
  ujianId: string;
  judulUjian: string;
  soalId?: string;
  nomor: number;
  awal?: Bentuk;
}) {
  const router = useRouter();
  const dasar = awal ?? KOSONG;
  const [f, setF] = useState<Bentuk>(dasar);
  const [jawabanBaru, setJawabanBaru] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pulih, setPulih] = useState(false);
  const [proses, mulai] = useTransition();
  const siap = useRef(false);

  const kunciDraf = `rp-draf-soal:${ujianId}:${soalId ?? "baru"}`;
  const ubah = (bagian: Partial<Bentuk>) => setF((lama) => ({ ...lama, ...bagian }));

  // Pulihkan draf yang belum sempat disimpan (jika ada).
  useEffect(() => {
    try {
      const mentah = localStorage.getItem(kunciDraf);
      if (mentah) {
        setF({ ...KOSONG, ...(JSON.parse(mentah) as Partial<Bentuk>) });
        setPulih(true);
      }
    } catch {
      /* penyimpanan browser tidak tersedia: abaikan */
    }
    siap.current = true;
  }, [kunciDraf]);

  // Simpan draf otomatis (tertunda 0,6 detik setelah berhenti mengetik).
  useEffect(() => {
    if (!siap.current) return;
    const t = setTimeout(() => {
      try {
        const sama = JSON.stringify(f) === JSON.stringify(dasar);
        if (sama || (!awal && tanpaIsi(f))) localStorage.removeItem(kunciDraf);
        else localStorage.setItem(kunciDraf, JSON.stringify(f));
      } catch {
        /* abaikan */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [f, kunciDraf, dasar, awal]);

  function buangDraf() {
    try {
      localStorage.removeItem(kunciDraf);
    } catch {
      /* abaikan */
    }
    setF(dasar);
    setPulih(false);
  }

  // ---- opsi pilihan ganda
  function hapusOpsi(i: number) {
    ubah({
      opsi: f.opsi.filter((_, k) => k !== i),
      opsiGambar: f.opsi.map((_, k) => f.opsiGambar[k] ?? "").filter((_, k) => k !== i),
      kunci: f.kunci === i ? -1 : f.kunci > i ? f.kunci - 1 : f.kunci,
    });
  }

  // ---- chip jawaban isian
  function tambahJawaban(mentah: string) {
    const baru = mentah
      .split(/[|\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!baru.length) return;
    const ada = new Set(f.jawaban.map((j) => j.toLowerCase()));
    const unik = baru.filter((j) => !ada.has(j.toLowerCase()));
    if (unik.length) ubah({ jawaban: [...f.jawaban, ...unik] });
    setJawabanBaru("");
  }

  function kirim(lagi: boolean) {
    setGalat(null);
    setInfo(null);
    const bobot = Number(f.bobot.replace(",", "."));
    if (!f.bobot.trim() || !Number.isFinite(bobot)) {
      setGalat("Bobot harus berupa angka.");
      return;
    }
    // jawaban yang masih diketik tapi belum ditekan Enter ikut disimpan
    const jawaban = jawabanBaru.trim() ? [...f.jawaban, jawabanBaru.trim()] : f.jawaban;

    const dasarData = { id: soalId, ujian_id: ujianId, teks: f.teks, gambar: f.gambar, bobot, pembahasan: f.pembahasan };
    const data =
      f.jenis === "pilihan_ganda"
        ? { ...dasarData, jenis: "pilihan_ganda" as const, opsi: f.opsi, opsi_gambar: f.opsi.map((_, k) => f.opsiGambar[k] ?? ""), kunci_index: f.kunci }
        : f.jenis === "isian"
          ? { ...dasarData, jenis: "isian" as const, jawaban_isian: jawaban }
          : { ...dasarData, jenis: "esai" as const, rubrik: f.rubrik };

    mulai(async () => {
      const r = await simpanSoal(data);
      if (!r.ok) {
        setGalat(r.error);
        return;
      }
      try {
        localStorage.removeItem(kunciDraf);
      } catch {
        /* abaikan */
      }
      if (lagi) {
        setF({ ...KOSONG, jenis: f.jenis, bobot: f.bobot });
        setJawabanBaru("");
        setPulih(false);
        setInfo("Soal tersimpan. Silakan isi soal berikutnya.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        router.refresh();
      } else {
        router.push(`/admin/ujian/${ujianId}`);
        router.refresh();
      }
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
      <h1 className="mb-5 text-xl font-extrabold tracking-tight text-primary-deep sm:text-2xl">
        {soalId ? `Ubah soal nomor ${nomor}` : `Soal baru (nomor ${nomor})`}
      </h1>

      {pulih && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent/40 px-3.5 py-2.5 text-sm font-medium text-[#4a3a00] dark:text-accent">
          <span>Draf yang belum tersimpan dipulihkan.</span>
          <button
            type="button"
            onClick={buangDraf}
            className="inline-flex cursor-pointer items-center gap-1.5 font-bold underline"
          >
            <RotateCcw className="size-3.5" /> Buang draf
          </button>
        </div>
      )}
      {info && (
        <p className="mb-4 rounded-xl bg-success/20 px-3.5 py-2.5 text-sm font-medium text-[#1f6b3f] dark:text-success">
          {info}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="space-y-5">
          {/* jenis soal */}
          <div role="group" aria-label="Jenis soal" className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted p-1">
            {JENIS.map((j) => (
              <button
                key={j}
                type="button"
                aria-pressed={f.jenis === j}
                onClick={() => ubah({ jenis: j })}
                className={cn(
                  "h-10 cursor-pointer rounded-lg text-sm font-semibold transition-colors",
                  f.jenis === j ? "bg-card text-primary-deep shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {JENIS_LABEL[j]}
              </button>
            ))}
          </div>

          <Field label="Teks soal">
            <Textarea
              value={f.teks}
              onChange={(e) => ubah({ teks: e.target.value })}
              rows={5}
              placeholder="Tulis soal di sini…"
              autoFocus={!soalId}
            />
            <span className="block text-xs text-muted-foreground">
              Rumus: tulis di antara tanda dolar, mis. <code>$x^2 + 3x$</code>; satu baris sendiri pakai <code>$$…$$</code>.
              Untuk tanda dolar biasa tulis <code>\$</code>.
            </span>
          </Field>

          <UnggahGambar
            label="Gambar soal (opsional)"
            ujianId={ujianId}
            nilai={f.gambar}
            onUbah={(url) => ubah({ gambar: url })}
          />

          {/* pilihan ganda */}
          {f.jenis === "pilihan_ganda" && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Opsi jawaban <span className="font-normal text-muted-foreground">— klik huruf untuk menandai kunci</span>
              </p>
              {f.opsi.map((o, i) => (
                <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => ubah({ kunci: i })}
                    aria-pressed={f.kunci === i}
                    aria-label={`Jadikan opsi ${HURUF_OPSI[i]} sebagai kunci`}
                    className={cn(
                      "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border text-sm font-extrabold transition-colors",
                      f.kunci === i
                        ? "border-success bg-success text-[#0f3a22]"
                        : "border-border bg-card text-primary-deep hover:bg-primary-soft",
                    )}
                  >
                    {HURUF_OPSI[i]}
                  </button>
                  <Input
                    value={o}
                    onChange={(e) => ubah({ opsi: f.opsi.map((x, k) => (k === i ? e.target.value : x)) })}
                    placeholder={`Opsi ${HURUF_OPSI[i]}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus opsi ${HURUF_OPSI[i]}`}
                    disabled={f.opsi.length <= 2}
                    onClick={() => hapusOpsi(i)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="pl-[3.25rem]">
                  <UnggahGambar
                    kecil
                    label={`Gambar opsi ${HURUF_OPSI[i]}`}
                    ujianId={ujianId}
                    nilai={f.opsiGambar[i] ?? ""}
                    onUbah={(url) =>
                      ubah({ opsiGambar: f.opsi.map((_, k) => (k === i ? url : (f.opsiGambar[k] ?? ""))) })
                    }
                  />
                </div>
                </div>
              ))}
              <Button
                variant="soft"
                size="sm"
                disabled={f.opsi.length >= 10}
                onClick={() => ubah({ opsi: [...f.opsi, ""], opsiGambar: [...f.opsi.map((_, k) => f.opsiGambar[k] ?? ""), ""] })}
              >
                <Plus className="size-4" /> Tambah opsi
              </Button>
            </div>
          )}

          {/* isian */}
          {f.jenis === "isian" && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Jawaban yang benar{" "}
                <span className="font-normal text-muted-foreground">— boleh beberapa varian</span>
              </p>
              {f.jawaban.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {f.jawaban.map((j, i) => (
                    <li
                      key={`${j}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1 text-sm font-semibold text-primary-deep"
                    >
                      {j}
                      <button
                        type="button"
                        aria-label={`Hapus jawaban ${j}`}
                        onClick={() => ubah({ jawaban: f.jawaban.filter((_, k) => k !== i) })}
                        className="flex size-6 cursor-pointer items-center justify-center rounded-full hover:bg-card"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input
                  value={jawabanBaru}
                  onChange={(e) => setJawabanBaru(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      tambahJawaban(jawabanBaru);
                    }
                  }}
                  placeholder="Ketik jawaban lalu tekan Enter"
                />
                <Button variant="soft" onClick={() => tambahJawaban(jawabanBaru)} disabled={!jawabanBaru.trim()}>
                  Tambah
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Huruf besar/kecil dan spasi berlebih diabaikan saat dinilai.
              </p>
            </div>
          )}

          {/* esai */}
          {f.jenis === "esai" && (
            <Field label="Rubrik penilaian" hint="Opsional. Hanya terlihat oleh admin saat menilai.">
              <Textarea value={f.rubrik} onChange={(e) => ubah({ rubrik: e.target.value })} rows={3} />
            </Field>
          )}

          <Field label="Pembahasan" hint="Opsional. Tampil ke peserta setelah ujian selesai.">
            <Textarea value={f.pembahasan} onChange={(e) => ubah({ pembahasan: e.target.value })} rows={3} />
          </Field>

          <Field label="Bobot" hint="Bawaan 1. Skor dihitung dari total bobot yang benar.">
            <Input
              value={f.bobot}
              onChange={(e) => ubah({ bobot: e.target.value })}
              inputMode="decimal"
              className="max-w-32"
            />
          </Field>

          {galat && (
            <p className="rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">
              {galat}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Link
              href={`/admin/ujian/${ujianId}`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted"
            >
              Batal
            </Link>
            {!soalId && (
              <Button variant="soft" onClick={() => kirim(true)} disabled={proses}>
                Simpan &amp; tambah lagi
              </Button>
            )}
            <Button onClick={() => kirim(false)} disabled={proses}>
              {proses ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </Card>

        <Card className="lg:sticky lg:top-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pratinjau untuk peserta
          </p>
          <SoalPreview
            nomor={nomor}
            jenis={f.jenis}
            teks={f.teks}
            gambar={f.gambar}
            opsi={f.opsi}
            opsiGambar={f.opsiGambar}
            kunci={f.kunci}
            jawaban={f.jawaban}
            rubrik={f.rubrik}
            pembahasan={f.pembahasan}
            bobot={f.bobot}
          />
        </Card>
      </div>
    </div>
  );
}
