"use client";

import { useMemo, useState, useTransition } from "react";
import { Ban, Check, Copy, Plus, RotateCcw, Undo2 } from "lucide-react";
import { HapusTombol } from "@/components/hapus-tombol";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { formatTanggal } from "@/lib/utils";
import type { StatusPemakaian } from "@/lib/types";
import { buatKode, cabutKode, resetPemakaian, ubahKuota } from "./actions";

export interface OpsiUjianAdmin {
  id: string;
  judul: string;
}
interface Pemakai {
  id: string;
  status: StatusPemakaian;
  skor: number | null;
  pelanggaran: number;
  mulai_pada: string | null;
  profiles: { nama: string | null; email: string | null } | { nama: string | null; email: string | null }[] | null;
}
export interface BarisKode {
  id: string;
  kode: string;
  kuota: number;
  status: "aktif" | "dicabut";
  dibuat_pada: string;
  ujian_id: string;
  ujian: { judul: string } | { judul: string }[] | null;
  pemakaian_kode: Pemakai[];
}

const satu = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

const STATUS_PEMAKAI: Record<StatusPemakaian, { label: string; tone: "biru" | "hijau" | "merah" | "oranye" }> = {
  berjalan: { label: "Berjalan", tone: "biru" },
  selesai: { label: "Selesai", tone: "hijau" },
  dikunci: { label: "Dikunci", tone: "merah" },
  waktu_habis: { label: "Waktu habis", tone: "oranye" },
};

async function salin(teks: string) {
  try {
    await navigator.clipboard.writeText(teks);
    return true;
  } catch {
    return false;
  }
}

export function KodeManager({ kode, ujian }: { kode: BarisKode[]; ujian: OpsiUjianAdmin[] }) {
  const [fUjian, setFUjian] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [cari, setCari] = useState("");
  const [dialogBuat, setDialogBuat] = useState(false);
  const [baru, setBaru] = useState<string[] | null>(null);
  const [reset, setReset] = useState<{ id: string; nama: string } | null>(null);
  const [disalin, setDisalin] = useState<string | null>(null);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return kode.filter((k) => {
      if (fUjian && k.ujian_id !== fUjian) return false;
      if (fStatus === "dicabut" && k.status !== "dicabut") return false;
      if (fStatus === "aktif" && (k.status !== "aktif" || k.pemakaian_kode.length >= k.kuota)) return false;
      if (fStatus === "penuh" && !(k.status === "aktif" && k.pemakaian_kode.length >= k.kuota)) return false;
      if (q) {
        const cocok =
          k.kode.toLowerCase().includes(q) ||
          k.pemakaian_kode.some((p) => {
            const pr = satu(p.profiles);
            return (pr?.nama ?? "").toLowerCase().includes(q) || (pr?.email ?? "").toLowerCase().includes(q);
          });
        if (!cocok) return false;
      }
      return true;
    });
  }, [kode, fUjian, fStatus, cari]);

  async function salinSatu(teks: string, tanda: string) {
    if (await salin(teks)) {
      setDisalin(tanda);
      setTimeout(() => setDisalin((s) => (s === tanda ? null : s)), 1500);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid flex-1 gap-2 sm:grid-cols-3">
          <Select value={fUjian} onChange={(e) => setFUjian(e.target.value)} aria-label="Filter ujian">
            <option value="">Semua ujian</option>
            {ujian.map((u) => (
              <option key={u.id} value={u.id}>
                {u.judul}
              </option>
            ))}
          </Select>
          <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filter status">
            <option value="">Semua status</option>
            <option value="aktif">Aktif (masih ada kuota)</option>
            <option value="penuh">Kuota penuh</option>
            <option value="dicabut">Dicabut</option>
          </Select>
          <Input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari kode / nama / email"
            aria-label="Cari"
          />
        </div>
        <Button onClick={() => setDialogBuat(true)} disabled={ujian.length === 0}>
          <Plus className="size-4" /> Buat kode
        </Button>
      </Card>

      {tampil.length === 0 ? (
        <EmptyState judul={kode.length === 0 ? "Belum ada kode." : "Tidak ada kode yang cocok."}>
          {ujian.length === 0 ? "Buat ujian terlebih dahulu di menu Ujian & soal." : "Tekan “Buat kode” untuk membuat kode baru."}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {tampil.map((k) => (
            <li key={k.id}>
              <BarisKodeKartu
                k={k}
                disalin={disalin === k.id}
                onSalin={() => void salinSatu(k.kode, k.id)}
                onReset={(id, nama) => setReset({ id, nama })}
              />
            </li>
          ))}
        </ul>
      )}

      <DialogBuat
        open={dialogBuat}
        ujian={ujian}
        onClose={() => setDialogBuat(false)}
        onSelesai={(daftar) => {
          setDialogBuat(false);
          setBaru(daftar);
        }}
      />

      <Dialog
        open={baru !== null}
        onClose={() => setBaru(null)}
        judul="Kode berhasil dibuat"
        deskripsi="Salin dan bagikan. Kode juga selalu bisa dilihat di daftar ini."
      >
        <pre className="max-h-64 overflow-auto rounded-xl bg-muted p-3 font-mono text-base font-bold tracking-widest">
          {(baru ?? []).join("\n")}
        </pre>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => void salinSatu((baru ?? []).join("\n"), "semua")}>
            {disalin === "semua" ? <Check className="size-4" /> : <Copy className="size-4" />}
            {disalin === "semua" ? "Tersalin" : "Salin semua"}
          </Button>
          <Button onClick={() => setBaru(null)}>Selesai</Button>
        </div>
      </Dialog>

      <DialogReset target={reset} onClose={() => setReset(null)} />
    </div>
  );
}

function BarisKodeKartu({
  k,
  disalin,
  onSalin,
  onReset,
}: {
  k: BarisKode;
  disalin: boolean;
  onSalin: () => void;
  onReset: (id: string, nama: string) => void;
}) {
  const [ubah, setUbah] = useState(false);
  const [nilai, setNilai] = useState(String(k.kuota));
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, mulai] = useTransition();
  const terpakai = k.pemakaian_kode.length;
  const dicabut = k.status === "dicabut";

  function simpanKuota() {
    setGalat(null);
    mulai(async () => {
      const r = await ubahKuota(k.id, Number(nilai));
      if (!r.ok) setGalat(r.error);
      else setUbah(false);
    });
  }

  return (
    <Card className={dicabut ? "opacity-75" : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="font-mono text-lg font-extrabold tracking-[0.2em] text-primary-deep">{k.kode}</span>
            <button
              type="button"
              onClick={onSalin}
              aria-label="Salin kode"
              title="Salin kode"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              {disalin ? <Check className="size-4 text-[#1f6b3f]" /> : <Copy className="size-4" />}
            </button>
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{satu(k.ujian)?.judul ?? "Ujian"}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            {dicabut ? <Badge tone="merah">Dicabut</Badge> : <Badge tone="hijau">Aktif</Badge>}
            <Badge tone={terpakai >= k.kuota ? "oranye" : "biru"}>
              Terpakai {terpakai}/{k.kuota}
            </Badge>
            <span className="text-xs text-muted-foreground">Dibuat {formatTanggal(k.dibuat_pada)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!ubah ? (
            <Button variant="outline" size="sm" onClick={() => setUbah(true)}>
              Ubah kuota
            </Button>
          ) : (
            <span className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={1000}
                value={nilai}
                onChange={(e) => setNilai(e.target.value)}
                className="h-9 w-20"
                aria-label="Kuota baru"
              />
              <Button size="sm" onClick={simpanKuota} disabled={proses}>
                Simpan
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setUbah(false); setGalat(null); }}>
                Batal
              </Button>
            </span>
          )}
          {dicabut ? (
            <Button
              variant="soft"
              size="sm"
              disabled={proses}
              onClick={() => mulai(async () => { await cabutKode(k.id, true); })}
            >
              <Undo2 className="size-4" /> Aktifkan lagi
            </Button>
          ) : (
            <HapusTombol
              judul="Cabut kode ini?"
              deskripsi="Kode tidak bisa dipakai lagi untuk memulai ujian baru. Sesi yang sudah berjalan tidak terpengaruh."
              label="Cabut"
              konfirmasi="Ya, cabut"
              proses="Mencabut…"
              aksi={() => cabutKode(k.id)}
            />
          )}
        </div>
      </div>

      {galat && <p className="mt-2 text-sm font-medium text-[#b23b3b] dark:text-danger">{galat}</p>}

      {terpakai > 0 && (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {k.pemakaian_kode.map((p) => {
            const pr = satu(p.profiles);
            const nama = pr?.nama || pr?.email || "Peserta";
            const st = STATUS_PEMAKAI[p.status];
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{nama}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {pr?.email} · {p.mulai_pada ? formatTanggal(p.mulai_pada) : "belum mulai"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={st.tone}>{st.label}</Badge>
                  {p.status !== "berjalan" && (
                    <span className="text-xs text-muted-foreground">
                      skor {p.skor === null ? "–" : Math.round(p.skor)} · {p.pelanggaran} pelanggaran
                    </span>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onReset(p.id, nama)}>
                    <RotateCcw className="size-4" /> Reset
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {dicabut && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Ban className="size-3.5" /> Kode dicabut: peserta baru tidak bisa memakainya.
        </p>
      )}
    </Card>
  );
}

function DialogBuat({
  open,
  ujian,
  onClose,
  onSelesai,
}: {
  open: boolean;
  ujian: OpsiUjianAdmin[];
  onClose: () => void;
  onSelesai: (kode: string[]) => void;
}) {
  const [ujianId, setUjianId] = useState("");
  const [jumlah, setJumlah] = useState("1");
  const [kuota, setKuota] = useState("3");
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    if (!ujianId) return setGalat("Pilih ujian terlebih dahulu.");
    mulai(async () => {
      const r = await buatKode({ ujianId, jumlah: Number(jumlah), kuota: Number(kuota) });
      if (!r.ok) setGalat(r.error);
      else onSelesai(r.kode);
    });
  }

  return (
    <Dialog open={open} onClose={onClose} judul="Buat kode ujian" deskripsi="Kode 8 karakter dibuat acak dan unik.">
      <form onSubmit={kirim} className="space-y-4">
        <Field label="Ujian">
          <Select value={ujianId} onChange={(e) => setUjianId(e.target.value)}>
            <option value="">Pilih ujian…</option>
            {ujian.map((u) => (
              <option key={u.id} value={u.id}>
                {u.judul}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jumlah kode" hint="1–100">
            <Input type="number" min={1} max={100} value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
          </Field>
          <Field label="Kuota per kode" hint="Berapa orang boleh memakai">
            <Input type="number" min={1} max={1000} value={kuota} onChange={(e) => setKuota(e.target.value)} />
          </Field>
        </div>
        {galat && (
          <p className="rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">{galat}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={proses}>
            Batal
          </Button>
          <Button type="submit" disabled={proses}>
            {proses ? "Membuat…" : "Buat kode"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DialogReset({ target, onClose }: { target: { id: string; nama: string } | null; onClose: () => void }) {
  const [alasan, setAlasan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  function tutup() {
    setAlasan("");
    setGalat(null);
    onClose();
  }

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setGalat(null);
    mulai(async () => {
      const r = await resetPemakaian(target.id, alasan);
      if (!r.ok) setGalat(r.error);
      else tutup();
    });
  }

  return (
    <Dialog
      open={target !== null}
      onClose={tutup}
      judul="Reset pemakaian?"
      deskripsi={`Pemakaian ${target?.nama ?? ""} beserta jawaban dan skornya dihapus, sehingga kuota kembali dan ia bisa mengerjakan lagi. Tindakan ini dicatat.`}
    >
      <form onSubmit={kirim} className="space-y-4">
        <Field label="Alasan reset (wajib)">
          <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={3} maxLength={300} />
        </Field>
        {galat && (
          <p className="rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">{galat}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={tutup} disabled={proses}>
            Batal
          </Button>
          <Button type="submit" variant="danger" disabled={proses}>
            {proses ? "Mereset…" : "Ya, reset"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
