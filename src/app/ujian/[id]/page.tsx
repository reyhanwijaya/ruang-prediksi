import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SesiUjian } from "@/lib/types";
import { UjianKlien } from "./ujian-klien";

export default async function HalamanUjian({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();

  // Fungsi database memeriksa bahwa sesi ini milik pengguna yang login dan menutup sesi yang waktunya habis.
  const { data } = await db.rpc("ambil_sesi", { p_id: id });
  if (!data || !data.ok) notFound();

  return <UjianKlien awal={data.sesi as SesiUjian} />;
}
