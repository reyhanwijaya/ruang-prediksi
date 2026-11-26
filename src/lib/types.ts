export type StatusKonten = "draf" | "terbit" | "arsip";
export type JenisSoal = "pilihan_ganda" | "isian" | "esai";
export type StatusPemakaian = "berjalan" | "selesai" | "dikunci" | "waktu_habis";
export type JenisPelanggaran = "keluar_fullscreen" | "pindah_tab" | "kehilangan_fokus";

/** Hasil standar server action: sukses (dengan data tambahan) atau gagal (dengan pesan). */
export type Hasil<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export interface Profile {
  id: string;
  nama: string | null;
  email: string | null;
  foto_url: string | null;
  peran: "peserta" | "admin";
}

export interface Kategori {
  id: string;
  nama: string;
  tahun_ajaran: string | null;
  deskripsi: string | null;
  status: StatusKonten;
  dibuat_pada: string;
}

export interface Ujian {
  id: string;
  kategori_id: string;
  judul: string;
  deskripsi: string | null;
  durasi_menit: number;
  aturan_satu_kode: boolean;
  kunci_pelanggaran: boolean;
  status: StatusKonten;
  dibuat_pada: string;
}

export interface OpsiSoal {
  kode: string;
  teks: string;
  gambar?: string | null;
}

export interface SoalRingkas {
  id: string;
  nomor: number;
  jenis: JenisSoal;
  teks: string;
  bobot: number;
  diubah_pada: string;
}

/** Bentuk isian form soal (dipakai halaman edit dan form). */
export interface SoalForm {
  jenis: JenisSoal;
  teks: string;
  gambar: string; // "" = tanpa gambar
  bobot: string;
  opsi: string[];
  opsiGambar: string[]; // sejajar dengan opsi, "" = tanpa gambar
  kunci: number; // indeks opsi, -1 = belum dipilih
  jawaban: string[];
  rubrik: string;
  pembahasan: string;
}

// ------------------------------------------------------------- SESI UJIAN

export interface HasilSesi {
  status: StatusPemakaian;
  skor: number | null;
  jumlah_benar: number;
  pelanggaran: number;
  menunggu_esai: boolean;
  jumlah_soal: number;
}

export interface SesiUjian {
  id: string;
  status: StatusPemakaian;
  judul: string;
  deskripsi: string | null;
  durasi_menit: number;
  jumlah_soal: number;
  mulai_pada: string | null;
  deadline: string | null;
  server_now: string;
  pelanggaran: number;
  kunci_pelanggaran: boolean;
  nomor_terjawab: number[];
  hasil: HasilSesi | null;
}

export interface OpsiUjian {
  kode: string;
  teks: string;
  gambar?: string | null;
}

/** Soal seperti yang diterima peserta: TANPA kunci dan pembahasan. */
export interface SoalUjian {
  nomor: number;
  jenis: JenisSoal;
  teks: string;
  gambar_url: string | null;
  bobot: number;
  opsi: OpsiUjian[];
}

export interface GalatRpc {
  ok: false;
  kode: string;
  pesan: string;
  hasil?: HasilSesi;
}

export type HasilMulai = { ok: true; sesi: SesiUjian } | GalatRpc;
export type HasilAmbilSoal = { ok: true; soal: SoalUjian; jawaban: string | null } | GalatRpc;
export type HasilSimpan = { ok: true } | GalatRpc;
export type HasilPelanggaran =
  | { ok: true; dicatat: boolean; pelanggaran: number; status: StatusPemakaian; hasil?: HasilSesi | null }
  | GalatRpc;
export type HasilKumpul = { ok: true; hasil: HasilSesi } | GalatRpc;

export type HasilKode =
  | { ok: true; id: string }
  | { ok: false; pesan: string; lanjutId?: string };

export interface KodeSaya {
  pemakaian_id: string;
  kode: string;
  judul: string;
  status: StatusPemakaian;
  skor: number | null;
  mulai_pada: string | null;
  dibuat_pada: string;
}

// ------------------------------------------------------------- RIWAYAT DETAIL

export type StatusSoalRiwayat = "benar" | "salah" | "sebagian" | "kosong" | "menunggu";

export interface SoalRiwayat {
  nomor: number;
  jenis: JenisSoal;
  teks: string;
  gambar_url: string | null;
  bobot: number;
  opsi: OpsiSoal[];
  kunci: string | null;
  jawaban_benar: string[] | null;
  pembahasan: string | null;
  jawaban: string | null;
  nilai: number | null;
  komentar: string | null;
  status: StatusSoalRiwayat;
}

export interface DetailRiwayat {
  ujian: { id: string; judul: string };
  mulai_pada: string | null;
  selesai_pada: string | null;
  hasil: HasilSesi;
  soal: SoalRiwayat[];
  pelanggaran: { jenis: string; waktu: string }[];
}
