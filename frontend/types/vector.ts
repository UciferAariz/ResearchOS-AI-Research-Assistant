export interface VectorMatch {
  id: string;
  document: string;
  metadata: Record<string, string>;
  distance: number;
  similarity: number;
}

export interface BenchmarkResult {
  device: string;
  device_name: string;
  batch_size: number;
  num_texts: number;
  elapsed_ms: number;
  texts_per_sec: number;
}
