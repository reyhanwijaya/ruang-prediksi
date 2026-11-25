"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function IkonGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function LoginButton() {
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function masuk() {
    setProses(true);
    setGalat(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setGalat("Tidak bisa memulai login Google. Periksa pengaturan Supabase lalu coba lagi.");
      setProses(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button variant="outline" size="lg" className="w-full" onClick={masuk} disabled={proses}>
        <IkonGoogle />
        {proses ? "Mengalihkan ke Google…" : "Masuk dengan Google"}
      </Button>
      {galat && <p className="text-center text-sm font-medium text-[#b23b3b] dark:text-danger">{galat}</p>}
    </div>
  );
}
