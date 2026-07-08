"use client";

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
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl flex-col gap-3">
      {paperIds.map((id, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={id}
            onChange={(e) => updateId(index, e.target.value)}
            placeholder={`arXiv ID (e.g. 2501.00005)`}
            aria-label={`Paper ${index + 1} arXiv ID`}
          />
          {paperIds.length > MIN_PAPERS && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeField(index)}
              aria-label={`Remove paper ${index + 1}`}
            >
              ✕
            </Button>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addField}
          disabled={paperIds.length >= MAX_PAPERS}
        >
          Add another paper
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {isLoading ? "Comparing…" : "Compare"}
        </Button>
      </div>
    </form>
  );
}
