import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatTanggal } from "@/lib/utils";

export const metadata: Metadata = { title: "Riwayat" };

interface Baris {
  id: string;
  status: string;
  skor: number | null;
  jumlah_benar: number;
  pelanggaran: number;
  mulai_pada: string;
  ujian: { judul: string } | { judul: string }[] | null;
}

function statusInfo(b: Baris) {
  if (b.status === "dikunci") return { label: "Dikunci", tone: "merah" as const };
  if (b.status === "waktu_habis") return { label: "Waktu habis", tone: "oranye" as const };
  if (b.skor === null) return { label: "Menunggu nilai esai", tone: "kuning" as const };
  return { label: "Selesai", tone: "hijau" as const };
}

export default async function Riwayat() {
  const profil = await requireProfile();
  const db = await createClient();
  // Tutup dulu sesi milikku yang waktunya sudah habis supaya muncul di sini.
  await db.rpc("tutup_kadaluarsa_saya");

  const { data } = await db
    .from("pemakaian_kode")
    .select("id,status,skor,jumlah_benar,pelanggaran,mulai_pada,ujian(judul)")
    .eq("user_id", profil.id)
    .neq("status", "berjalan")
    .order("mulai_pada", { ascending: false });

  const daftar = (data ?? []) as Baris[];

  return (
    <div>
      <PageHeader judul="Riwayat" deskripsi="Ujian yang pernah kamu kerjakan, terbaru di atas." />

      {daftar.length === 0 ? (
        <EmptyState ikon={<ClipboardList className="size-10" />} judul="Belum ada ujian yang dikerjakan." />
      ) : (
        <ul className="space-y-3">
          {daftar.map((b) => {
            const info = statusInfo(b);
            const u = Array.isArray(b.ujian) ? b.ujian[0] : b.ujian;
            return (
              <li key={b.id}>
                <Card className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{u?.judul ?? "Ujian"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatTanggal(b.mulai_pada)}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={info.tone}>{info.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {b.jumlah_benar} benar · {b.pelanggaran} pelanggaran
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-extrabold text-primary-deep">
                      {b.skor === null ? "–" : Math.round(b.skor)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">skor</p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
