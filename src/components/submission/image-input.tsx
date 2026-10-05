"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { formatBytes } from "@/lib/format";

/** File input with a local preview. The file is only uploaded when the form is submitted. */
export function ImageInput({ id = "image", name = "image" }: { id?: string; name?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const urlRef = useRef<string | null>(null);

  // Release the preview URL when the component unmounts.
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <label
        htmlFor={id}
        className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border-strong bg-zinc-50 text-xs text-ink-subtle hover:border-brand-500 hover:text-ink sm:w-56"
      >
        {preview && file ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected creative preview" className="h-full w-full rounded-md object-contain p-1" />
        ) : (
          <>
            <ImagePlus className="size-5" aria-hidden />
            <span>Choose image</span>
            <span className="text-[11px]">PNG, JPEG, WebP, GIF · max 4 MB</span>
          </>
        )}
      </label>
      <input
        id={id}
        name={name}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = f ? URL.createObjectURL(f) : null;
          setFile(f);
          setPreview(urlRef.current);
        }}
      />
      {file && (
        <div className="text-xs text-ink-muted">
          <p className="font-medium text-ink">{file.name}</p>
          <p>{formatBytes(file.size)}</p>
          {file.size > 4 * 1024 * 1024 && (
            <p className="mt-1 text-red-600">This file is larger than 4 MB and will be rejected.</p>
          )}
        </div>
      )}
    </div>
  );
}
