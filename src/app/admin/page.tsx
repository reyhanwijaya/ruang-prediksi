import Link from "next/link";
import { BarChart3, ClipboardList, KeyRound, PenLine, TrendingUp, Users } from "lucide-react";
import { GrafikBatang, GrafikTren, type TitikTren } from "@/components/grafik";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatTanggal } from "@/lib/utils";

interface Ringkasan {
  ujian_aktif: number;
  kode_aktif: number;
  pemakaian_hari_ini: number;
  rata_skor: number | null;
  esai_menunggu: number;
  per_ujian: { ujian_id: string; judul: string; rata: number; jumlah: number }[];
  tren: TitikTren[];
}

interface EsaiRingkas {
  jawaban_id: string;
  peserta_nama: string | null;
  peserta_email: string | null;
  ujian_judul: string;
  nomor: number;
  selesai_pada: string | null;
}

export default async function RingkasanAdmin() {
  const db = await createClient();
  const [{ data: r }, { data: esai }] = await Promise.all([
    db.rpc("dashboard_ringkasan", { p_hari: 14 }),
    db.rpc("antrean_esai", { p_ujian: null, p_status: "menunggu" }),
  ]);
  const d = (r ?? {
    ujian_aktif: 0,
    kode_aktif: 0,
    pemakaian_hari_ini: 0,
    rata_skor: null,
    esai_menunggu: 0,
    per_ujian: [],
    tren: [],
  }) as Ringkasan;
  const antrean = ((esai ?? []) as EsaiRingkas[]).slice(0, 5);

  const kartu = [
    { label: "Ujian aktif", nilai: String(d.ujian_aktif), ikon: ClipboardList },
    { label: "Kode aktif", nilai: String(d.kode_aktif), ikon: KeyRound },
    { label: "Pemakaian hari ini", nilai: String(d.pemakaian_hari_ini), ikon: Users },
    { label: "Rata-rata skor", nilai: d.rata_skor === null ? "–" : String(Number(d.rata_skor)), ikon: BarChart3 },
  ];
  const totalTren = d.tren.reduce((a, t) => a + t.jumlah, 0);

  return (
    <div className="space-y-6">
      <PageHeader judul="Dashboard" deskripsi="Ringkasan pemakaian dan antrean penilaian." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kartu.map(({ label, nilai, ikon: Ikon }) => (
          <Card key={label}>
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary-deep">
              <Ikon className="size-5" />
            </span>
            <p className="mt-3 text-3xl font-extrabold tabular-nums text-primary-deep">{nilai}</p>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <BarChart3 className="size-4 text-primary-deep" /> Rata-rata skor per ujian
            </h2>
            <p className="text-xs text-muted-foreground">Dihitung dari sesi yang sudah punya skor akhir (maks. 12 ujian).</p>
          </div>
          {d.per_ujian.length === 0 ? (
            <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
              Belum ada sesi yang selesai dinilai.
            </p>
          ) : (
            <GrafikBatang
              data={d.per_ujian.map((u) => ({
                label: u.judul,
                nilai: Number(u.rata),
                catatan: `${u.jumlah} sesi`,
              }))}
            />
          )}
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <TrendingUp className="size-4 text-primary-deep" /> Pemakaian 14 hari terakhir
            </h2>
            <p className="text-xs text-muted-foreground">
              Jumlah sesi yang dimulai per hari (WIB). Total {totalTren} sesi.
            </p>
          </div>
          {d.tren.length > 0 ? (
            <GrafikTren data={d.tren} />
          ) : (
            <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">Belum ada data.</p>
          )}
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <PenLine className="size-4 text-primary-deep" /> Esai menunggu nilai
            <Badge tone={d.esai_menunggu > 0 ? "kuning" : "hijau"}>{d.esai_menunggu}</Badge>
          </h2>
          <Link href="/admin/esai" className="text-sm font-bold text-primary-deep underline">
            Buka antrean
          </Link>
        </div>
        {antrean.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada esai yang menunggu. Semua sudah dinilai.</p>
        ) : (
          <ul className="divide-y divide-border">
            {antrean.map((e) => (
              <li key={e.jawaban_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="min-w-0">
                  <b className="block truncate">{e.peserta_nama || e.peserta_email}</b>
                  <span className="block truncate text-xs text-muted-foreground">
                    {e.ujian_judul} · soal {e.nomor}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {e.selesai_pada ? formatTanggal(e.selesai_pada) : ""}
                </span>
              </li>
            ))}
            {d.esai_menunggu > antrean.length && (
              <li className="pt-2.5 text-xs text-muted-foreground">+ {d.esai_menunggu - antrean.length} lainnya di antrean.</li>
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}
