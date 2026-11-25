import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google mengembalikan pengguna ke sini membawa ?code=...; kode ditukar menjadi sesi login.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/beranda`);
  }

  return NextResponse.redirect(`${origin}/?galat=masuk`);
}
