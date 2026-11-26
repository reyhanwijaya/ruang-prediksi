import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { TombolReset } from "@/components/reset-pemakaian";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ambilPemakaian, bacaFilter, queryString, satu } from "@/lib/pemakaian-query";
import { cn, formatTanggal } from "@/lib/utils";

export const metadata: Metadata = { title: "Pemakaian kode" };

const PER_HALAMAN = 25;
const STATUS: Record<string, { label: string; tone: "biru" | "hijau" | "merah" | "oranye" }> = {
  berjalan: { label: "Berjalan", tone: "biru" },
  selesai: { label: "Selesai", tone: "hijau" },
  dikunci: { label: "Dikunci", tone: "merah" },
  waktu_habis: { label: "Waktu habis", tone: "oranye" },
};

export default async function HalamanPemakaian({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const f = bacaFilter(sp);
  const hal = Math.max(1, Math.min(10000, Number.parseInt(sp.hal ?? "1", 10) || 1));

  const db = await createClient();
  await db.rpc("tutup_kadaluarsa_semua");
  const [{ rows, total }, { data: ujian }] = await Promise.all([
    ambilPemakaian(db, f, (hal - 1) * PER_HALAMAN, hal * PER_HALAMAN - 1),
    db.from("ujian").select("id,judul").order("judul"),
  ]);
  const jumlahHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const adaFilter = Boolean(f.ujian || f.status || f.kode || f.orang);
  const tautan = (h: number) => `/admin/pemakaian?${queryString(f, { hal: String(h) })}`;

  return (
    <div className="space-y-4">
      <PageHeader judul="Pemakaian kode" deskripsi="Siapa memakai kode apa, kapan, dan hasilnya." />

      <Card>
        <form method="get" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <Select name="ujian" defaultValue={f.ujian} aria-label="Ujian">
            <option value="">Semua ujian</option>
            {(ujian ?? []).map((u) => (
              <option key={u.id as string} value={u.id as string}>
                {u.judul as string}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={f.status} aria-label="Status">
            <option value="">Semua status</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
          <Input name="kode" defaultValue={f.kode} placeholder="Kode" maxLength={12} aria-label="Kode" className="uppercase" />
          <Input name="orang" defaultValue={f.orang} placeholder="Nama atau email" maxLength={60} aria-label="Nama atau email" />
          <button type="submit" className={cn(buttonVariants({}), "w-full lg:w-auto")}>
            <Search className="size-4" /> Cari
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            {total} pemakaian{adaFilter && " cocok dengan filter"}.{" "}
            {adaFilter && (
              <Link href="/admin/pemakaian" className="font-bold text-primary-deep underline">
                Hapus filter
              </Link>
            )}
          </p>
          <a
            href={`/admin/pemakaian/csv?${queryString(f)}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            download
          >
            <Download className="size-4" /> Ekspor CSV
          </a>
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState judul={adaFilter ? "Tidak ada pemakaian yang cocok." : "Belum ada pemakaian kode."}>
          {adaFilter ? "Coba ubah atau hapus filter." : "Pemakaian muncul setelah peserta memasukkan kode."}
        </EmptyState>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-bold">Peserta</th>
                  <th className="px-3 py-3 font-bold">Ujian</th>
                  <th className="px-3 py-3 font-bold">Kode</th>
                  <th className="px-3 py-3 font-bold">Mulai</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-3 py-3 text-right font-bold">Skor</th>
                  <th className="px-3 py-3 text-right font-bold">Pel.</th>
                  <th className="px-4 py-3 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const pr = satu(r.profiles);
                  const nama = pr?.nama || pr?.email || "Peserta";
                  const st = STATUS[r.status];
                  return (
                    <tr key={r.id} className="align-middle">
                      <td className="max-w-[14rem] px-4 py-3">
                        <b className="block truncate">{nama}</b>
                        <span className="block truncate text-xs text-muted-foreground">{pr?.email}</span>
                      </td>
                      <td className="max-w-[12rem] truncate px-3 py-3">{satu(r.ujian)?.judul}</td>
                      <td className="px-3 py-3 font-mono text-xs font-bold tracking-widest">{satu(r.kode_ujian)?.kode}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                        {r.mulai_pada ? formatTanggal(r.mulai_pada) : "belum mulai"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums">
                        {r.status === "berjalan" ? "" : r.skor === null ? "–" : Math.round(Number(r.skor))}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {r.pelanggaran > 0 ? (
                          <Link
                            href={`/admin/log?tab=pelanggaran&sesi=${r.id}`}
                            className="font-bold text-[#b23b3b] underline dark:text-danger"
                          >
                            {r.pelanggaran}
                          </Link>
                        ) : (
                          0
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {r.status !== "berjalan" && (
                            <Link href={`/riwayat/${r.id}`} className="px-2 text-xs font-bold text-primary-deep underline">
                              Detail
                            </Link>
                          )}
                          <TombolReset pemakaianId={r.id} nama={nama} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
