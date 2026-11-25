"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type {
  GalatRpc,
  HasilAmbilSoal,
  HasilKumpul,
  HasilMulai,
  HasilPelanggaran,
  HasilSimpan,
  JenisPelanggaran,
} from "@/lib/types";

const uuid = z.string().uuid();
const GANGGUAN: GalatRpc = {
  ok: false,
  kode: "galat",
  pesan: "Terjadi gangguan koneksi. Coba lagi.",
};

/** Memanggil fungsi database atas nama peserta yang login. Semua pemeriksaan hak ada di fungsi SQL. */
async function panggil<T>(fn: string, args: Record<string, unknown>): Promise<T | GalatRpc> {
  const db = await createClient();
  const { data, error } = await db.rpc(fn, args);
  if (error || !data) return GANGGUAN;
  return data as T;
}

export async function mulaiUjianAksi(id: string): Promise<HasilMulai> {
  if (!uuid.safeParse(id).success) return GANGGUAN;
  return panggil<HasilMulai>("mulai_ujian", { p_id: id });
}

export async function ambilSoalAksi(id: string, nomor: number): Promise<HasilAmbilSoal> {
  if (!uuid.safeParse(id).success || !Number.isInteger(nomor) || nomor < 1) return GANGGUAN;
  return panggil<HasilAmbilSoal>("ambil_soal", { p_id: id, p_nomor: nomor });
}

export async function simpanJawabanAksi(id: string, nomor: number, pilihan: string): Promise<HasilSimpan> {
  if (!uuid.safeParse(id).success || !Number.isInteger(nomor) || nomor < 1) return GANGGUAN;
  if (typeof pilihan !== "string") return GANGGUAN;
  return panggil<HasilSimpan>("simpan_jawaban", { p_id: id, p_nomor: nomor, p_pilihan: pilihan });
}

export async function catatPelanggaranAksi(id: string, jenis: JenisPelanggaran): Promise<HasilPelanggaran> {
  if (!uuid.safeParse(id).success) return GANGGUAN;
  return panggil<HasilPelanggaran>("catat_pelanggaran", { p_id: id, p_jenis: jenis });
}

export async function kumpulkanAksi(id: string): Promise<HasilKumpul> {
  if (!uuid.safeParse(id).success) return GANGGUAN;
  return panggil<HasilKumpul>("kumpulkan", { p_id: id });
}

export async function batalkanSesiAksi(id: string): Promise<{ ok: boolean; pesan?: string }> {
  if (!uuid.safeParse(id).success) return { ok: false, pesan: GANGGUAN.pesan };
  const r = await panggil<{ ok: boolean; pesan?: string }>("batalkan_sesi", { p_id: id });
  return r.ok ? { ok: true } : { ok: false, pesan: "pesan" in r ? r.pesan : GANGGUAN.pesan };
}
