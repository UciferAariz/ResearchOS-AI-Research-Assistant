"use client";

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

export function StreamingText({ text, isStreaming }: StreamingTextProps) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) =>
        line.startsWith("## ") ? (
          <p key={i} className="pt-3 text-sm font-semibold text-foreground first:pt-0">
            {line.slice(3)}
          </p>
        ) : (
          <p key={i} className="whitespace-pre-wrap text-muted-foreground">
            {line}
          </p>
        ),
      )}
      {isStreaming && (
        <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-muted-foreground align-middle" />
      )}
    </div>
  );
}
