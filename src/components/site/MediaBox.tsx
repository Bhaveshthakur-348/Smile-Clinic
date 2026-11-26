import type { Media } from "@/db/schema";

function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m?.[1] ?? null;
}

/** Renders an uploaded image/video, or a soft placeholder when the clinic hasn't added one yet. */
export function MediaBox({ item, placeholder, className = "" }: { item?: Media; placeholder: string; className?: string }) {
  const box = `overflow-hidden rounded-3xl bg-brand-200 ${className}`;
  if (!item) {
    return (
      <div className={`${box} flex items-center justify-center border-2 border-dashed border-brand-300 p-4 text-center text-sm font-semibold text-[#3e6e6b]`}>
        {placeholder}
      </div>
    );
  }
  if (item.kind === "video") {
    const yt = youtubeId(item.url);
    return yt ? (
      <iframe
        className={box}
        src={`https://www.youtube-nocookie.com/embed/${yt}`}
        title={item.title || item.alt || "Clinic video"}
        loading="lazy"
        allow="accelerometer; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    ) : (
      <video className={`${box} object-cover`} src={item.url} controls preload="metadata" aria-label={item.alt || item.title} />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`${box} object-cover`} src={item.url} alt={item.alt} loading="lazy" />;
}
