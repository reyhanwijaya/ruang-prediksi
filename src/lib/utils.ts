import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { JenisSoal, StatusKonten } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Alfabet kode ujian: A-Z dan 2-9 tanpa 0, 1, O, I, L (31 karakter). */
export const KODE_ALFABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const HURUF_OPSI = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export const STATUS_LABEL: Record<StatusKonten, string> = {
  draf: "Draf",
  terbit: "Terbit",
  arsip: "Arsip",
};

export const JENIS_LABEL: Record<JenisSoal, string> = {
  pilihan_ganda: "Pilihan ganda",
  isian: "Isian",
  esai: "Esai",
};

/** Huruf kapital, hanya karakter yang sah, maksimal 8. */
export function bersihkanKode(nilai: string) {
  return nilai
    .toUpperCase()
    .split("")
    .filter((c) => KODE_ALFABET.includes(c))
    .join("")
    .slice(0, 8);
}

export function formatTanggal(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export function namaDepan(nama?: string | null, email?: string | null) {
  const sumber = (nama && nama.trim()) || (email ? email.split("@")[0] : "") || "Teman";
  return sumber.split(/\s+/)[0];
}

export function potong(teks: string, maks = 120) {
  const rapi = teks.replace(/\s+/g, " ").trim();
  return rapi.length > maks ? rapi.slice(0, maks - 1) + "…" : rapi;
}

export function inisial(nama?: string | null, email?: string | null) {
  return namaDepan(nama, email).slice(0, 1).toUpperCase();
}

/** Awalan alamat gambar soal yang sah (bucket soal-gambar milik project ini). */
export function awalanGambarSah() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/soal-gambar/`;
}
