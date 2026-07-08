export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface Citation {
  index: number;
  paper_id: string;
  title: string;
  snippet: string;
  similarity: number;
}

export interface ChatRequest {
  message: string;
  history: ChatTurn[];
  paper_id?: string | null;
  top_k?: number;
}
