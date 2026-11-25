"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { kategoriSchema, soalSchema, ujianSchema } from "@/lib/validators";
import { parseImpor } from "@/lib/impor-soal";
import { HURUF_OPSI, awalanGambarSah } from "@/lib/utils";
import type { Hasil } from "@/lib/types";

type Db = Awaited<ReturnType<typeof createClient>>;

const TOLAK = "Hanya admin yang boleh melakukan ini.";
const gagal = (error: string) => ({ ok: false as const, error });
const idSchema = z.string().uuid();

async function pastikanAdmin() {
  const profil = await getProfile();
  return profil && profil.peran === "admin" ? profil : null;
}

function pesanDb(e: { code?: string; message: string }) {
  if (e.code === "42501") return "Akses ditolak. Pastikan akunmu berperan admin.";
  if (e.code === "23503") return "Data ini masih dipakai data lain.";
  return e.message;
}

async function catat(
  db: Db,
  adminId: string,
  aksi: string,
  sasaranId: string | null,
  nilai: Record<string, unknown> = {},
) {
  await db.from("log_admin").insert({ admin_id: adminId, aksi, sasaran_id: sasaranId, nilai });
}

function segarkan() {
  revalidatePath("/admin", "layout");
}

// ---------------------------------------------------------------- KATEGORI

export async function simpanKategori(input: unknown): Promise<Hasil> {
  const admin = await pastikanAdmin();
  if (!admin) return gagal(TOLAK);

  const p = kategoriSchema.safeParse(input);
  if (!p.success) return gagal(p.error.issues[0].message);

  const { id, nama, tahun_ajaran, deskripsi, status } = p.data;
  const baris = { nama, tahun_ajaran: tahun_ajaran || null, deskripsi: deskripsi || null, status };
  const db = await createClient();

  if (id) {
    const { error } = await db.from("kategori").update(baris).eq("id", id);
    if (error) return gagal(pesanDb(error));
    await catat(db, admin.id, "ubah_kategori", id, { nama, status });
  } else {
    const { data, error } = await db.from("kategori").insert(baris).select("id").single();
    if (error) return gagal(pesanDb(error));
    await catat(db, admin.id, "buat_kategori", data.id, { nama, status });
  }

  segarkan();
  return { ok: true };
}

export async function hapusKategori(id: string): Promise<Hasil> {
  const admin = await pastikanAdmin();
  if (!admin) return gagal(TOLAK);
  if (!idSchema.safeParse(id).success) return gagal("ID tidak valid.");

  const db = await createClient();
  const { error } = await db.from("kategori").delete().eq("id", id);
  if (error) {
    return gagal(
      error.code === "23503"
        ? "Kategori ini masih punya ujian. Hapus atau pindahkan ujiannya dulu, atau ubah statusnya menjadi Arsip."
        : pesanDb(error),
    );
  }
  await catat(db, admin.id, "hapus_kategori", id);
  segarkan();
  return { ok: true };
}

// ------------------------------------------------------------------- UJIAN

export async function simpanUjian(input: unknown): Promise<Hasil<{ id: string }>> {
  const admin = await pastikanAdmin();
  if (!admin) return gagal(TOLAK);

  const p = ujianSchema.safeParse(input);
  if (!p.success) return gagal(p.error.issues[0].message);

  const { id, deskripsi, ...sisa } = p.data;
  const baris = { ...sisa, deskripsi: deskripsi || null };
  const db = await createClient();

  if (id) {
    const { error } = await db.from("ujian").update(baris).eq("id", id);
    if (error) return gagal(pesanDb(error));
    await catat(db, admin.id, "ubah_ujian", id, { judul: sisa.judul, status: sisa.status });
    segarkan();
    return { ok: true, id };
  }

  const { data, error } = await db.from("ujian").insert(baris).select("id").single();
  if (error) return gagal(pesanDb(error));
  await catat(db, admin.id, "buat_ujian", data.id, { judul: sisa.judul, status: sisa.status });
  segarkan();
  return { ok: true, id: data.id as string };
}

export async function hapusUjian(id: string): Promise<Hasil> {
  const admin = await pastikanAdmin();
  if (!admin) return gagal(TOLAK);
  if (!idSchema.safeParse(id).success) return gagal("ID tidak valid.");

  const db = await createClient();
  const { error } = await db.from("ujian").delete().eq("id", id);
  if (error) {
    return gagal(
      error.code === "23503"
        ? "Ujian ini sudah punya riwayat peserta, jadi tidak bisa dihapus. Ubah statusnya menjadi Arsip saja."
        : pesanDb(error),
    );
  }
  await catat(db, admin.id, "hapus_ujian", id);
  segarkan();
  return { ok: true };
}

// -------------------------------------------------------------------- SOAL

async function nomorBerikut(db: Db, ujianId: string) {
  const { data } = await db
    .from("soal")
    .select("nomor")
    .eq("ujian_id", ujianId)
    .order("nomor", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.nomor as number | undefined) ?? 0) + 1;
}

async function rapikanNomor(db: Db, ujianId: string) {
  const { data } = await db.from("soal").select("id").eq("ujian_id", ujianId).order("nomor");
  const ids = (data ?? []).map((r: { id: string }) => r.id);
  if (ids.length) await db.rpc("urutkan_soal", { p_ujian: ujianId, p_ids: ids });
}

export async function simpanSoal(input: unknown): Promise<Hasil<{ id: string }>> {
  const admin = await pastikanAdmin();
  if (!admin) return gagal(TOLAK);

  const p = soalSchema.safeParse(input);
  if (!p.success) return gagal(p.error.issues[0].message);

  const d = p.data;

  // Gambar hanya boleh berasal dari penyimpanan gambar soal milik aplikasi ini.
  const awalan = awalanGambarSah();
  const gambarSah = (u: string) => u === "" || (u.startsWith(awalan) && !/[\s"'<>]/.test(u));
  if (!gambarSah(d.gambar)) return gagal("Alamat gambar tidak valid. Unggah gambar lewat tombol di formulir.");
  if (d.jenis === "pilihan_ganda" && !d.opsi_gambar.every(gambarSah)) return gagal("Alamat gambar opsi tidak valid.");

  const dasar = {
    ujian_id: d.ujian_id,
    jenis: d.jenis,
    teks: d.teks,
    gambar_url: d.gambar || null,
    bobot: d.bobot,
    pembahasan: d.pembahasan || null,
  };

  let isi: Record<string, unknown>;
  if (d.jenis === "pilihan_ganda") {
    if (d.kunci_index >= d.opsi.length) return gagal("Kunci jawaban tidak cocok dengan opsi.");
    isi = {
      ...dasar,
      opsi: d.opsi.map((teks, i) => {
        const g = d.opsi_gambar[i];
        return g ? { kode: HURUF_OPSI[i], teks, gambar: g } : { kode: HURUF_OPSI[i], teks };
      }),
      kunci: HURUF_OPSI[d.kunci_index],
      jawaban_isian: [],
      rubrik: null,
    };
  } else if (d.jenis === "isian") {
    isi = { ...dasar, opsi: [], kunci: null, jawaban_isian: d.jawaban_isian, rubrik: null };
  } else {
    isi = { ...dasar, opsi: [], kunci: null, jawaban_isian: [], rubrik: d.rubrik || null };
  }

  const db = await createClient();

  if (d.id) {
    const { error } = await db.from("soal").update(isi).eq("id", d.id).eq("ujian_id", d.ujian_id);
    if (error) return gagal(pesanDb(error));
    await catat(db, admin.id, "ubah_soal", d.id, { jenis: d.jenis });
    segarkan();
    return { ok: true, id: d.id };
  }

  const nomor = await nomorBerikut(db, d.ujian_id);
  const { data, error } = await db.from("soal").insert({ ...isi, nomor }).select("id").single();
  if (error) return gagal(pesanDb(error));
  await catat(db, admin.id, "buat_soal", data.id, { jenis: d.jenis, nomor });
  segarkan();
  return { ok: true, id: data.id as string };
}

export async function hapusSoal(id: string, ujianId: string): Promise<Hasil> {
  const admin = await pastikanAdmin();
  if (!admin) return gagal(TOLAK);
  if (!idSchema.safeParse(id).success || !idSchema.safeParse(ujianId).success) return gagal("ID tidak valid.");

  const db = await createClient();
  const { error } = await db.from("soal").delete().eq("id", id).eq("ujian_id", ujianId);
  if (error) {
    return gagal(
      error.code === "23503"
        ? "Soal ini sudah pernah dijawab peserta, jadi tidak bisa dihapus."
        : pesanDb(error),
    );
  }
  await rapikanNomor(db, ujianId);
  await catat(db, admin.id, "hapus_soal", id);
  segarkan();
  return { ok: true };
}

export async function gandakanSoal(id: string): Promise<Hasil> {
  const admin = await pastikanAdmin();
  if (!admin) return gagal(TOLAK);
  if (!idSchema.safeParse(id).success) return gagal("ID tidak valid.");

  const db = await createClient();
  const { data: asal, error: e1 } = await db.from("soal").select("*").eq("id", id).maybeSingle();
  if (e1 || !asal) return gagal("Soal asal tidak ditemukan.");

  const nomor = await nomorBerikut(db, asal.ujian_id);
  const { id: _id, dibuat_pada: _a, diubah_pada: _b, ...salinan } = asal;
  const { data: baru, error: e2 } = await db
    .from("soal")
    .insert({ ...salinan, nomor })
    .select("id")
    .single();
  if (e2) return gagal(pesanDb(e2));

  // taruh salinan tepat di bawah soal asal
  const { data: semua } = await db.from("soal").select("id").eq("ujian_id", asal.ujian_id).order("nomor");
  const ids = (semua ?? []).map((r: { id: string }) => r.id).filter((x: string) => x !== baru.id);
  const posisi = ids.indexOf(id);
  ids.splice(posisi + 1, 0, baru.id);
  await db.rpc("urutkan_soal", { p_ujian: asal.ujian_id, p_ids: ids });

  await catat(db, admin.id, "gandakan_soal", baru.id, { dari: id });
  segarkan();
  return { ok: true };
}

export async function urutkanSoal(ujianId: string, ids: string[]): Promise<Hasil> {
  const admin = await pastikanAdmin();
  if (!admin) return gagal(TOLAK);
  const cek = z.object({ u: z.string().uuid(), i: z.array(z.string().uuid()).max(1000) }).safeParse({ u: ujianId, i: ids });
  if (!cek.success) return gagal("Data urutan tidak valid.");

  const db = await createClient();
  const { error } = await db.rpc("urutkan_soal", { p_ujian: ujianId, p_ids: ids });
  if (error) return gagal(pesanDb(error));
  segarkan();
  return { ok: true };
}

export async function imporSoal(ujianId: string, teks: string): Promise<Hasil<{ jumlah: number }>> {
  const admin = await pastikanAdmin();
  if (!admin) return gagal(TOLAK);
  if (!idSchema.safeParse(ujianId).success) return gagal("ID ujian tidak valid.");
  if (typeof teks !== "string" || teks.length > 400_000) return gagal("Teks impor kosong atau terlalu besar.");

  const { soal, galat } = parseImpor(teks);
  if (galat.length) return gagal(`Blok ${galat[0].blok}: ${galat[0].pesan}`);
  if (!soal.length) return gagal("Belum ada soal yang bisa diimpor.");
  if (soal.length > 200) return gagal("Maksimal 200 soal sekali impor.");

  const db = await createClient();
  let nomor = await nomorBerikut(db, ujianId);
  const baris: Record<string, unknown>[] = [];

  for (let i = 0; i < soal.length; i++) {
    const s = soal[i];
    // validasi ulang dengan aturan yang sama seperti form
    const cek = soalSchema.safeParse(
      s.jenis === "pilihan_ganda"
        ? { ujian_id: ujianId, jenis: s.jenis, teks: s.teks, bobot: s.bobot, pembahasan: s.pembahasan, opsi: s.opsi, kunci_index: s.kunci_index }
        : s.jenis === "isian"
          ? { ujian_id: ujianId, jenis: s.jenis, teks: s.teks, bobot: s.bobot, pembahasan: s.pembahasan, jawaban_isian: s.jawaban_isian }
          : { ujian_id: ujianId, jenis: s.jenis, teks: s.teks, bobot: s.bobot, pembahasan: s.pembahasan, rubrik: s.rubrik },
    );
    if (!cek.success) return gagal(`Blok ${i + 1}: ${cek.error.issues[0].message}`);

    baris.push({
      ujian_id: ujianId,
      nomor: nomor++,
      jenis: s.jenis,
      teks: s.teks,
      opsi: s.jenis === "pilihan_ganda" ? s.opsi.map((t, k) => ({ kode: HURUF_OPSI[k], teks: t })) : [],
      kunci: s.jenis === "pilihan_ganda" ? HURUF_OPSI[s.kunci_index] : null,
      jawaban_isian: s.jenis === "isian" ? s.jawaban_isian : [],
      bobot: s.bobot,
      rubrik: s.jenis === "esai" ? s.rubrik || null : null,
      pembahasan: s.pembahasan || null,
    });
  }

  const { error } = await db.from("soal").insert(baris);
  if (error) return gagal(pesanDb(error));

  await catat(db, admin.id, "impor_soal", ujianId, { jumlah: baris.length });
  segarkan();
  return { ok: true, jumlah: baris.length };
}
