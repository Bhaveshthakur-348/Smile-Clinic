"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { getUploadUrl, saveMedia } from "@/app/admin/actions";
import { btn } from "@/components/admin/ui";

/** Downscale big photos in the browser before upload (keeps pages fast on mobile data). */
async function compress(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 400_000) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.82 });
  return new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" });
}

export function Uploader({ section }: { section: string }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    for (const [i, original] of [...files].entries()) {
      setStatus(`Uploading ${i + 1} of ${files.length}…`);
      const file = await compress(original).catch(() => original);
      const start = await getUploadUrl(file.name, file.type, file.size);
      if ("error" in start) { setStatus(`${original.name}: ${start.error}`); return; }
      const { error } = await supabaseBrowser().storage.from("media").uploadToSignedUrl(start.path, start.token, file, { contentType: file.type });
      if (error) { setStatus(`${original.name}: upload failed`); return; }
      await saveMedia({ path: start.path, kind: start.kind as "image" | "video", section, title: original.name.replace(/\.\w+$/, "") });
    }
    setStatus("Uploaded");
    if (ref.current) ref.current.value = "";
    router.refresh();
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
      className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-dashed bg-white p-6 ${drag ? "border-brand-600 bg-brand-50" : "border-brand-300"}`}
    >
      <div className="flex flex-col gap-1">
        <span className="font-bold">Drag photos or videos here</span>
        <span className="text-[13px] text-muted">JPG, PNG, WebP up to 10 MB (auto-compressed) · MP4 up to 200 MB</span>
        {status && <span role="status" className="text-[13px] font-semibold text-brand-600">{status}</span>}
      </div>
      <label className={`${btn} cursor-pointer`}>
        Choose files
        <input ref={ref} type="file" accept="image/*,video/mp4,video/webm" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
      </label>
    </div>
  );
}
