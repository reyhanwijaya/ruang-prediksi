import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KodeManager, type BarisKode, type OpsiUjianAdmin } from "./kode-manager";

export const metadata: Metadata = { title: "Kode ujian" };

export default async function HalamanKode() {
  await requireAdmin();
  const db = await createClient();

  // Tutup dulu sesi yang waktunya habis supaya status di tabel akurat.
  await db.rpc("tutup_kadaluarsa_semua");

  const [{ data: kode }, { data: ujian }] = await Promise.all([
    db
      .from("kode_ujian")
      .select(
        "id,kode,kuota,status,dibuat_pada,ujian_id,ujian(judul),pemakaian_kode(id,status,skor,pelanggaran,mulai_pada,profiles(nama,email))",
      )
      .order("dibuat_pada", { ascending: false })
      .limit(1000),
    db.from("ujian").select("id,judul").order("judul"),
  ]);

  return (
    <div>
      <PageHeader judul="Kode ujian" deskripsi="Buat, cabut, dan pantau pemakaian kode." />
      <KodeManager
        kode={(kode ?? []) as unknown as BarisKode[]}
        ujian={(ujian ?? []) as OpsiUjianAdmin[]}
      />
    </div>
  );
}
