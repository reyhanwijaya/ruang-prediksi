"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eraser,
  ListChecks,
  Maximize,
  Send,
  ShieldAlert,
} from "lucide-react";
import { HasilPanel } from "@/components/hasil-sesi";
import { Logo } from "@/components/logo";
import { GambarSoal, TeksSoal } from "@/components/teks-soal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/form";
import {
  batalkanSesiAksi,
  ambilSoalAksi,
  catatPelanggaranAksi,
  kumpulkanAksi,
  mulaiUjianAksi,
  simpanJawabanAksi,
} from "@/app/ujian/actions";
import { keluarLayarPenuh, layarPenuhDidukung, masukLayarPenuh, sedangLayarPenuh } from "@/lib/layar-penuh";
import type { HasilSesi, JenisPelanggaran, SesiUjian, SoalUjian } from "@/lib/types";
import { JENIS_LABEL, cn } from "@/lib/utils";

type Fase = "intro" | "ujian" | "selesai";
type StatusSimpan = "diam" | "menyimpan" | "tersimpan" | "gagal";

function formatWaktu(detik: number) {
  const j = Math.floor(detik / 3600);
  const m = Math.floor((detik % 3600) / 60);
  const s = detik % 60;
  const dua = (n: number) => String(n).padStart(2, "0");
  return j > 0 ? `${j}:${dua(m)}:${dua(s)}` : `${dua(m)}:${dua(s)}`;
}

export function UjianKlien({ awal }: { awal: SesiUjian }) {
  const router = useRouter();

  const [sesi, setSesi] = useState<SesiUjian>(awal);
  const [fase, setFase] = useState<Fase>(awal.status === "berjalan" ? "intro" : "selesai");
  const [hasil, setHasil] = useState<HasilSesi | null>(awal.hasil);
  const [fsDukung, setFsDukung] = useState<boolean | null>(null);
  const [layarPenuh, setLayarPenuh] = useState(true);
  const [pelanggaran, setPelanggaran] = useState(awal.pelanggaran);
  const [peringatan, setPeringatan] = useState<string | null>(null);
  const [nomor, setNomor] = useState(1);
  const [soalMap, setSoalMap] = useState<Record<number, SoalUjian>>({});
  const [jawaban, setJawaban] = useState<Record<number, string>>({});
  const [terjawab, setTerjawab] = useState<number[]>(awal.nomor_terjawab);
  const [memuat, setMemuat] = useState(false);
  const [sisa, setSisa] = useState<number | null>(null);
  const [statusSimpan, setStatusSimpan] = useState<StatusSimpan>("diam");
  const [dialogKumpul, setDialogKumpul] = useState(false);
  const [dialogDaftar, setDialogDaftar] = useState(false);
  const [mengumpulkan, setMengumpulkan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [memulai, setMemulai] = useState(false);

  const offsetRef = useRef(0); // selisih jam server - jam perangkat (ms)
  const deadlineRef = useRef(0); // batas waktu menurut server (ms)
  const ultimaPelRef = useRef(0);
  const antreanRef = useRef<Promise<void>>(Promise.resolve());
  const tertundaRef = useRef(new Map<number, { nilai: string; t: ReturnType<typeof setTimeout> }>());
  const gagalRef = useRef(new Map<number, string>());
  const selesaiRef = useRef(awal.status !== "berjalan");
  const mengumpulkanRef = useRef(false);
  const kumpulRef = useRef<() => Promise<void>>(async () => {});

  const jumlah = sesi.jumlah_soal;

  // ------------------------------------------------------------ dasar
  useEffect(() => {
    setFsDukung(layarPenuhDidukung());
  }, []);

  const terapkanSesi = useCallback((s: SesiUjian) => {
    setSesi(s);
    setPelanggaran(s.pelanggaran);
    setTerjawab(s.nomor_terjawab);
    offsetRef.current = new Date(s.server_now).getTime() - Date.now();
    deadlineRef.current = s.deadline ? new Date(s.deadline).getTime() : 0;
  }, []);

  const akhiri = useCallback((h: HasilSesi) => {
    selesaiRef.current = true;
    setHasil(h);
    setFase("selesai");
    setDialogKumpul(false);
    setDialogDaftar(false);
    void keluarLayarPenuh();
  }, []);

  async function mulai() {
    setGalat(null);
    setMemulai(true);
    // Permintaan layar penuh harus langsung dari klik pengguna, jadi dilakukan sebelum memanggil server.
    if (fsDukung) {
      try {
        await masukLayarPenuh();
      } catch {
        /* ditolak browser: peringatan layar penuh akan muncul di dalam ujian */
      }
    }
    const r = await mulaiUjianAksi(sesi.id);
    if (!r.ok) {
      setGalat(r.pesan);
      setMemulai(false);
      if (r.hasil) akhiri(r.hasil);
      return;
    }
    if (r.sesi.status !== "berjalan") {
      setMemulai(false);
      if (r.sesi.hasil) akhiri(r.sesi.hasil);
      return;
    }
    terapkanSesi(r.sesi);
    setLayarPenuh(!fsDukung || sedangLayarPenuh());
    setNomor(1);
    setFase("ujian");
    setMemulai(false);
  }

  async function batal() {
    setMemulai(true);
    const r = await batalkanSesiAksi(sesi.id);
    if (r.ok) router.push("/beranda");
    else {
      setGalat(r.pesan ?? "Tidak bisa membatalkan.");
      setMemulai(false);
    }
  }

  // ------------------------------------------------------------ timer (jam server)
  useEffect(() => {
    if (fase !== "ujian") return;
    const hitung = () => {
      const ms = deadlineRef.current - (Date.now() + offsetRef.current);
      const dt = Math.max(0, Math.ceil(ms / 1000));
      setSisa(dt);
      return dt;
    };
    if (hitung() <= 0) {
      void kumpulRef.current();
      return;
    }
    const t = setInterval(() => {
      if (hitung() <= 0) {
        clearInterval(t);
        void kumpulRef.current();
      }
    }, 500);
    return () => clearInterval(t);
  }, [fase]);

  // ------------------------------------------------------------ pelanggaran
  const catat = useCallback(
    async (jenis: JenisPelanggaran) => {
      if (selesaiRef.current) return;
      const kini = Date.now();
      if (kini - ultimaPelRef.current < 2000) return; // kejadian dalam 2 detik = satu pelanggaran
      ultimaPelRef.current = kini;

      const r = await catatPelanggaranAksi(sesi.id, jenis);
      if (!r.ok) {
        if (r.hasil) akhiri(r.hasil);
        return;
      }
      setPelanggaran(r.pelanggaran);
      if (r.status !== "berjalan") {
        if (r.hasil) akhiri(r.hasil);
        return;
      }
      if (r.dicatat && jenis !== "keluar_fullscreen") {
        setPeringatan(`Pelanggaran tercatat: kamu meninggalkan halaman ujian. Pelanggaran: ${r.pelanggaran}.`);
      }
    },
    [sesi.id, akhiri],
  );

  useEffect(() => {
    if (fase !== "ujian") return;

    const onFs = () => {
      if (sedangLayarPenuh()) {
        setLayarPenuh(true);
      } else {
        setLayarPenuh(false);
        setDialogKumpul(false);
        setDialogDaftar(false);
        void catat("keluar_fullscreen");
      }
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") void catat("pindah_tab");
    };
    const onBlur = () => void catat("kehilangan_fokus");

    if (fsDukung) {
      document.addEventListener("fullscreenchange", onFs);
      document.addEventListener("webkitfullscreenchange", onFs);
    }
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, [fase, fsDukung, catat]);

  useEffect(() => {
    if (!peringatan) return;
    const t = setTimeout(() => setPeringatan(null), 6000);
    return () => clearTimeout(t);
  }, [peringatan]);

  // ------------------------------------------------------------ anti-nyontek dasar
  useEffect(() => {
    if (fase !== "ujian") return;

    const cegah = (e: Event) => e.preventDefault();
    const dalamInput = (t: EventTarget | null) => {
      const el = t instanceof Element ? t : t instanceof Node ? t.parentElement : null;
      return !!el?.closest("input, textarea");
    };
    const cegahPilih = (e: Event) => {
      if (!dalamInput(e.target)) e.preventDefault();
    };
    const tombol = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const terlarang =
        e.key === "F12" ||
        (ctrl && ["c", "x", "v", "a", "s", "p", "u"].includes(k)) ||
        (ctrl && e.shiftKey && ["i", "j", "c"].includes(k));
      if (terlarang) e.preventDefault();
    };
    const lepas = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") void navigator.clipboard?.writeText("Tangkapan layar dinonaktifkan.").catch(() => {});
    };

    document.addEventListener("contextmenu", cegah);
    document.addEventListener("copy", cegah);
    document.addEventListener("cut", cegah);
    document.addEventListener("paste", cegah);
    document.addEventListener("dragstart", cegah);
    document.addEventListener("drop", cegah);
    document.addEventListener("selectstart", cegahPilih);
    document.addEventListener("keydown", tombol);
    document.addEventListener("keyup", lepas);
    return () => {
      document.removeEventListener("contextmenu", cegah);
      document.removeEventListener("copy", cegah);
      document.removeEventListener("cut", cegah);
      document.removeEventListener("paste", cegah);
      document.removeEventListener("dragstart", cegah);
      document.removeEventListener("drop", cegah);
      document.removeEventListener("selectstart", cegahPilih);
      document.removeEventListener("keydown", tombol);
      document.removeEventListener("keyup", lepas);
    };
  }, [fase]);

  // ------------------------------------------------------------ memuat soal per nomor
  const ambil = useCallback(
    async (n: number) => {
      const r = await ambilSoalAksi(sesi.id, n);
      if (!r.ok) {
        if (r.hasil) akhiri(r.hasil);
        else setGalat(r.pesan);
        return;
      }
      setGalat(null);
      setSoalMap((m) => ({ ...m, [n]: r.soal }));
      setJawaban((j) => (n in j ? j : { ...j, [n]: r.jawaban ?? "" }));
    },
    [sesi.id, akhiri],
  );

  useEffect(() => {
    if (fase !== "ujian") return;
    if (!soalMap[nomor]) {
      setMemuat(true);
      void ambil(nomor).finally(() => setMemuat(false));
    } else if (nomor < jumlah && !soalMap[nomor + 1]) {
      void ambil(nomor + 1); // siapkan soal berikutnya di latar belakang
    }
  }, [fase, nomor, soalMap, jumlah, ambil]);

  // ------------------------------------------------------------ menyimpan jawaban per soal
  const kirimSimpan = useCallback(
    (n: number, nilai: string) => {
      setStatusSimpan("menyimpan");
      // Antrean berurutan supaya jawaban lama tidak menimpa jawaban baru.
      antreanRef.current = antreanRef.current.then(async () => {
        try {
          const r = await simpanJawabanAksi(sesi.id, n, nilai);
          if (!r.ok) {
            if (r.hasil) {
              akhiri(r.hasil);
            } else {
              gagalRef.current.set(n, nilai);
              setStatusSimpan("gagal");
            }
            return;
          }
          gagalRef.current.delete(n);
          setStatusSimpan(gagalRef.current.size ? "gagal" : "tersimpan");
        } catch {
          gagalRef.current.set(n, nilai);
          setStatusSimpan("gagal");
        }
      });
      return antreanRef.current;
    },
    [sesi.id, akhiri],
  );

  function ubahJawaban(n: number, nilai: string, tunda: boolean) {
    setJawaban((j) => ({ ...j, [n]: nilai }));
    setTerjawab((t) => {
      const ada = t.includes(n);
      const isi = nilai.trim() !== "";
      if (isi && !ada) return [...t, n];
      if (!isi && ada) return t.filter((x) => x !== n);
      return t;
    });

    const lama = tertundaRef.current.get(n);
    if (lama) clearTimeout(lama.t);

    if (tunda) {
      const t = setTimeout(() => {
        tertundaRef.current.delete(n);
        void kirimSimpan(n, nilai);
      }, 700);
      tertundaRef.current.set(n, { nilai, t });
      setStatusSimpan("menyimpan");
    } else {
      tertundaRef.current.delete(n);
      void kirimSimpan(n, nilai);
    }
  }

  async function kirimSemuaTertunda() {
    const sudah = new Set<number>();
    for (const [n, p] of Array.from(tertundaRef.current)) {
      clearTimeout(p.t);
      tertundaRef.current.delete(n);
      sudah.add(n);
      void kirimSimpan(n, p.nilai);
    }
    for (const [n, v] of Array.from(gagalRef.current)) {
      if (!sudah.has(n)) void kirimSimpan(n, v);
    }
    await antreanRef.current;
  }

  // ------------------------------------------------------------ mengumpulkan
  async function kumpulkanSekarang() {
    if (selesaiRef.current || mengumpulkanRef.current) return;
    mengumpulkanRef.current = true;
    setMengumpulkan(true);
    setGalat(null);
    await kirimSemuaTertunda();
    const r = await kumpulkanAksi(sesi.id);
    mengumpulkanRef.current = false;
    setMengumpulkan(false);
    if (r.ok) akhiri(r.hasil);
    else if (r.hasil) akhiri(r.hasil);
    else setGalat(r.pesan);
  }
  useEffect(() => {
    kumpulRef.current = kumpulkanSekarang;
  });

  function pindah(n: number) {
    if (n < 1 || n > jumlah) return;
    setNomor(n);
    setDialogDaftar(false);
    window.scrollTo({ top: 0 });
  }

  async function kembaliLayarPenuh() {
    try {
      await masukLayarPenuh();
    } catch {
      /* ditolak: coba lagi */
    }
  }

  // ================================================================ TAMPILAN
  if (fase === "selesai") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-10">
        {hasil ? (
          <HasilPanel judul={sesi.judul} hasil={hasil} />
        ) : (
          <Card className="text-center">
            <p className="font-bold">Sesi ini sudah berakhir.</p>
            <Link href="/riwayat" className={cn(buttonVariants({ className: "mt-4" }))}>
              Lihat riwayat
            </Link>
          </Card>
        )}
      </main>
    );
  }

  if (fase === "intro") {
    const dilanjutkan = sesi.mulai_pada !== null;
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-10">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card className="p-5 sm:p-7">
          <h1 className="text-xl font-extrabold tracking-tight text-primary-deep sm:text-2xl">{sesi.judul}</h1>
          {sesi.deskripsi && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sesi.deskripsi}</p>}

          <ul className="mt-4 flex flex-wrap gap-2">
            <li>
              <Badge tone="biru">
                <Clock className="size-3.5" /> {sesi.durasi_menit} menit
              </Badge>
            </li>
            <li>
              <Badge tone="biru">
                <ListChecks className="size-3.5" /> {sesi.jumlah_soal} soal
              </Badge>
            </li>
            {sesi.kunci_pelanggaran && (
              <li>
                <Badge tone="oranye">Dikunci setelah 3 pelanggaran</Badge>
              </li>
            )}
          </ul>

          <div className="mt-5 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold leading-relaxed text-primary-deep">
            Ujian ini berjalan dalam layar penuh. Keluar dari layar penuh akan dicatat sebagai pelanggaran.
          </div>

          {fsDukung === false && (
            <p className="mt-3 rounded-xl bg-accent/40 px-4 py-3 text-sm leading-relaxed text-[#4a3a00] dark:text-accent">
              Perangkat ini (mis. iPhone) tidak mendukung layar penuh untuk halaman web. Kamu tetap bisa mengerjakan;
              berpindah tab atau aplikasi tetap dicatat sebagai pelanggaran.
            </p>
          )}

          <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Waktu dihitung di server dan terus berjalan walau kamu menutup halaman.</li>
            <li>Jawaban tersimpan otomatis per soal dan bisa diubah sampai kamu menekan Kumpulkan atau waktu habis.</li>
            <li>Menyalin, menempel, klik kanan, dan jalan pintas tertentu dinonaktifkan.</li>
            <li>Berpindah tab atau kehilangan fokus dicatat sebagai pelanggaran.</li>
          </ul>

          {dilanjutkan && (
            <p className="mt-4 rounded-xl bg-warning/20 px-4 py-3 text-sm font-medium text-[#8a4a12] dark:text-warning">
              Ujian ini sedang berjalan. Waktu tetap dihitung sejak kamu pertama kali memulai.
            </p>
          )}

          {galat && (
            <p className="mt-4 rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">
              {galat}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <Button size="lg" className="sm:flex-1" onClick={mulai} disabled={memulai || fsDukung === null}>
              {memulai ? "Menyiapkan…" : dilanjutkan ? "Lanjutkan ujian" : "Mulai ujian"}
            </Button>
            {dilanjutkan ? (
              <Link href="/beranda" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Kembali
              </Link>
            ) : (
              <Button variant="outline" size="lg" onClick={batal} disabled={memulai}>
                Batal
              </Button>
            )}
          </div>
          {!dilanjutkan && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Timer baru berjalan setelah kamu menekan “Mulai ujian”. “Batal” mengembalikan kuota kodenya.
            </p>
          )}
        </Card>
      </main>
    );
  }

  // ---------------------------------------------------------------- fase ujian
  const soal = soalMap[nomor];
  const nilai = jawaban[nomor] ?? "";
  const adaJawaban = nilai.trim() !== "";
  const terakhir = nomor === jumlah;
  const belum = Array.from({ length: jumlah }, (_, i) => i + 1).filter((n) => !terjawab.includes(n));

  const warnaTimer =
    sisa === null
      ? "bg-primary-soft text-primary-deep"
      : sisa <= 60
        ? "animate-pulse bg-danger/20 text-[#b23b3b] dark:text-danger"
        : sisa <= 300
          ? "bg-warning/25 text-[#8a4a12] dark:text-warning"
          : "bg-primary-soft text-primary-deep";

  return (
    <div className="sembunyi-cetak min-h-dvh pb-28 lg:pb-10">
      {/* Bilah atas */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">{sesi.judul}</p>
            <p className="text-xs text-muted-foreground">
              Soal {nomor} dari {jumlah} · {terjawab.length} terjawab
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {pelanggaran > 0 && (
              <Badge tone="merah" title="Jumlah pelanggaran">
                <AlertTriangle className="size-3.5" />
                {sesi.kunci_pelanggaran ? `${pelanggaran}/3` : pelanggaran}
              </Badge>
            )}
            <span
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-mono text-sm font-extrabold tabular-nums",
                warnaTimer,
              )}
              aria-label="Sisa waktu"
            >
              <Clock className="size-4" />
              {sisa === null ? "--:--" : formatWaktu(sisa)}
            </span>
            <Button size="sm" className="hidden sm:inline-flex" onClick={() => setDialogKumpul(true)}>
              <Send className="size-4" /> Kumpulkan
            </Button>
          </div>
        </div>
        {peringatan && (
          <p role="alert" className="bg-danger/15 px-4 py-2 text-center text-sm font-semibold text-[#b23b3b] dark:text-danger">
            {peringatan}
          </p>
        )}
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-4 pt-5 lg:grid-cols-[1fr_280px]">
        <section>
          {galat && !soal && (
            <Card className="text-center">
              <p className="text-sm font-medium text-[#b23b3b] dark:text-danger">{galat}</p>
              <Button className="mt-3" variant="soft" onClick={() => void ambil(nomor)}>
                Muat ulang soal
              </Button>
            </Card>
          )}

          {!soal && !galat && (
            <Card className="space-y-3" aria-busy="true">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
              {memuat && <span className="sr-only">Memuat soal…</span>}
            </Card>
          )}

          {soal && (
            <Card className="space-y-5 p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold text-primary-deep">Soal {soal.nomor}</span>
                <Badge tone="biru">{JENIS_LABEL[soal.jenis]}</Badge>
                <Badge>Bobot {Number(soal.bobot)}</Badge>
              </div>

              <div className="space-y-3 select-none">
                <TeksSoal teks={soal.teks} className="text-[15px] leading-relaxed" />
                {soal.gambar_url && <GambarSoal src={soal.gambar_url} />}
              </div>

              {soal.jenis === "pilihan_ganda" && (
                <ul className="space-y-2.5">
                  {soal.opsi.map((o) => {
                    const pilih = nilai === o.kode;
                    return (
                      <li key={o.kode}>
                        <button
                          type="button"
                          aria-pressed={pilih}
                          onClick={() => ubahJawaban(nomor, o.kode, false)}
                          className={cn(
                            "flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors select-none",
                            pilih ? "border-primary bg-primary-soft" : "border-border hover:bg-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                              pilih ? "bg-solid text-solid-foreground" : "bg-primary-soft text-primary-deep",
                            )}
                          >
                            {o.kode}
                          </span>
                          <span className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed">
                            <TeksSoal teks={o.teks} inline />
                            {o.gambar && <GambarSoal src={o.gambar} className="mt-2 max-h-48" />}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {soal.jenis === "isian" && (
                <Input
                  value={nilai}
                  onChange={(e) => ubahJawaban(nomor, e.target.value, true)}
                  placeholder="Ketik jawabanmu…"
                  maxLength={300}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-label="Jawaban isian"
                  className="select-text"
                />
              )}

              {soal.jenis === "esai" && (
                <div>
                  <Textarea
                    value={nilai}
                    onChange={(e) => ubahJawaban(nomor, e.target.value, true)}
                    placeholder="Tulis jawabanmu di sini…"
                    rows={10}
                    maxLength={10000}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Jawaban esai"
                    className="select-text"
                  />
                  <p className="mt-1 text-right text-xs text-muted-foreground">{nilai.length} karakter</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => ubahJawaban(nomor, "", false)}
                  disabled={!adaJawaban}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-40"
                >
                  <Eraser className="size-3.5" /> Kosongkan jawaban
                </button>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    statusSimpan === "gagal" ? "text-[#b23b3b] dark:text-danger" : "text-muted-foreground",
                  )}
                  aria-live="polite"
                >
                  {statusSimpan === "menyimpan" && "Menyimpan…"}
                  {statusSimpan === "tersimpan" && "Tersimpan ✓"}
                  {statusSimpan === "gagal" && (
                    <button type="button" className="cursor-pointer underline" onClick={() => void kirimSemuaTertunda()}>
                      Gagal menyimpan. Coba lagi
                    </button>
                  )}
                </span>
              </div>
            </Card>
          )}

          {/* Navigasi soal (layar lebar) */}
          <div className="mt-4 hidden items-center justify-between gap-2 lg:flex">
            <Button variant="outline" onClick={() => pindah(nomor - 1)} disabled={nomor === 1}>
              <ChevronLeft className="size-4" /> Sebelumnya
            </Button>
            {terakhir ? (
              <Button onClick={() => setDialogKumpul(true)}>
                <Send className="size-4" /> Kumpulkan
              </Button>
            ) : (
              <Button onClick={() => pindah(nomor + 1)}>
                Berikutnya <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </section>

        {/* Panel nomor (layar lebar) */}
        <aside className="hidden lg:block">
          <Card className="sticky top-20 space-y-4">
            <p className="text-sm font-bold">Daftar soal</p>
            <PanelNomor jumlah={jumlah} aktif={nomor} terjawab={terjawab} onPilih={pindah} />
            <p className="text-xs text-muted-foreground">
              {terjawab.length} dari {jumlah} terjawab
            </p>
            <Button className="w-full" onClick={() => setDialogKumpul(true)}>
              <Send className="size-4" /> Kumpulkan
            </Button>
          </Card>
        </aside>
      </main>

      {/* Bilah bawah (HP & tablet) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5">
          <Button variant="outline" size="icon" aria-label="Soal sebelumnya" onClick={() => pindah(nomor - 1)} disabled={nomor === 1}>
            <ChevronLeft className="size-5" />
          </Button>
          <Button variant="soft" className="flex-1" onClick={() => setDialogDaftar(true)}>
            <ListChecks className="size-4" /> {nomor}/{jumlah} · Daftar soal
          </Button>
          {terakhir ? (
            <Button onClick={() => setDialogKumpul(true)}>
              <Send className="size-4" /> Kumpulkan
            </Button>
          ) : (
            <Button size="icon" aria-label="Soal berikutnya" onClick={() => pindah(nomor + 1)}>
              <ChevronRight className="size-5" />
            </Button>
          )}
        </div>
      </nav>

      {/* Dialog daftar soal (HP) */}
      <Dialog open={dialogDaftar} onClose={() => setDialogDaftar(false)} judul="Daftar soal" deskripsi={`${terjawab.length} dari ${jumlah} terjawab`}>
        <PanelNomor jumlah={jumlah} aktif={nomor} terjawab={terjawab} onPilih={pindah} />
        <Button className="mt-5 w-full" onClick={() => { setDialogDaftar(false); setDialogKumpul(true); }}>
          <Send className="size-4" /> Kumpulkan
        </Button>
      </Dialog>

      {/* Konfirmasi kumpulkan */}
      <Dialog open={dialogKumpul} onClose={() => !mengumpulkan && setDialogKumpul(false)} judul="Kumpulkan jawaban?">
        <p className="text-sm leading-relaxed">
          <b>
            {terjawab.length} dari {jumlah}
          </b>{" "}
          soal sudah dijawab. Setelah dikumpulkan, jawaban tidak bisa diubah.
        </p>
        {belum.length > 0 && belum.length <= 20 && (
          <p className="mt-2 text-sm text-[#8a4a12] dark:text-warning">Belum dijawab: nomor {belum.join(", ")}.</p>
        )}
        {belum.length > 20 && (
          <p className="mt-2 text-sm text-[#8a4a12] dark:text-warning">Masih ada {belum.length} soal yang belum dijawab.</p>
        )}
        {galat && (
          <p className="mt-3 rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">{galat}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDialogKumpul(false)} disabled={mengumpulkan}>
            Kembali mengerjakan
          </Button>
          <Button onClick={() => void kumpulkanSekarang()} disabled={mengumpulkan}>
            {mengumpulkan ? "Mengumpulkan…" : "Ya, kumpulkan"}
          </Button>
        </div>
      </Dialog>

      {/* Peringatan keluar layar penuh */}
      {fsDukung && !layarPenuh && sisa !== 0 && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-background/95 p-6 text-center backdrop-blur">
          <ShieldAlert className="size-14 text-warning" />
          <p className="max-w-sm text-base font-bold leading-relaxed">
            Anda keluar dari layar penuh. Kembali ke layar penuh untuk melanjutkan. Pelanggaran: {pelanggaran}.
          </p>
          <Button size="lg" onClick={() => void kembaliLayarPenuh()}>
            <Maximize className="size-5" /> Kembali ke layar penuh
          </Button>
        </div>
      )}

      {/* Waktu habis */}
      {sisa === 0 && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-background/95 p-6 text-center backdrop-blur">
          <Clock className="size-14 text-primary" />
          <p className="max-w-sm text-base font-bold">Waktu habis. Jawabanmu sedang dikumpulkan…</p>
          {galat && !mengumpulkan && (
            <>
              <p className="text-sm font-medium text-[#b23b3b] dark:text-danger">{galat}</p>
              <Button size="lg" onClick={() => void kumpulkanSekarang()}>
                Coba kumpulkan lagi
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PanelNomor({
  jumlah,
  aktif,
  terjawab,
  onPilih,
}: {
  jumlah: number;
  aktif: number;
  terjawab: number[];
  onPilih: (n: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: jumlah }, (_, i) => i + 1).map((n) => {
        const sudah = terjawab.includes(n);
        return (
          <button
            key={n}
            type="button"
            onClick={() => onPilih(n)}
            aria-label={`Soal ${n}${sudah ? ", sudah dijawab" : ", belum dijawab"}`}
            aria-current={n === aktif ? "true" : undefined}
            className={cn(
              "flex h-10 cursor-pointer items-center justify-center rounded-xl border text-sm font-bold transition-colors",
              n === aktif
                ? "border-transparent bg-solid text-solid-foreground"
                : sudah
                  ? "border-primary bg-primary-soft text-primary-deep"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
