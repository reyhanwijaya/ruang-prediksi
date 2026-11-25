import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { KategoriManager, type BarisKategori } from "./kategori-manager";

export const metadata: Metadata = { title: "Kategori" };

export default async function HalamanKategori() {
  const db = await createClient();
  const { data } = await db
    .from("kategori")
    .select("*, ujian(count)")
    .order("dibuat_pada", { ascending: false });

  return <KategoriManager daftar={(data ?? []) as BarisKategori[]} />;
}
