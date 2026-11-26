"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Galat({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-warning/20 text-[#8a4a12] dark:text-warning">
        <TriangleAlert className="size-8" />
      </span>
      <h1 className="text-xl font-extrabold text-primary-deep">Terjadi gangguan</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Halaman gagal dimuat. Coba lagi. Jika sedang mengerjakan ujian, jawaban yang sudah tersimpan tetap aman dan waktu
        tetap berjalan di server.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Coba lagi</Button>
        <Link href="/beranda" className={cn(buttonVariants({ variant: "outline" }))}>
          Ke beranda
        </Link>
      </div>
      {error.digest && <p className="text-xs text-muted-foreground">Kode galat: {error.digest}</p>}
    </main>
  );
}
