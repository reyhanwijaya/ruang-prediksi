"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Hasil } from "@/lib/types";

const skema = z.object({
  jawabanId: z.string().uuid("Jawaban tidak valid."),
  nilai: z.number({ message: "Nilai harus berupa angka." }).min(0, "Nilai tidak boleh negatif.").max(1000, "Nilai terlalu besar."),
  komentar: z.string().max(1000, "Komentar maksimal 1000 karakter.").optional().default(""),
});

export async function nilaiEsai(input: unknown): Promise<Hasil<{ skor: number | null }>> {
  const profil = await getProfile();
  if (!profil || profil.peran !== "admin") return { ok: false, error: "Hanya admin yang boleh menilai esai." };

  const p = skema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };

  const db = await createClient();
  const { data, error } = await db.rpc("nilai_esai_simpan", {
    p_jawaban: p.data.jawabanId,
    p_nilai: p.data.nilai,
    p_komentar: p.data.komentar || null,
  });
  if (error) return { ok: false, error: error.code === "42501" ? "Akses ditolak." : error.message };
  if (!data?.ok) return { ok: false, error: data?.pesan ?? "Gagal menyimpan nilai." };

  revalidatePath("/admin/esai");
  return { ok: true, skor: data.skor === null ? null : Number(data.skor) };
}
