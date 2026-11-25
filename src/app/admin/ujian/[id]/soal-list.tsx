"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Copy, GripVertical, ListChecks, Pencil } from "lucide-react";
import { HapusTombol } from "@/components/hapus-tombol";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import type { SoalRingkas } from "@/lib/types";
import { JENIS_LABEL, cn, potong } from "@/lib/utils";
import { gandakanSoal, hapusSoal, urutkanSoal } from "@/app/admin/actions";

const NADA = { pilihan_ganda: "biru", isian: "hijau", esai: "kuning" } as const;

export function SoalList({ ujianId, soal }: { ujianId: string; soal: SoalRingkas[] }) {
  const [item, setItem] = useState(soal);
  const [galat, setGalat] = useState<string | null>(null);
  const [seret, setSeret] = useState<string | null>(null);
  const [sasaran, setSasaran] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  function simpanUrutan(baru: SoalRingkas[]) {
    const lama = item;
    setItem(baru);
    setGalat(null);
    mulai(async () => {
      const r = await urutkanSoal(
        ujianId,
        baru.map((s) => s.id),
      );
      if (!r.ok) {
        setGalat(r.error);
        setItem(lama);
      }
    });
  }

  function pindah(dari: number, ke: number) {
    if (dari === ke || ke < 0 || ke >= item.length) return;
    const baru = [...item];
    const [diambil] = baru.splice(dari, 1);
    baru.splice(ke, 0, diambil);
    simpanUrutan(baru);
  }

  function gandakan(id: string) {
    setGalat(null);
    mulai(async () => {
      const r = await gandakanSoal(id);
      if (!r.ok) setGalat(r.error);
    });
  }

  if (item.length === 0) {
    return (
      <EmptyState ikon={<ListChecks className="size-10" />} judul="Belum ada soal.">
        Klik “Tambah soal” atau “Tempel banyak soal” untuk mulai mengisi ujian ini.
      </EmptyState>
    );
  }

  return (
    <div>
      {galat && (
        <p className="mb-3 rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-medium text-[#b23b3b] dark:text-danger">
          {galat}
        </p>
      )}
      <p className="mb-3 text-xs text-muted-foreground">
        Geser dengan menyeret ikon <GripVertical className="inline size-3.5" /> (desktop) atau pakai tombol panah (HP).
      </p>

      <ul className={cn("space-y-2", proses && "opacity-70")}>
        {item.map((s, i) => (
          <li
            key={s.id}
            onDragOver={(e) => {
              if (seret) {
                e.preventDefault();
                setSasaran(s.id);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (seret) {
                pindah(
                  item.findIndex((x) => x.id === seret),
                  i,
                );
              }
              setSeret(null);
              setSasaran(null);
            }}
          >
            <Card
              className={cn(
                "flex items-start gap-3 p-3 sm:p-4",
                sasaran === s.id && seret !== s.id && "border-primary ring-2 ring-primary/30",
                seret === s.id && "opacity-50",
              )}
            >
              <span
                draggable
                onDragStart={() => setSeret(s.id)}
                onDragEnd={() => {
                  setSeret(null);
                  setSasaran(null);
                }}
                aria-hidden="true"
                className="mt-1 hidden cursor-grab text-muted-foreground active:cursor-grabbing md:block"
              >
                <GripVertical className="size-5" />
              </span>

              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-extrabold text-primary-deep">
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed">{potong(s.teks, 140)}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge tone={NADA[s.jenis]}>{JENIS_LABEL[s.jenis]}</Badge>
                  <span className="text-xs text-muted-foreground">Bobot {Number(s.bobot)}</span>
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Naikkan"
                    disabled={i === 0 || proses}
                    onClick={() => pindah(i, i - 1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Turunkan"
                    disabled={i === item.length - 1 || proses}
                    onClick={() => pindah(i, i + 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/ujian/${ujianId}/soal/${s.id}`}
                    aria-label="Ubah soal"
                    title="Ubah soal"
                    className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-8")}
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    aria-label="Gandakan"
                    title="Gandakan"
                    disabled={proses}
                    onClick={() => gandakan(s.id)}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <HapusTombol
                    judul={`Hapus soal nomor ${i + 1}?`}
                    deskripsi="Soal akan dihapus permanen dan nomor soal sesudahnya dirapikan."
                    aksi={() => hapusSoal(s.id, ujianId)}
                  />
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
