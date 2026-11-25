import { BookOpenCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, ukuran = "md" }: { className?: string; ukuran?: "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-xl bg-primary-soft text-primary-deep",
          ukuran === "lg" ? "size-14 rounded-2xl" : "size-9",
        )}
      >
        <BookOpenCheck className={ukuran === "lg" ? "size-8" : "size-5"} />
      </span>
      <span className={cn("font-extrabold tracking-tight text-primary-deep", ukuran === "lg" ? "text-2xl" : "text-base")}>
        Ruang Prediksi
      </span>
    </span>
  );
}

export const TEKS_FOOTER =
  "Soal di Ruang Prediksi disusun sebagai bahan latihan dan tidak menjamin soal yang sama muncul dalam ujian resmi.";
