import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { satu } from "@/lib/pemakaian-query";
import { cn, formatTanggal } from "@/lib/utils";

export const metadata: Metadata = { title: "Log" };

const PER_HALAMAN = 30;

const JENIS_PEL: Record<string, string> = {
  keluar_fullscreen: "Keluar dari layar penuh",
  pindah_tab: "Pindah tab",
  kehilangan_fokus: "Kehilangan fokus jendela",
};

interface Orang {
  nama: string | null;
  email: string | null;
}
interface BarisAdmin {
  id: string;
  aksi: string;
  sasaran_id: string | null;
  nilai: Record<string, unknown> | null;
  alasan: string | null;
  dibuat_pada: string;
  profiles: Orang | Orang[] | null;
}
interface BarisPel {
  id: string;
  jenis: string;
  dicatat_pada: string;
  pemakaian_id: string;
  pemakaian_kode:
    | { id: string; profiles: Orang | Orang[] | null; ujian: { judul: string } | { judul: string }[] | null }
    | { id: string; profiles: Orang | Orang[] | null; ujian: { judul: string } | { judul: string }[] | null }[]
    | null;
}

function uraikan(b: BarisAdmin): { teks: string; tautan?: string } {
  const n = b.nilai ?? {};
  switch (b.aksi) {
    case "ubah_kuota":
      return { teks: `Mengubah kuota kode menjadi ${String(n.kuota ?? "?")}` };
    case "cabut_kode":
      return { teks: "Mencabut kode" };
    case "aktifkan_kode":
      return { teks: "Mengaktifkan kembali kode" };
    case "reset_pemakaian": {
      const skor = n.skor === null || n.skor === undefined ? "–" : String(Math.round(Number(n.skor)));
      return { teks: `Mereset pemakaian (status ${String(n.status ?? "?")}, skor ${skor})` };
    }
    case "nilai_esai":
      return {
        teks: `Menilai esai: ${String(n.nilai ?? "?")} dari ${String(n.bobot ?? "?")}`,
        tautan: typeof n.pemakaian_id === "string" ? `/riwayat/${n.pemakaian_id}` : undefined,
      };
    default:
      return { teks: b.aksi.replace(/_/g, " ") };
  }
}

export default async function HalamanLog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tab === "pelanggaran" ? "pelanggaran" : "admin";
  const sesi = /^[0-9a-f-]{36}$/i.test(sp.sesi ?? "") ? (sp.sesi as string) : "";
  const hal = Math.max(1, Math.min(10000, Number.parseInt(sp.hal ?? "1", 10) || 1));
  const dari = (hal - 1) * PER_HALAMAN;
  const sampai = hal * PER_HALAMAN - 1;

  const db = await createClient();
  let barisAdmin: BarisAdmin[] = [];
  let barisPel: BarisPel[] = [];
  let total = 0;

  if (tab === "admin") {
    const { data, count } = await db
      .from("log_admin")
      .select("id,aksi,sasaran_id,nilai,alasan,dibuat_pada,profiles(nama,email)", { count: "exact" })
      .order("dibuat_pada", { ascending: false })
      .range(dari, sampai);
    barisAdmin = (data ?? []) as unknown as BarisAdmin[];
    total = count ?? 0;
  } else {
    let q = db
      .from("log_pelanggaran")
      .select("id,jenis,dicatat_pada,pemakaian_id,pemakaian_kode(id,profiles(nama,email),ujian(judul))", { count: "exact" })
      .order("dicatat_pada", { ascending: false })
      .range(dari, sampai);
    if (sesi) q = q.eq("pemakaian_id", sesi);
    const { data, count } = await q;
    barisPel = (data ?? []) as unknown as BarisPel[];
    total = count ?? 0;
  }

  const jumlahHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const tautan = (h: number, t = tab) => {
    const p = new URLSearchParams();
    if (t !== "admin") p.set("tab", t);
    if (t === "pelanggaran" && sesi) p.set("sesi", sesi);
    if (h > 1) p.set("hal", String(h));
    const s = p.toString();
    return s ? `/admin/log?${s}` : "/admin/log";
  };

  return (
    <div className="space-y-4">
      <PageHeader judul="Log" deskripsi="Jejak tindakan admin dan pelanggaran peserta." />

      <div role="tablist" aria-label="Jenis log" className="grid max-w-sm grid-cols-2 gap-1.5 rounded-xl bg-muted p-1">
        {(
          [
            ["admin", "Log admin"],
            ["pelanggaran", "Pelanggaran"],
          ] as const
        ).map(([k, label]) => (
          <Link
            key={k}
            role="tab"
            aria-selected={tab === k}
            href={k === "admin" ? "/admin/log" : "/admin/log?tab=pelanggaran"}
            className={cn(
              "flex h-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
              tab === k ? "bg-card text-primary-deep shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {tab === "pelanggaran" && sesi && (
        <p className="flex flex-wrap items-center gap-3 rounded-xl bg-primary-soft px-4 py-2.5 text-sm">
          Menampilkan pelanggaran satu sesi saja.
          <Link href={`/riwayat/${sesi}`} className="font-bold text-primary-deep underline">
            Lihat detail sesi
          </Link>
          <Link href="/admin/log?tab=pelanggaran" className="font-bold text-primary-deep underline">
            Tampilkan semua
          </Link>
        </p>
      )}

      {total === 0 ? (
        <EmptyState judul={tab === "admin" ? "Belum ada tindakan admin yang tercatat." : "Belum ada pelanggaran tercatat."}>
          {tab === "admin"
            ? "Mengubah kuota, mencabut kode, mereset pemakaian, dan menilai esai akan muncul di sini."
            : "Pelanggaran layar penuh, pindah tab, dan kehilangan fokus muncul di sini."}
        </EmptyState>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {tab === "admin" &&
              barisAdmin.map((b) => {
                const u = uraikan(b);
                const pelaku = satu(b.profiles);
                return (
                  <li key={b.id} className="space-y-1 px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{pelaku?.nama || pelaku?.email || "Admin (dihapus)"}</span>
                      <span className="text-xs text-muted-foreground">{formatTanggal(b.dibuat_pada)}</span>
                    </div>
                    <p>
                      {u.teks}
                      {u.tautan && (
                        <>
                          {" "}
                          <Link href={u.tautan} className="font-bold text-primary-deep underline">
                            Lihat
                          </Link>
                        </>
                      )}
                    </p>
                    {b.alasan && <p className="text-xs text-muted-foreground">Alasan: {b.alasan}</p>}
                  </li>
                );
              })}
            {tab === "pelanggaran" &&
              barisPel.map((b) => {
                const p = satu(b.pemakaian_kode);
                const orang = satu(p?.profiles ?? null);
                return (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{orang?.nama || orang?.email || "Peserta"}</p>
                      <p className="truncate text-xs text-muted-foreground">{satu(p?.ujian ?? null)?.judul}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone="merah">{JENIS_PEL[b.jenis] ?? b.jenis}</Badge>
                      <span className="text-xs text-muted-foreground">{formatTanggal(b.dicatat_pada)}</span>
                      {!sesi && (
                        <Link
                          href={`/admin/log?tab=pelanggaran&sesi=${b.pemakaian_id}`}
                          className="text-xs font-bold text-primary-deep underline"
                        >
                          Per sesi
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        </Card>
      )}

      {jumlahHalaman > 1 && (
        <nav aria-label="Halaman" className="flex items-center justify-between gap-3">
          {hal > 1 ? (
            <Link href={tautan(hal - 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              <ChevronLeft className="size-4" /> Sebelumnya
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">
            Halaman {hal} dari {jumlahHalaman}
          </span>
          {hal < jumlahHalaman ? (
            <Link href={tautan(hal + 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Berikutnya <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
