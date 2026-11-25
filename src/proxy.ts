import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// Halaman yang wajib login. Pemeriksaan peran admin dilakukan lagi di server (layout admin + RLS).
const DILINDUNGI = ["/beranda", "/kode-saya", "/riwayat", "/profil", "/admin", "/ujian"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const perluLogin = DILINDUNGI.some((p) => path === p || path.startsWith(p + "/"));

  let tujuan: string | null = null;
  if (!user && perluLogin) tujuan = "/";
  if (user && path === "/") tujuan = "/beranda";

  if (tujuan) {
    const url = request.nextUrl.clone();
    url.pathname = tujuan;
    url.search = "";
    const alih = NextResponse.redirect(url);
    // bawa cookie sesi yang baru disegarkan
    response.cookies.getAll().forEach((c) => alih.cookies.set(c));
    return alih;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
