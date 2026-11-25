"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unggahGambar } from "@/lib/gambar";

/** Tombol unggah gambar soal/opsi: menampilkan miniatur, serta tombol ganti dan hapus. */
export function UnggahGambar({
  label,
  ujianId,
  nilai,
  onUbah,
  kecil,
}: {
  label: string;
  ujianId: string;
  nilai: string;
  onUbah: (url: string) => void;
  kecil?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const berkas = e.target.files?.[0];
    e.target.value = "";
    if (!berkas) return;
    setGalat(null);
    setProses(true);
    try {
      onUbah(await unggahGambar(berkas, ujianId));
    } catch (err) {
      setGalat(err instanceof Error ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setProses(false);
    }
  }

  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={pilih} />
      {nilai ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={nilai}
            alt={label}
            className={kecil ? "h-14 w-14 rounded-lg border border-border object-cover" : "h-20 w-20 rounded-xl border border-border object-cover"}
          />
          <Button variant="outline" size="sm" onClick={() => input.current?.click()} disabled={proses}>
            {proses ? "Mengunggah…" : "Ganti"}
          </Button>
          <Button variant="danger-soft" size="sm" onClick={() => onUbah("")} disabled={proses} aria-label={`Hapus ${label}`}>
            <Trash2 className="size-4" /> Hapus
          </Button>
        </div>
      ) : (
        <Button variant={kecil ? "ghost" : "soft"} size="sm" onClick={() => input.current?.click()} disabled={proses}>
          <ImagePlus className="size-4" />
          {proses ? "Mengunggah…" : label}
        </Button>
      )}
      {galat && <p className="text-xs font-medium text-[#b23b3b] dark:text-danger">{galat}</p>}
    </div>
  );
}
