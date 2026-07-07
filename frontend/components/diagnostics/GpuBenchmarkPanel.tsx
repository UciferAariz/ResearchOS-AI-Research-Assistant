"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGpuBenchmark } from "@/hooks/useGpuBenchmark";

export function GpuBenchmarkPanel() {
  const { result, isLoading, error, runBenchmark } = useGpuBenchmark();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm">AMD GPU Embedding Benchmark</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <button
          type="button"
          onClick={() => runBenchmark(50)}
          disabled={isLoading}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isLoading ? "Running…" : "Run benchmark (50 texts)"}
        </button>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {result && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <dt>Device</dt>
            <dd>
              <Badge variant="secondary">{result.device_name}</Badge>
            </dd>
            <dt>Batch size</dt>
            <dd>{result.batch_size}</dd>
            <dt>Elapsed</dt>
            <dd>{result.elapsed_ms.toFixed(1)} ms</dd>
            <dt>Throughput</dt>
            <dd>{result.texts_per_sec.toFixed(1)} texts/sec</dd>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
