import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

export const STATUS_PEMAKAIAN = ["berjalan", "selesai", "dikunci", "waktu_habis"] as const;

export interface FilterPemakaian {
  ujian: string;
  status: string;
  kode: string;
  orang: string;
}

export interface BarisPemakaian {
  id: string;
  status: (typeof STATUS_PEMAKAIAN)[number];
  skor: number | null;
  jumlah_benar: number;
  pelanggaran: number;
  mulai_pada: string | null;
  selesai_pada: string | null;
  ujian: { judul: string } | { judul: string }[] | null;
  kode_ujian: { kode: string } | { kode: string }[] | null;
  profiles: { nama: string | null; email: string | null } | { nama: string | null; email: string | null }[] | null;
}

export const satu = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

/** Membersihkan teks pencarian agar aman dipakai di filter PostgREST. */
function bersih(s: string | undefined, maks = 60) {
  return (s ?? "").replace(/[^\p{L}\p{N}@._\- ]/gu, "").trim().slice(0, maks);
}

export function bacaFilter(sp: Record<string, string | undefined>): FilterPemakaian {
  const status = (STATUS_PEMAKAIAN as readonly string[]).includes(sp.status ?? "") ? (sp.status as string) : "";
  const ujian = /^[0-9a-f-]{36}$/i.test(sp.ujian ?? "") ? (sp.ujian as string) : "";
  return { ujian, status, kode: bersih(sp.kode, 12).toUpperCase(), orang: bersih(sp.orang) };
}

export function queryString(f: Partial<FilterPemakaian>, extra: Record<string, string> = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) p.set(k, v);
  return p.toString();
}

/** Mengambil satu halaman pemakaian sesuai filter. Hanya boleh dipanggil dari halaman/route admin. */
export async function ambilPemakaian(db: Db, f: FilterPemakaian, dari: number, sampai: number) {
  let idKode: string[] | null = null;
  let idOrang: string[] | null = null;

  if (f.kode) {
    const { data } = await db.from("kode_ujian").select("id").ilike("kode", `%${f.kode}%`).limit(500);
    idKode = (data ?? []).map((x) => x.id as string);
    if (idKode.length === 0) return { rows: [] as BarisPemakaian[], total: 0 };
  }
  if (f.orang) {
    const { data } = await db
      .from("profiles")
      .select("id")
      .or(`nama.ilike.%${f.orang}%,email.ilike.%${f.orang}%`)
      .limit(500);
    idOrang = (data ?? []).map((x) => x.id as string);
    if (idOrang.length === 0) return { rows: [] as BarisPemakaian[], total: 0 };
  }

  let q = db
    .from("pemakaian_kode")
    .select(
      "id,status,skor,jumlah_benar,pelanggaran,mulai_pada,selesai_pada,ujian(judul),kode_ujian(kode),profiles(nama,email)",
      { count: "exact" },
    )
    .order("mulai_pada", { ascending: false, nullsFirst: false })
    .range(dari, sampai);

  if (f.ujian) q = q.eq("ujian_id", f.ujian);
  if (f.status) q = q.eq("status", f.status);
  if (idKode) q = q.in("kode_ujian_id", idKode);
  if (idOrang) q = q.in("user_id", idOrang);

  const { data, count } = await q;
  return { rows: (data ?? []) as unknown as BarisPemakaian[], total: count ?? 0 };
}
