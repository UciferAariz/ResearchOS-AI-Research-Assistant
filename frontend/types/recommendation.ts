import type { Paper } from "@/types/paper";

export interface RecommendedPaper {
  paper: Paper;
  similarity: number;
}

export interface RecommendationResponse {
  seed_paper_ids: string[];
  recommendations: RecommendedPaper[];
}
