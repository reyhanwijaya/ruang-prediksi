import katex from "katex";
import { pecahTeks } from "@/lib/pecah-teks";
import { cn } from "@/lib/utils";

/**
 * Teks soal dengan rumus.
 *   $a^2 + b^2 = c^2$     rumus di dalam baris
 *   $$\frac{a}{b}$$       rumus satu baris sendiri
 *   \$                    tanda dolar biasa (mis. harga)
 */

function renderRumus(tex: string, blok: boolean) {
  try {
    return katex.renderToString(tex, {
      displayMode: blok,
      throwOnError: false,
      strict: "ignore",
      trust: false,
      output: "htmlAndMathml",
    });
  } catch {
    return null;
  }
}

export function TeksSoal({
  teks,
  className,
  inline,
}: {
  teks: string;
  className?: string;
  inline?: boolean;
}) {
  const Akar = inline ? "span" : "div";
  return (
    <Akar className={cn("whitespace-pre-wrap break-words", className)}>
      {pecahTeks(teks).map((p, i) => {
        if (p.tipe === "teks") return <span key={i}>{p.isi}</span>;
        const html = renderRumus(p.isi, p.tipe === "blok");
        if (html === null) return <span key={i}>{p.tipe === "blok" ? `$$${p.isi}$$` : `$${p.isi}$`}</span>;
        return p.tipe === "blok" ? (
          <span key={i} className="my-2 block overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
        );
      })}
    </Akar>
  );
}

export function GambarSoal({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Gambar pada soal"
      loading="lazy"
      draggable={false}
      className={cn("max-h-80 max-w-full rounded-xl border border-border bg-white object-contain", className)}
    />
  );
}
