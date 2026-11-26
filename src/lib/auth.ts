import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/** Profil pengguna yang login. Jika baris profil belum ada, dibuatkan versi sementara dari data Google. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data as Profile;
  // Galat database (mis. izin tabel belum diberikan) jangan disembunyikan diam-diam.
  if (error) console.error("[getProfile] gagal membaca profil:", error.code, error.message);

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  return {
    id: user.id,
    nama: meta.full_name ?? meta.name ?? null,
    email: user.email ?? null,
    foto_url: meta.avatar_url ?? meta.picture ?? null,
    peran: "peserta",
  };
});

export async function requireProfile(): Promise<Profile> {
  const profil = await getProfile();
  if (!profil) redirect("/");
  return profil;
}

export async function requireAdmin(): Promise<Profile> {
  const profil = await requireProfile();
  if (profil.peran !== "admin") redirect("/beranda");
  return profil;
}
