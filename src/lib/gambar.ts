import { createClient } from "@/lib/supabase/client";

const BUCKET = "soal-gambar";
const MAKS_SISI = 1600; // piksel
const MAKS_BYTE = 3 * 1024 * 1024; // sama dengan batas bucket

function keBlob(canvas: HTMLCanvasElement, tipe: string, mutu: number) {
  return new Promise<Blob | null>((selesai) => canvas.toBlob(selesai, tipe, mutu));
}

/** Memperkecil gambar (maks 1600 px) dan mengubahnya ke WebP/JPEG supaya ringan dimuat peserta. */
async function perkecil(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file; // animasi dipertahankan

  const bmp = await createImageBitmap(file);
  const skala = Math.min(1, MAKS_SISI / Math.max(bmp.width, bmp.height));
  const lebar = Math.max(1, Math.round(bmp.width * skala));
  const tinggi = Math.max(1, Math.round(bmp.height * skala));

  const canvas = document.createElement("canvas");
  canvas.width = lebar;
  canvas.height = tinggi;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#ffffff"; // latar putih agar PNG transparan tidak jadi hitam saat jadi JPEG
  ctx.fillRect(0, 0, lebar, tinggi);
  ctx.drawImage(bmp, 0, 0, lebar, tinggi);
  bmp.close?.();

  const webp = await keBlob(canvas, "image/webp", 0.88);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await keBlob(canvas, "image/jpeg", 0.88);
  return jpeg ?? file;
}

/** Mengunggah gambar soal ke Storage dan mengembalikan alamat publiknya. Hanya admin yang diizinkan (RLS). */
export async function unggahGambar(file: File, ujianId: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar (JPG, PNG, WebP, atau GIF).");

  const blob = await perkecil(file);
  if (blob.size > MAKS_BYTE) throw new Error("Gambar terlalu besar (maksimal 3 MB).");

  const ekstensi =
    blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : blob.type === "image/gif" ? "gif" : "jpg";
  const path = `${ujianId}/${crypto.randomUUID()}.${ekstensi}`;

  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
  });
  if (error) throw new Error("Gagal mengunggah gambar. Pastikan migrasi 002 sudah dijalankan dan kamu login sebagai admin.");

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
