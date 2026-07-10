"use client";

import { cleanLatex } from "@/lib/latex";

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

export function StreamingText({ text, isStreaming }: StreamingTextProps) {
  const lines = text.split("\n").filter((l, i, arr) => l.trim() !== "" || i === arr.length - 1);

  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("## ")) {
          return (
            <p key={i} className="pt-2 font-serif text-[15px] font-medium text-foreground first:pt-0">
              {cleanLatex(trimmed.slice(3))}
            </p>
          );
        }
        // Render leading list markers (-, •, *, "1.") as the design's dot bullets.
        const bullet = trimmed.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/);
        if (bullet) {
          return (
            <div key={i} className="flex gap-3">
              <span className="mt-[9px] size-1.5 flex-none rounded-full bg-brand" />
              <p className="text-[14.5px] leading-relaxed text-foreground/85">{cleanLatex(bullet[1])}</p>
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-foreground/85">
            {cleanLatex(trimmed)}
          </p>
        );
      })}
      {isStreaming && (
        <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-muted-foreground align-middle" />
      )}
    </div>
  );
}
