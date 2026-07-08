"use client";

import { Plus, Scale, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ComparisonFormProps {
  onCompare: (paperIds: string[]) => void;
  isLoading: boolean;
}

const MIN_PAPERS = 2;
const MAX_PAPERS = 5;

export function ComparisonForm({ onCompare, isLoading }: ComparisonFormProps) {
  const [paperIds, setPaperIds] = useState<string[]>(["", ""]);

  const trimmedIds = paperIds.map((id) => id.trim()).filter(Boolean);
  const canSubmit = trimmedIds.length >= MIN_PAPERS && !isLoading;

  function updateId(index: number, value: string) {
    setPaperIds((prev) => prev.map((id, i) => (i === index ? value : id)));
  }

  function addField() {
    setPaperIds((prev) => (prev.length < MAX_PAPERS ? [...prev, ""] : prev));
  }

  function removeField(index: number) {
    setPaperIds((prev) => (prev.length > MIN_PAPERS ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onCompare(trimmedIds);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl space-y-3 rounded-2xl border border-border/60 bg-secondary/20 p-5"
    >
      <div className="space-y-2.5">
        {paperIds.map((id, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-secondary text-xs font-semibold text-background">
              {index + 1}
            </span>
            <Input
              value={id}
              onChange={(e) => updateId(index, e.target.value)}
              placeholder="arXiv ID (e.g. 2501.00005)"
              className="h-10 rounded-lg"
              aria-label={`Paper ${index + 1} arXiv ID`}
            />
            {paperIds.length > MIN_PAPERS && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeField(index)}
                aria-label={`Remove paper ${index + 1}`}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addField}
          disabled={paperIds.length >= MAX_PAPERS}
        >
          <Plus className="size-3.5" />
          Add another paper
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit}
          className="bg-gradient-to-br from-brand to-brand-secondary text-background hover:opacity-90"
        >
          <Scale className="size-3.5" />
          {isLoading ? "Comparing…" : "Compare"}
        </Button>
      </div>
    </form>
  );
}
