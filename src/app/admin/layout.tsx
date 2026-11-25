import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin Ruang Prediksi" },
  robots: { index: false, follow: false },
};

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell nama={admin.nama}>{children}</AdminShell>;
}
