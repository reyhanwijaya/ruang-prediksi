import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Ujian",
  robots: { index: false, follow: false },
};

// Halaman ujian sengaja tanpa menu/sidebar agar fokus dan bisa tampil layar penuh.
export default async function LayoutUjian({ children }: { children: React.ReactNode }) {
  await requireProfile();
  return <div className="min-h-dvh bg-muted/40">{children}</div>;
}
