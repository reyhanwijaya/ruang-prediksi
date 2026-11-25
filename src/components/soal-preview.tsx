import { GambarSoal, TeksSoal } from "@/components/teks-soal";
import { Badge } from "@/components/ui/card";
import { HURUF_OPSI, JENIS_LABEL } from "@/lib/utils";
import type { JenisSoal } from "@/lib/types";

/** Pratinjau soal seperti yang dilihat peserta. Kunci & pembahasan hanya tampil di bagian lipat khusus admin. */
export function SoalPreview({
  nomor,
  jenis,
  teks,
  gambar,
  opsi,
  opsiGambar,
  kunci,
  jawaban,
  rubrik,
  pembahasan,
  bobot,
}: {
  nomor?: number;
  jenis: JenisSoal;
  teks: string;
  gambar?: string;
  opsi: string[];
  opsiGambar?: string[];
  kunci: number;
  jawaban: string[];
  rubrik: string;
  pembahasan: string;
  bobot: string | number;
}) {
  const adaTeks = teks.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-primary-deep">{nomor ? `Soal ${nomor}` : "Soal"}</p>
        <div className="flex items-center gap-2">
          <Badge tone="biru">{JENIS_LABEL[jenis]}</Badge>
          <Badge tone="netral">Bobot {String(bobot || 1)}</Badge>
        </div>
      </div>

      {adaTeks ? (
        <TeksSoal teks={teks} className="text-[15px] leading-relaxed" />
      ) : (
        <p className="text-sm italic text-muted-foreground">Teks soal akan tampil di sini.</p>
      )}
      {gambar && <GambarSoal src={gambar} />}

      {jenis === "pilihan_ganda" && (
        <ul className="space-y-2">
          {opsi.map((o, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-border px-3.5 py-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-deep">
                {HURUF_OPSI[i]}
              </span>
              <span className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed">
                {o.trim() ? <TeksSoal teks={o} inline /> : <i className="text-muted-foreground">Opsi kosong</i>}
                {opsiGambar?.[i] && <GambarSoal src={opsiGambar[i]} className="max-h-48" />}
              </span>
            </li>
          ))}
        </ul>
      )}

      {jenis === "isian" && (
        <div className="rounded-xl border border-border bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground">
          Peserta mengetik jawabannya di sini…
        </div>
      )}

      {jenis === "esai" && (
        <div className="h-28 rounded-xl border border-border bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground">
          Peserta menulis jawaban esai di sini…
        </div>
      )}

      <details className="rounded-xl bg-muted/60 px-3.5 py-2.5 text-sm">
        <summary className="cursor-pointer font-semibold text-primary-deep">Kunci &amp; pembahasan (hanya admin)</summary>
        <div className="mt-2 space-y-2 leading-relaxed">
          {jenis === "pilihan_ganda" && (
            <p>
              <b>Kunci:</b> {kunci >= 0 && kunci < opsi.length ? HURUF_OPSI[kunci] : <i className="text-muted-foreground">belum dipilih</i>}
            </p>
          )}
          {jenis === "isian" && (
            <p>
              <b>Jawaban benar:</b>{" "}
              {jawaban.length ? jawaban.join(" · ") : <i className="text-muted-foreground">belum diisi</i>}
            </p>
          )}
          {jenis === "esai" && rubrik.trim() && (
            <p className="whitespace-pre-wrap">
              <b>Rubrik:</b> {rubrik}
            </p>
          )}
          <p className="whitespace-pre-wrap">
            <b>Pembahasan:</b> {pembahasan.trim() || <i className="text-muted-foreground">belum diisi</i>}
          </p>
        </div>
      </details>
    </div>
  );
}
