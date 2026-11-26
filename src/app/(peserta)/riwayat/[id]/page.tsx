import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleDashed, Hourglass, MinusCircle, XCircle } from "lucide-react";
import { GambarSoal, TeksSoal } from "@/components/teks-soal";
import { Badge, Card } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DetailRiwayat, SoalRiwayat, StatusSoalRiwayat } from "@/lib/types";
import { JENIS_LABEL, cn, formatTanggal } from "@/lib/utils";

export const metadata: Metadata = { title: "Detail riwayat" };

const JENIS_PEL: Record<string, string> = {
  keluar_fullscreen: "Keluar dari layar penuh",
  pindah_tab: "Pindah tab",
  kehilangan_fokus: "Kehilangan fokus jendela",
};

const STATUS: Record<
  StatusSoalRiwayat,
  { label: string; tone: "hijau" | "merah" | "oranye" | "netral" | "kuning"; ikon: typeof CheckCircle2 }
> = {
  benar: { label: "Benar", tone: "hijau", ikon: CheckCircle2 },
  salah: { label: "Salah", tone: "merah", ikon: XCircle },
  sebagian: { label: "Sebagian benar", tone: "oranye", ikon: MinusCircle },
  kosong: { label: "Tidak dijawab", tone: "netral", ikon: CircleDashed },
  menunggu: { label: "Menunggu nilai", tone: "kuning", ikon: Hourglass },
};

export default async function DetailRiwayatHalaman({ params }: { params: Promise<{ id: string }> }) {
  await requireProfile();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = await createClient();
  const { data } = await db.rpc("riwayat_detail", { p_id: id });
  if (!data?.ok) {
    if (data?.kode === "berjalan") redirect(`/ujian/${id}`);
    notFound();
  }
  const d = data as DetailRiwayat & { ok: true };
  const h = d.hasil;

  const judulStatus =
    h.status === "dikunci"
      ? "Dikunci"
      : h.status === "waktu_habis"
        ? "Waktu habis"
        : h.menunggu_esai
          ? "Menunggu nilai esai"
          : "Selesai";
  const nada = h.menunggu_esai ? "kuning" : h.status === "selesai" ? "hijau" : h.status === "dikunci" ? "merah" : "oranye";

  return (
    <div className="space-y-5">
      <Link
        href="/riwayat"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Riwayat
      </Link>

      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-primary-deep sm:text-2xl">{d.ujian.judul}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {d.mulai_pada ? formatTanggal(d.mulai_pada) : "-"}
          <Badge tone={nada}>{judulStatus}</Badge>
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-center">
        <Ringkas label="Skor" nilai={h.skor === null ? "–" : String(Math.round(h.skor))} />
        <Ringkas label="Benar" nilai={`${h.jumlah_benar}/${h.jumlah_soal}`} />
        <Ringkas label="Pelanggaran" nilai={String(h.pelanggaran)} />
      </dl>

      {h.menunggu_esai && (
        <p className="rounded-xl bg-accent/40 px-3.5 py-2.5 text-sm font-medium text-[#4a3a00] dark:text-accent">
          Ada esai yang belum dinilai. Skor akhir muncul setelah admin selesai menilai.
        </p>
      )}

      <section aria-label="Jawaban dan pembahasan" className="space-y-4">
        {d.soal.map((s) => (
          <KartuSoal key={s.nomor} s={s} />
        ))}
      </section>

      {d.pelanggaran.length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-bold">Catatan pelanggaran</h2>
          <ul className="divide-y divide-border text-sm">
            {d.pelanggaran.map((p, i) => (
              <li key={i} className="flex justify-between gap-3 py-2">
                <span>{JENIS_PEL[p.jenis] ?? p.jenis}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatTanggal(p.waktu)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Ringkas({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-xl bg-primary-soft p-3">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-extrabold text-primary-deep">{nilai}</dd>
    </div>
  );
}

function KartuSoal({ s }: { s: SoalRiwayat }) {
  const st = STATUS[s.status];
  const Ikon = st.ikon;
  const jawab = (s.jawaban ?? "").trim();

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-extrabold text-primary-deep">Soal {s.nomor}</span>
        <Badge tone="biru">{JENIS_LABEL[s.jenis]}</Badge>
        <Badge tone={st.tone} className="ml-auto">
          <Ikon className="size-3.5" /> {st.label}
        </Badge>
      </div>

      <div className="space-y-3">
        <TeksSoal teks={s.teks} className="text-[15px] leading-relaxed" />
        {s.gambar_url && <GambarSoal src={s.gambar_url} />}
      </div>

      {s.jenis === "pilihan_ganda" && (
        <ul className="space-y-2">
          {s.opsi.map((o) => {
            const kunci = o.kode === s.kunci;
            const pilih = o.kode === jawab.toUpperCase();
            return (
              <li
                key={o.kode}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-3.5 py-3",
                  kunci ? "border-success bg-success/15" : pilih ? "border-danger bg-danger/10" : "border-border",
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-deep">
                  {o.kode}
                </span>
                <span className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed">
                  <TeksSoal teks={o.teks} inline />
                  {o.gambar && <GambarSoal src={o.gambar} className="max-h-48" />}
                </span>
                <span className="shrink-0 text-xs font-semibold">
                  {kunci && pilih ? "Jawabanmu · kunci" : kunci ? "Kunci" : pilih ? "Jawabanmu" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {s.jenis === "isian" && (
        <div className="space-y-2 text-sm">
          <p>
            <b>Jawabanmu:</b> {jawab ? jawab : <i className="text-muted-foreground">tidak dijawab</i>}
          </p>
          <p>
            <b>Jawaban benar:</b> {(s.jawaban_benar ?? []).join(" · ")}
          </p>
        </div>
      )}

      {s.jenis === "esai" && (
        <div className="space-y-2 text-sm">
          <p className="font-bold">Jawabanmu</p>
          <p className="whitespace-pre-wrap break-words rounded-xl border border-border p-3.5 leading-relaxed">
            {jawab || <i className="text-muted-foreground">tidak dijawab</i>}
          </p>
          {s.nilai !== null && (
            <p>
              <b>Nilai:</b> {Number(s.nilai)} dari {Number(s.bobot)}
            </p>
          )}
          {s.komentar && (
            <p className="whitespace-pre-wrap rounded-xl bg-primary-soft p-3.5 leading-relaxed">
              <b>Komentar penilai:</b> {s.komentar}
            </p>
          )}
        </div>
      )}

      {s.pembahasan && (
        <div className="rounded-xl bg-muted/70 p-3.5 text-sm leading-relaxed">
          <p className="mb-1 font-bold text-primary-deep">Pembahasan</p>
          <TeksSoal teks={s.pembahasan} />
        </div>
      )}
    </Card>
  );
}
