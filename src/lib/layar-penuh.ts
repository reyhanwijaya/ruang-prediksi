// Pembantu Fullscreen API. iPhone (Safari/Chrome iOS) tidak mendukungnya untuk halaman web,
// jadi dukungan dideteksi lewat fitur, bukan lewat nama perangkat.

type DokumenFS = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type ElemenFS = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

export function layarPenuhDidukung(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as ElemenFS;
  return typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function";
}

export function sedangLayarPenuh(): boolean {
  const d = document as DokumenFS;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}

export async function masukLayarPenuh(): Promise<void> {
  const el = document.documentElement as ElemenFS;
  if (el.requestFullscreen) await el.requestFullscreen();
  else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
}

export async function keluarLayarPenuh(): Promise<void> {
  if (!sedangLayarPenuh()) return;
  const d = document as DokumenFS;
  try {
    if (d.exitFullscreen) await d.exitFullscreen();
    else if (d.webkitExitFullscreen) await d.webkitExitFullscreen();
  } catch {
    /* sudah keluar */
  }
}
