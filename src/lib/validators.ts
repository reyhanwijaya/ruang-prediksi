import { z } from "zod";

const status = z.enum(["draf", "terbit", "arsip"], { message: "Status tidak valid." });
const uuid = z.string().uuid("ID tidak valid.");
const teksOpsional = (maks: number) =>
  z.string().trim().max(maks, `Maksimal ${maks} karakter.`).optional().default("");

export const kategoriSchema = z.object({
  id: uuid.optional(),
  nama: z
    .string()
    .trim()
    .min(3, "Nama kategori minimal 3 karakter.")
    .max(120, "Nama kategori maksimal 120 karakter."),
  tahun_ajaran: teksOpsional(20),
  deskripsi: teksOpsional(500),
  status,
});

export const ujianSchema = z.object({
  id: uuid.optional(),
  kategori_id: z.string().uuid("Pilih kategori terlebih dahulu."),
  judul: z
    .string()
    .trim()
    .min(3, "Judul ujian minimal 3 karakter.")
    .max(150, "Judul ujian maksimal 150 karakter."),
  deskripsi: teksOpsional(1000),
  durasi_menit: z
    .number()
    .int("Durasi harus bilangan bulat.")
    .min(1, "Durasi minimal 1 menit.")
    .max(600, "Durasi maksimal 600 menit."),
  aturan_satu_kode: z.boolean(),
  kunci_pelanggaran: z.boolean(),
  status,
});

const dasarSoal = {
  id: uuid.optional(),
  ujian_id: uuid,
  teks: z.string().trim().min(3, "Teks soal minimal 3 karakter.").max(5000, "Teks soal terlalu panjang."),
  bobot: z
    .number()
    .positive("Bobot harus lebih dari 0.")
    .max(1000, "Bobot maksimal 1000."),
  pembahasan: teksOpsional(5000),
  gambar: z.string().trim().max(600, "Alamat gambar terlalu panjang.").optional().default(""),
};

export const soalSchema = z.discriminatedUnion("jenis", [
  z.object({
    ...dasarSoal,
    jenis: z.literal("pilihan_ganda"),
    opsi: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Isi semua opsi atau hapus opsi yang kosong.")
          .max(500, "Satu opsi maksimal 500 karakter."),
      )
      .min(2, "Pilihan ganda butuh minimal 2 opsi.")
      .max(10, "Maksimal 10 opsi."),
    opsi_gambar: z.array(z.string().trim().max(600)).max(10).optional().default([]),
    kunci_index: z.number().int().min(0, "Pilih kunci jawaban dengan mengklik huruf opsi."),
  }),
  z.object({
    ...dasarSoal,
    jenis: z.literal("isian"),
    jawaban_isian: z
      .array(z.string().trim().min(1).max(200, "Satu jawaban maksimal 200 karakter."))
      .min(1, "Isi minimal satu jawaban yang benar.")
      .max(30, "Maksimal 30 varian jawaban."),
  }),
  z.object({
    ...dasarSoal,
    jenis: z.literal("esai"),
    rubrik: teksOpsional(3000),
  }),
]);

export type SoalInput = z.input<typeof soalSchema>;
