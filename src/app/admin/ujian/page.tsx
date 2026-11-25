import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { UjianManager, type BarisUjian } from "./ujian-manager";

export const metadata: Metadata = { title: "Ujian & soal" };

export default async function HalamanUjian() {
  const db = await createClient();
  const [{ data: ujian }, { data: kategori }] = await Promise.all([
    db.from("ujian").select("*, kategori(nama), soal(count)").order("dibuat_pada", { ascending: false }),
    db.from("kategori").select("id,nama").order("nama"),
  ]);

  return <UjianManager daftar={(ujian ?? []) as BarisUjian[]} kategori={kategori ?? []} />;
}
