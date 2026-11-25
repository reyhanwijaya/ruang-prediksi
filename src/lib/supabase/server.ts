import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Klien Supabase untuk server (halaman server, server action, route handler).
 * Berjalan atas nama pengguna yang login, jadi Row Level Security tetap berlaku.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(daftar) {
          try {
            daftar.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Dipanggil dari Server Component: aman diabaikan, sesi disegarkan oleh proxy.
          }
        },
      },
    },
  );
}
