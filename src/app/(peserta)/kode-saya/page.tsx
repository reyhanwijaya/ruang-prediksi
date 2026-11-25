import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { KodeSaya as Baris, StatusPemakaian } from "@/lib/types";
import { formatTanggal } from "@/lib/utils";

export const metadata: Metadata = { title: "Kode saya" };

const STATUS: Record<StatusPemakaian, { label: string; tone: "biru" | "hijau" | "merah" | "oranye" }> = {
  berjalan: { label: "Sedang berjalan", tone: "biru" },
  selesai: { label: "Selesai", tone: "hijau" },
  dikunci: { label: "Dikunci", tone: "merah" },
  waktu_habis: { label: "Waktu habis", tone: "oranye" },
};

export default async function KodeSaya() {
  await requireProfile();
  const db = await createClient();
  const { data } = await db.rpc("kode_saya");
  const daftar = (data ?? []) as Baris[];

  return (
    <div>
      <PageHeader judul="Kode saya" deskripsi="Daftar kode yang pernah kamu pakai." />
      {daftar.length === 0 ? (
        <EmptyState ikon={<KeyRound className="size-10" />} judul="Belum ada kode yang dipakai.">
          Setelah kamu memasukkan kode ujian di Beranda, kodenya akan tercatat di sini.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {daftar.map((k) => {
            const st = STATUS[k.status];
            return (
              <li key={k.pemakaian_id}>
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-base font-extrabold tracking-[0.2em] text-primary-deep">{k.kode}</p>
                    <p className="truncate text-sm">{k.judul}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatTanggal(k.mulai_pada ?? k.dibuat_pada)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {k.status === "berjalan" && (
                      <Link href={`/ujian/${k.pemakaian_id}`} className="text-sm font-bold text-primary-deep underline">
                        Lanjutkan
                      </Link>
                    )}
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
