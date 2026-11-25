"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Hasil } from "@/lib/types";

const TOLAK = "Hanya admin yang boleh melakukan ini.";
const gagal = (error: string) => ({ ok: false as const, error });
const uuid = z.string().uuid();

async function pastikanAdmin() {
  const p = await getProfile();
  return p && p.peran === "admin" ? p : null;
}

function pesanDb(e: { code?: string; message: string }) {
  if (e.code === "42501") return "Akses ditolak. Pastikan akunmu berperan admin.";
  return e.message;
}

function segarkan() {
  revalidatePath("/admin/kode");
}

const buatSchema = z.object({
  ujianId: uuid,
  jumlah: z.coerce.number().int().min(1, "Jumlah minimal 1.").max(100, "Maksimal 100 kode sekali buat."),
  kuota: z.coerce.number().int().min(1, "Kuota minimal 1.").max(1000, "Kuota terlalu besar."),
});

export async function buatKode(input: unknown): Promise<Hasil<{ kode: string[] }>> {
  if (!(await pastikanAdmin())) return gagal(TOLAK);
  const p = buatSchema.safeParse(input);
  if (!p.success) return gagal(p.error.issues[0].message);

  const db = await createClient();
  const { data, error } = await db.rpc("buat_kode", {
    p_ujian: p.data.ujianId,
    p_jumlah: p.data.jumlah,
    p_kuota: p.data.kuota,
  });
  if (error) return gagal(pesanDb(error));
  segarkan();
  return { ok: true, kode: (data ?? []) as string[] };
}

export async function ubahKuota(kodeId: string, kuota: number): Promise<Hasil> {
  const admin = await pastikanAdmin();
  if (!admin) return gagal(TOLAK);
  if (!uuid.safeParse(kodeId).success) return gagal("Kode tidak valid.");
  const k = z.number().int().min(1, "Kuota minimal 1.").max(1000, "Kuota terlalu besar.").safeParse(kuota);
  if (!k.success) return gagal(k.error.issues[0].message);

  const db = await createClient();
  const { count } = await db
    .from("pemakaian_kode")
    .select("id", { count: "exact", head: true })
    .eq("kode_ujian_id", kodeId);
  if ((count ?? 0) > k.data) return gagal(`Kuota tidak boleh di bawah pemakaian saat ini (${count}).`);

  const { error } = await db.from("kode_ujian").update({ kuota: k.data }).eq("id", kodeId);
  if (error) return gagal(pesanDb(error));
  await db.from("log_admin").insert({ admin_id: admin.id, aksi: "ubah_kuota", sasaran_id: kodeId, nilai: { kuota: k.data } });
  segarkan();
  return { ok: true };
}

export async function cabutKode(kodeId: string, aktifkan = false): Promise<Hasil> {
  const admin = await pastikanAdmin();
  if (!admin) return gagal(TOLAK);
  if (!uuid.safeParse(kodeId).success) return gagal("Kode tidak valid.");

  const db = await createClient();
  const { error } = await db
    .from("kode_ujian")
    .update({ status: aktifkan ? "aktif" : "dicabut" })
    .eq("id", kodeId);
  if (error) return gagal(pesanDb(error));
  await db
    .from("log_admin")
    .insert({ admin_id: admin.id, aksi: aktifkan ? "aktifkan_kode" : "cabut_kode", sasaran_id: kodeId, nilai: {} });
  segarkan();
  return { ok: true };
}

/** Reset: hapus pemakaian satu peserta agar ia bisa memakai kodenya lagi. Alasan wajib dan dicatat. */
export async function resetPemakaian(pemakaianId: string, alasan: string): Promise<Hasil> {
  const admin = await pastikanAdmin();
  if (!admin) return gagal(TOLAK);
  if (!uuid.safeParse(pemakaianId).success) return gagal("Data tidak valid.");
  const a = z.string().trim().min(3, "Alasan wajib diisi (minimal 3 karakter).").max(300).safeParse(alasan);
  if (!a.success) return gagal(a.error.issues[0].message);

  const db = await createClient();
  const { data: lama } = await db
    .from("pemakaian_kode")
    .select("id,kode_ujian_id,ujian_id,user_id,status,skor,jumlah_benar,pelanggaran,mulai_pada")
    .eq("id", pemakaianId)
    .maybeSingle();
  if (!lama) return gagal("Pemakaian tidak ditemukan.");

  // Catat lebih dulu agar jejaknya tetap ada walau penghapusan gagal di tengah jalan.
  await db.from("log_admin").insert({
    admin_id: admin.id,
    aksi: "reset_pemakaian",
    sasaran_id: pemakaianId,
    nilai: lama,
    alasan: a.data,
  });
  const { error } = await db.from("pemakaian_kode").delete().eq("id", pemakaianId);
  if (error) return gagal(pesanDb(error));
  segarkan();
  return { ok: true };
}
