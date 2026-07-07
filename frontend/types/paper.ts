export type PaperSource = "arxiv" | "pubmed" | "upload";

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  published: string;
  updated: string;
  pdf_url: string;
  source: PaperSource;
}

export interface SearchResponse {
  query: string;
  count: number;
  papers: Paper[];
}
