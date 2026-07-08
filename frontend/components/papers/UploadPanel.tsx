"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useRef } from "react";
import { useUploadPaper } from "@/hooks/useUploadPaper";

export function UploadPanel() {
  const router = useRouter();
  const { isUploading, error, upload } = useUploadPaper();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const paper = await upload(file);
    if (paper) {
      router.push(`/papers/${encodeURIComponent(paper.id)}`);
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
        aria-label="Upload a PDF"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="h-12 w-full rounded-md border border-dashed px-6 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
      >
        {isUploading ? "Uploading and indexing…" : "Upload a PDF to ask questions about it →"}
      </button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
