"use server";

import { createClient } from "@/lib/supabase/server";
import type { HasilKode } from "@/lib/types";
import { bersihkanKode } from "@/lib/utils";

const KODE_SALAH = "Kode tidak ditemukan. Periksa kembali huruf dan angkanya.";

/** Memakai kode ujian. Semua aturan (kuota, satu kode per ujian, rate limit) dijaga fungsi database. */
export async function pakaiKode(kode: string): Promise<HasilKode> {
  const bersih = bersihkanKode(String(kode ?? ""));
  if (bersih.length !== 8) return { ok: false, pesan: KODE_SALAH };

  const db = await createClient();
  const { data, error } = await db.rpc("pakai_kode", { p_kode: bersih });
  if (error || !data) return { ok: false, pesan: "Terjadi gangguan koneksi. Coba lagi." };

  const r = data as { ok: boolean; pemakaian_id?: string; pesan?: string };
  if (r.ok && r.pemakaian_id) return { ok: true, id: r.pemakaian_id };
  return { ok: false, pesan: r.pesan ?? KODE_SALAH, lanjutId: r.pemakaian_id };
}
