import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EsaiAntrean, type ItemEsai } from "./esai-antrean";

export const metadata: Metadata = { title: "Nilai esai" };

const STATUS_SAH = ["menunggu", "dinilai", "semua"] as const;
type StatusAntrean = (typeof STATUS_SAH)[number];

export default async function HalamanEsai({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; ujian?: string }>;
}) {
  await requireAdmin();
  const q = await searchParams;
  const status: StatusAntrean = (STATUS_SAH as readonly string[]).includes(q.status ?? "")
    ? (q.status as StatusAntrean)
    : "menunggu";
  const ujianId = /^[0-9a-f-]{36}$/i.test(q.ujian ?? "") ? (q.ujian as string) : null;

  const db = await createClient();
  const [{ data: antrean }, { data: ujian }] = await Promise.all([
    db.rpc("antrean_esai", { p_ujian: ujianId, p_status: status }),
    db.from("ujian").select("id,judul").order("judul"),
  ]);

  return (
    <div>
      <PageHeader judul="Nilai esai" deskripsi="Jawaban esai dari sesi yang sudah selesai. Skor peserta dihitung ulang setelah nilai disimpan." />
      <EsaiAntrean
        item={(antrean ?? []) as ItemEsai[]}
        ujian={(ujian ?? []) as { id: string; judul: string }[]}
        status={status}
        ujianId={ujianId ?? ""}
      />
    </div>
  );
}
