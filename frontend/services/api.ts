import { z } from "zod";
import type { ChatRequest } from "@/types/chat";
import type { ComparisonRequest, ComparisonResult } from "@/types/comparison";
import type { Paper, SearchResponse } from "@/types/paper";
import type { RecommendationResponse } from "@/types/recommendation";
import type { BenchmarkResult, VectorMatch } from "@/types/vector";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set — check your .env.local");
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleErrorResponse(response: Response): Promise<never> {
  let detail = response.statusText;
  let retryable = false;
  try {
    const body = await response.json();
    detail = body?.detail?.detail ?? detail;
    retryable = body?.detail?.retryable ?? false;
  } catch {
    // response wasn't JSON; fall back to statusText
  }
  throw new ApiError(detail, response.status, retryable);
}

const paperSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  abstract: z.string(),
  published: z.string(),
  updated: z.string(),
  pdf_url: z.string(),
  source: z.enum(["arxiv", "pubmed", "upload"]),
});

const searchResponseSchema = z.object({
  query: z.string(),
  count: z.number(),
  papers: z.array(paperSchema),
});

export async function searchPapers(
  query: string,
  maxResults = 10,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const url = new URL("/api/search", API_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("max_results", String(maxResults));

  const response = await fetch(url, { signal });
  if (!response.ok) return handleErrorResponse(response);

  return searchResponseSchema.parse(await response.json());
}

const vectorMatchSchema = z.object({
  id: z.string(),
  document: z.string(),
  metadata: z.record(z.string(), z.string()),
  distance: z.number(),
  similarity: z.number(),
});

export async function getSimilarPapers(
  paperId: string,
  topK = 5,
  signal?: AbortSignal,
): Promise<VectorMatch[]> {
  const url = new URL(`/api/papers/${encodeURIComponent(paperId)}/similar`, API_BASE_URL);
  url.searchParams.set("top_k", String(topK));

  const response = await fetch(url, { signal });
  if (!response.ok) return handleErrorResponse(response);

  return z.array(vectorMatchSchema).parse(await response.json());
}

const benchmarkResultSchema = z.object({
  device: z.string(),
  device_name: z.string(),
  batch_size: z.number(),
  num_texts: z.number(),
  elapsed_ms: z.number(),
  texts_per_sec: z.number(),
});

export async function getPaper(paperId: string, signal?: AbortSignal): Promise<Paper> {
  const url = new URL(`/api/papers/${encodeURIComponent(paperId)}`, API_BASE_URL);

  const response = await fetch(url, { signal });
  if (!response.ok) return handleErrorResponse(response);

  return paperSchema.parse(await response.json());
}

export async function uploadPaper(file: File, signal?: AbortSignal): Promise<Paper> {
  const url = new URL("/api/papers/upload", API_BASE_URL);
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, { method: "POST", body: formData, signal });
  if (!response.ok) return handleErrorResponse(response);

  return paperSchema.parse(await response.json());
}

export function getPaperSummaryStreamUrl(paperId: string): string {
  const url = new URL(`/api/papers/${encodeURIComponent(paperId)}/summary`, API_BASE_URL);
  url.searchParams.set("stream", "true");
  return url.toString();
}

export function buildChatStreamRequest(payload: ChatRequest): { url: string; init: RequestInit } {
  const url = new URL("/api/chat/stream", API_BASE_URL);
  return {
    url: url.toString(),
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  };
}

const paperComparisonNoteSchema = z.object({
  paper_id: z.string(),
  title: z.string(),
  unique_points: z.array(z.string()),
});

const comparisonResultSchema = z.object({
  paper_ids: z.array(z.string()),
  similarities: z.array(z.string()),
  differences: z.array(z.string()),
  per_paper: z.array(paperComparisonNoteSchema),
  generated_at: z.string(),
});

export async function comparePapers(
  paperIds: string[],
  signal?: AbortSignal,
): Promise<ComparisonResult> {
  const url = new URL("/api/compare", API_BASE_URL);
  const payload: ComparisonRequest = { paper_ids: paperIds };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) return handleErrorResponse(response);

  return comparisonResultSchema.parse(await response.json());
}

const recommendationResponseSchema = z.object({
  seed_paper_ids: z.array(z.string()),
  recommendations: z.array(
    z.object({
      paper: paperSchema,
      similarity: z.number(),
    }),
  ),
});

export async function getRecommendations(
  paperIds: string[],
  maxResults = 10,
  signal?: AbortSignal,
): Promise<RecommendationResponse> {
  const url = new URL("/api/recommendations", API_BASE_URL);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paper_ids: paperIds, max_results: maxResults }),
    signal,
  });
  if (!response.ok) return handleErrorResponse(response);

  return recommendationResponseSchema.parse(await response.json());
}

export async function runEmbeddingBenchmark(
  numTexts = 50,
  signal?: AbortSignal,
): Promise<BenchmarkResult> {
  const url = new URL("/api/embeddings/benchmark", API_BASE_URL);
  url.searchParams.set("num_texts", String(numTexts));

  const response = await fetch(url, { method: "POST", signal });
  if (!response.ok) return handleErrorResponse(response);

  return benchmarkResultSchema.parse(await response.json());
}
