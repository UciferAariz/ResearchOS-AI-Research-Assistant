export interface ComparisonRequest {
  paper_ids: string[];
}

export interface ComparisonPaperSummary {
  paper_id: string;
  title: string;
  authors: string[];
  source: "arxiv" | "pubmed" | "upload";
}

export interface ComparisonDimension {
  label: string;
  /** One value per paper, aligned with `ComparisonResult.paper_ids` order. */
  values: string[];
}

export interface ComparisonResult {
  paper_ids: string[];
  papers: ComparisonPaperSummary[];
  dimensions: ComparisonDimension[];
  assistant_take: string;
  generated_at: string;
}
