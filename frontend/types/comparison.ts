export interface ComparisonRequest {
  paper_ids: string[];
}

export interface PaperComparisonNote {
  paper_id: string;
  title: string;
  unique_points: string[];
}

export interface ComparisonResult {
  paper_ids: string[];
  similarities: string[];
  differences: string[];
  per_paper: PaperComparisonNote[];
  generated_at: string;
}
