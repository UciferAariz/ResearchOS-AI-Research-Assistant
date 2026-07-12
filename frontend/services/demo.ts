/**
 * Demo mode — serves realistic, pre-made data entirely client-side so the
 * hosted site is fully explorable with NO live backend (e.g. once the GPU
 * notebook is offline). Enabled by NEXT_PUBLIC_DEMO_MODE=true at build time.
 *
 * When on, services/api.ts short-circuits every backend call to the canned
 * data below, and the two streaming hooks route through demoFetch(), which
 * returns a mock SSE Response the existing parsers consume unchanged.
 */
import type { ChatRequest, Citation } from "@/types/chat";
import type { ComparisonResult } from "@/types/comparison";
import type { Paper, SearchResponse } from "@/types/paper";
import type { RecommendationResponse } from "@/types/recommendation";
import type { BenchmarkResult, VectorMatch } from "@/types/vector";

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/** Small artificial latency so the UI's loading states are exercised. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface DemoPaper extends Paper {
  /** Drives the summary, comparison table and chat answers. */
  attrs: {
    focus: string;
    method: string;
    benchmark: string;
    result: string;
    limitation: string;
    contributions: string[];
    keywords: string[];
  };
}

// A small, coherent corpus spanning the three homepage suggestions
// (continual learning, retrieval-augmented generation, RLHF/alignment) plus
// the AMD/ROCm GPU-acceleration angle, with a mix of arXiv / PubMed / uploaded
// sources so the Discover filters have something to filter.
const CORPUS: DemoPaper[] = [
  {
    id: "2404.16130",
    title: "Continual Learning of Large Language Models: A Comprehensive Survey",
    authors: ["Zixuan Ke", "Haowei Lin", "Yijia Shao", "Bing Liu"],
    abstract:
      "Large language models (LLMs) are typically frozen after pre-training, yet the world they model keeps changing. This survey organizes the fast-growing literature on continually adapting LLMs into a unified taxonomy spanning continual pre-training, domain-adaptive tuning, and continual instruction tuning. We analyze how methods trade off plasticity against catastrophic forgetting, review evaluation protocols, and highlight open problems in memory, efficiency, and reliable knowledge editing.",
    published: "2024-04-24",
    updated: "2024-05-02",
    pdf_url: "https://arxiv.org/pdf/2404.16130",
    source: "arxiv",
    attrs: {
      focus: "A taxonomy of how LLMs can keep learning after pre-training without forgetting.",
      method: "Survey + taxonomy across continual pre-training, domain tuning and instruction tuning.",
      benchmark: "Aggregates results across TRACE, DACL and continual-QA suites.",
      result: "Frames plasticity-vs-forgetting as the central tension; no single method dominates.",
      limitation: "A survey, not a new method; evaluation protocols across papers are inconsistent.",
      contributions: [
        "Unifies continual-learning work on LLMs into a single three-axis taxonomy.",
        "Separates continual pre-training, domain-adaptive tuning and continual instruction tuning.",
        "Catalogs evaluation protocols and surfaces open problems in memory and knowledge editing.",
      ],
      keywords: ["continual", "learning", "forgetting", "adaptation", "survey", "llm", "pretraining"],
    },
  },
  {
    id: "2312.10997",
    title: "Retrieval-Augmented Generation for Large Language Models: A Survey",
    authors: ["Yunfan Gao", "Yun Xiong", "Xinyu Gao", "Haofen Wang"],
    abstract:
      "Retrieval-augmented generation (RAG) grounds LLM outputs in external knowledge, reducing hallucination and letting models cite up-to-date sources without retraining. We trace RAG's evolution through Naive, Advanced, and Modular paradigms, decompose the pipeline into retrieval, generation, and augmentation stages, and survey the techniques used at each stage. We also review evaluation frameworks and metrics, and outline challenges in retrieval quality, context integration, and end-to-end optimization.",
    published: "2023-12-18",
    updated: "2024-03-27",
    pdf_url: "https://arxiv.org/pdf/2312.10997",
    source: "arxiv",
    attrs: {
      focus: "How retrieval grounds LLM answers in external, up-to-date knowledge.",
      method: "Survey of the retrieval → augmentation → generation pipeline; Naive/Advanced/Modular RAG.",
      benchmark: "Reviews RAG evaluation suites (RGB, RAGAS, retrieval + answer-faithfulness metrics).",
      result: "Modular RAG with better retrieval and re-ranking consistently cuts hallucination.",
      limitation: "Retrieval quality and long-context integration remain the dominant failure modes.",
      contributions: [
        "Organizes RAG into Naive, Advanced and Modular paradigms.",
        "Decomposes the pipeline into retrieval, augmentation and generation stages.",
        "Surveys evaluation metrics for retrieval quality and answer faithfulness.",
      ],
      keywords: ["retrieval", "rag", "augmented", "generation", "grounding", "hallucination", "survey"],
    },
  },
  {
    id: "2203.02155",
    title: "Training Language Models to Follow Instructions with Human Feedback",
    authors: ["Long Ouyang", "Jeff Wu", "Xu Jiang", "Diogo Almeida", "Carroll Wainwright"],
    abstract:
      "Making language models bigger does not make them better at following a user's intent. We fine-tune GPT-3 with human feedback: collecting demonstrations and preference comparisons, training a reward model, and optimizing the policy with reinforcement learning (RLHF). The resulting InstructGPT models, despite having 100x fewer parameters, are preferred by human raters over the 175B GPT-3, and show improvements in truthfulness and reductions in toxic output while retaining performance on public NLP benchmarks.",
    published: "2022-03-04",
    updated: "2022-03-04",
    pdf_url: "https://arxiv.org/pdf/2203.02155",
    source: "arxiv",
    attrs: {
      focus: "Aligning an LLM to human intent with reinforcement learning from human feedback.",
      method: "Supervised demos → reward model on preferences → PPO policy optimization (RLHF).",
      benchmark: "Human preference win-rate vs GPT-3, plus TruthfulQA and toxicity evals.",
      result: "1.3B InstructGPT is preferred over 175B GPT-3; more truthful, less toxic.",
      limitation: "Alignment reflects the labelers' preferences; reward hacking and 'alignment tax' persist.",
      contributions: [
        "Demonstrates RLHF makes small models beat a 100x larger base model on intent-following.",
        "Introduces the demos → reward model → PPO recipe now standard for alignment.",
        "Shows gains in truthfulness and toxicity with little regression on NLP benchmarks.",
      ],
      keywords: ["rlhf", "alignment", "human", "feedback", "instruction", "reward", "preference", "ppo"],
    },
  },
  {
    id: "2305.18290",
    title: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
    authors: ["Rafael Rafailov", "Archit Sharma", "Eric Mitchell", "Stefano Ermon", "Chelsea Finn"],
    abstract:
      "Reinforcement learning from human feedback is effective but complex and unstable, requiring a separate reward model and on-policy sampling. We show that the RLHF objective has a closed-form optimum that can be reached by a simple classification loss directly on preference data. Direct Preference Optimization (DPO) removes the reward model and RL loop entirely, is stable and lightweight to train, and matches or exceeds PPO-based RLHF on sentiment, summarization, and dialogue.",
    published: "2023-05-29",
    updated: "2023-12-13",
    pdf_url: "https://arxiv.org/pdf/2305.18290",
    source: "arxiv",
    attrs: {
      focus: "Aligning to preferences without a reward model or reinforcement learning.",
      method: "Reparameterizes the RLHF optimum as a single classification loss on preference pairs (DPO).",
      benchmark: "IMDb sentiment, TL;DR summarization, Anthropic-HH dialogue vs PPO.",
      result: "Matches or beats PPO-based RLHF while being far simpler and more stable.",
      limitation: "Still needs paired preference data; can over-fit the reference model's distribution.",
      contributions: [
        "Derives a closed-form solution to the RLHF objective.",
        "Replaces reward-model + RL with one stable classification loss (DPO).",
        "Matches PPO RLHF on summarization and dialogue with less compute.",
      ],
      keywords: ["dpo", "preference", "alignment", "rlhf", "reward", "optimization", "fine-tuning"],
    },
  },
  {
    id: "2310.11511",
    title: "Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection",
    authors: ["Akari Asai", "Zeqiu Wu", "Yizhong Wang", "Avirup Sil", "Hannaneh Hajishirzi"],
    abstract:
      "Standard RAG retrieves a fixed number of passages regardless of whether they help, which can dilute answers with irrelevant context. Self-RAG trains a single model to adaptively decide when to retrieve and to critique its own generations with special reflection tokens that judge relevance, support, and usefulness. This lets the model retrieve on demand and cite only supporting evidence, improving factuality and citation accuracy over strong RAG and ChatGPT baselines across open-domain QA, reasoning, and long-form generation.",
    published: "2023-10-17",
    updated: "2023-10-17",
    pdf_url: "https://arxiv.org/pdf/2310.11511",
    source: "arxiv",
    attrs: {
      focus: "Letting a model decide when to retrieve and critique its own citations.",
      method: "Trains reflection tokens for adaptive retrieval and self-critique of relevance/support.",
      benchmark: "Open-domain QA, reasoning and long-form generation vs RAG and ChatGPT.",
      result: "Higher factuality and citation accuracy than fixed-passage RAG baselines.",
      limitation: "Requires training data annotated with reflection tokens; adds inference overhead.",
      contributions: [
        "Introduces on-demand, adaptive retrieval instead of always retrieving k passages.",
        "Adds self-critique reflection tokens judging relevance, support and usefulness.",
        "Improves citation accuracy and factuality over strong RAG baselines.",
      ],
      keywords: ["rag", "retrieval", "self", "reflection", "citation", "factuality", "critique"],
    },
  },
  {
    id: "2308.08747",
    title: "Continual Pre-Training of Large Language Models: How to Re-warm Your Model?",
    authors: ["Kshitij Gupta", "Benjamin Thérien", "Adam Ibrahim", "Irina Rish"],
    abstract:
      "As new data arrives, re-training an LLM from scratch is prohibitively expensive, so practitioners continue pre-training existing checkpoints. We study the learning-rate schedule for this setting and find that naively resuming training causes a loss spike and forgetting. Re-warming the learning rate and then re-decaying it, combined with a small replay buffer of prior data, recovers the performance of full re-training at a fraction of the compute, offering a practical recipe for keeping foundation models up to date.",
    published: "2023-08-17",
    updated: "2023-08-17",
    pdf_url: "https://arxiv.org/pdf/2308.08747",
    source: "arxiv",
    attrs: {
      focus: "A learning-rate recipe for cheaply continuing pre-training on new data.",
      method: "Re-warm then re-decay the LR with a small replay buffer of prior data.",
      benchmark: "Pile → new-domain continual pre-training; loss and downstream retention.",
      result: "Recovers full-retrain quality at a fraction of the compute.",
      limitation: "Studied at moderate scale; optimal replay ratio is dataset-dependent.",
      contributions: [
        "Shows naive resumption causes a loss spike and forgetting.",
        "Proposes re-warming + re-decaying the learning rate with light replay.",
        "Matches from-scratch re-training far more cheaply.",
      ],
      keywords: ["continual", "pretraining", "learning", "rate", "forgetting", "replay", "efficiency"],
    },
  },
  {
    id: "2401.08281",
    title: "Efficient Transformer Inference on AMD GPUs with ROCm and Composable Kernel",
    authors: ["Wei Chen", "Priya Nair", "Anders Larsson", "Diego Fernández"],
    abstract:
      "We present an inference stack for transformer models targeting AMD Instinct and Radeon GPUs through the ROCm software platform. Using the Composable Kernel library for fused attention and GEMM, HIP-ported FlashAttention, and paged KV-cache management, we close most of the gap to comparable NVIDIA hardware on batched embedding and generation workloads. On sentence-embedding throughput the ROCm path reaches over 90% of the reference stack while running fully open-source, showing that AMD accelerators are a practical option for retrieval and RAG serving.",
    published: "2024-01-16",
    updated: "2024-02-01",
    pdf_url: "https://arxiv.org/pdf/2401.08281",
    source: "arxiv",
    attrs: {
      focus: "Fast transformer inference on AMD GPUs via the open ROCm stack.",
      method: "Composable Kernel fused attention/GEMM, HIP FlashAttention, paged KV-cache.",
      benchmark: "Batched sentence-embedding and generation throughput vs an NVIDIA reference.",
      result: "Reaches >90% of the reference stack while staying fully open-source.",
      limitation: "Kernel coverage is model-specific; some ops still fall back to slower paths.",
      contributions: [
        "An end-to-end ROCm inference path for transformer embedding + generation.",
        "Uses Composable Kernel and HIP-ported FlashAttention for fused attention.",
        "Shows AMD accelerators are viable for production RAG serving.",
      ],
      keywords: ["amd", "rocm", "gpu", "inference", "embedding", "throughput", "flashattention", "hip"],
    },
  },
  {
    id: "pubmed-37845678",
    title: "Continual Learning from Electronic Health Records with Large Language Models: A Clinical Evaluation",
    authors: ["Sarah J. Mitchell", "Rohan Patel", "Elena Volkova", "James O'Connor"],
    abstract:
      "Clinical language shifts as coding standards, treatments, and populations change, degrading models trained on historical electronic health records. In a multi-site study we evaluate continual fine-tuning strategies for clinical LLMs on phenotyping and readmission-prediction tasks across three years of records. Rehearsal with a de-identified memory buffer best preserves earlier-year performance while adapting to new data, and we discuss governance and privacy constraints specific to deploying continually learning models in healthcare.",
    published: "2024-02-09",
    updated: "2024-02-09",
    pdf_url: "https://pubmed.ncbi.nlm.nih.gov/37845678/",
    source: "pubmed",
    attrs: {
      focus: "Continually adapting clinical LLMs to shifting EHR data without forgetting.",
      method: "Compares rehearsal, regularization and naive fine-tuning across 3 years of records.",
      benchmark: "Multi-site phenotyping and 30-day readmission prediction.",
      result: "A de-identified rehearsal buffer best balances new adaptation and old retention.",
      limitation: "Privacy governance limits buffer size; results are site-specific.",
      contributions: [
        "Evaluates continual learning for clinical LLMs in a real multi-site setting.",
        "Shows de-identified rehearsal preserves earlier-year performance best.",
        "Frames privacy and governance constraints for healthcare deployment.",
      ],
      keywords: ["continual", "clinical", "ehr", "healthcare", "rehearsal", "forgetting", "learning"],
    },
  },
];

/** Case-insensitive keyword overlap between a query and a paper. */
function relevance(query: string, paper: DemoPaper): number {
  const q = query.toLowerCase();
  const terms = q.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  let score = 0;
  for (const term of terms) {
    if (paper.title.toLowerCase().includes(term)) score += 3;
    if (paper.attrs.keywords.some((k) => k.includes(term) || term.includes(k))) score += 2;
    if (paper.abstract.toLowerCase().includes(term)) score += 1;
  }
  return score;
}

function stripAttrs(paper: DemoPaper): Paper {
  const { attrs: _attrs, ...rest } = paper;
  return rest;
}

function resolvePaper(id: string): DemoPaper {
  const found = CORPUS.find((p) => p.id === id);
  if (found) return found;
  // Unknown id (e.g. a freshly "uploaded" paper) — synthesize something
  // plausible so no screen ever hits an error in demo mode.
  return {
    id,
    title: id.startsWith("upload-")
      ? "Uploaded manuscript"
      : `Paper ${id}`,
    authors: ["A. Researcher", "B. Coauthor"],
    abstract:
      "This document was added to your library. Its full text has been embedded and indexed, so you can summarize it, ask the assistant grounded questions about it, and compare it against other papers in your corpus.",
    published: "2024-06-01",
    updated: "2024-06-01",
    pdf_url: "https://arxiv.org/",
    source: id.startsWith("pubmed") ? "pubmed" : id.startsWith("upload") ? "upload" : "arxiv",
    attrs: {
      focus: "A user-provided document indexed into the corpus.",
      method: "Chunked, embedded, and stored in the vector index like any other source.",
      benchmark: "n/a",
      result: "Available for summary, chat, comparison and recommendations.",
      limitation: "Demo placeholder metadata.",
      contributions: ["Added to the searchable corpus."],
      keywords: ["upload"],
    },
  };
}

// ---------------------------------------------------------------------------
// Non-streaming endpoints (called from services/api.ts)
// ---------------------------------------------------------------------------

export async function demoSearch(query: string, maxResults: number): Promise<SearchResponse> {
  await delay(420);
  const ranked = [...CORPUS]
    .map((p) => ({ p, score: relevance(query, p) }))
    .sort((a, b) => b.score - a.score || +new Date(b.p.published) - +new Date(a.p.published));
  const anyMatch = ranked.some((r) => r.score > 0);
  const papers = (anyMatch ? ranked.filter((r) => r.score > 0) : ranked)
    .slice(0, maxResults)
    .map((r) => stripAttrs(r.p));
  return { query, count: papers.length, papers };
}

export async function demoGetPaper(paperId: string): Promise<Paper> {
  await delay(280);
  return stripAttrs(resolvePaper(paperId));
}

export async function demoSimilar(paperId: string, topK: number): Promise<VectorMatch[]> {
  await delay(340);
  const seed = resolvePaper(paperId);
  return CORPUS.filter((p) => p.id !== paperId)
    .map((p) => ({ p, score: relevance(seed.attrs.keywords.join(" ") + " " + seed.title, p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ p }, i) => {
      const similarity = Math.round((0.86 - i * 0.06) * 1000) / 1000;
      return {
        id: p.id,
        document: p.abstract.slice(0, 220) + "…",
        metadata: {
          title: p.title,
          authors: p.authors.join(", "),
          source: p.source,
          published: p.published,
        },
        distance: Math.round((1 - similarity) * 1000) / 1000,
        similarity,
      };
    });
}

export async function demoUpload(file: File): Promise<Paper> {
  await delay(1100);
  const base = file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
  const title = base
    ? base.replace(/\b\w/g, (c) => c.toUpperCase())
    : "Uploaded manuscript";
  const now = new Date().toISOString().slice(0, 10);
  return {
    id: `upload-${Date.now().toString(36)}`,
    title,
    authors: ["Uploaded by you"],
    abstract:
      "Your PDF has been parsed, chunked, and embedded into the vector index. You can now open it to read an AI summary, ask the assistant questions grounded in its text, and compare it against other papers in your corpus.",
    published: now,
    updated: now,
    pdf_url: "#",
    source: "upload",
  };
}

export async function demoCompare(paperIds: string[]): Promise<ComparisonResult> {
  await delay(950);
  const papers = paperIds.map(resolvePaper);
  const dim = (label: string, pick: (p: DemoPaper) => string) => ({
    label,
    values: papers.map(pick),
  });
  return {
    paper_ids: paperIds,
    papers: papers.map((p) => ({
      paper_id: p.id,
      title: p.title,
      authors: p.authors,
      source: p.source,
    })),
    dimensions: [
      dim("Core focus", (p) => p.attrs.focus),
      dim("Method", (p) => p.attrs.method),
      dim("Evaluation", (p) => p.attrs.benchmark),
      dim("Headline result", (p) => p.attrs.result),
      dim("Main limitation", (p) => p.attrs.limitation),
    ],
    assistant_take:
      papers.length === 2
        ? `Both papers tackle the same broad goal but from different angles. ${papers[0].title.split(":")[0]} emphasizes ${lower(papers[0].attrs.focus)}, whereas ${papers[1].title.split(":")[0]} focuses on ${lower(papers[1].attrs.focus)}. If you care most about simplicity and reproducibility, the second is the easier starting point; if you need breadth of coverage, start with the first and use the second to go deeper.`
        : `These ${papers.length} papers form a coherent reading path: start with the survey for framing, then drill into the method papers. The clearest through-line is the trade-off between capability and cost — each work moves the frontier on one axis while conceding ground on another.`,
    generated_at: new Date().toISOString(),
  };
}

export async function demoRecommendations(
  paperIds: string[],
  maxResults: number,
): Promise<RecommendationResponse> {
  await delay(520);
  const seeds = paperIds.map(resolvePaper);
  const seedText = seeds.map((s) => s.attrs.keywords.join(" ") + " " + s.title).join(" ");
  const recommendations = CORPUS.filter((p) => !paperIds.includes(p.id))
    .map((p) => ({ p, score: relevance(seedText, p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ p }, i) => ({
      paper: stripAttrs(p),
      similarity: Math.round((0.83 - i * 0.05) * 1000) / 1000,
    }));
  return { seed_paper_ids: paperIds, recommendations };
}

export async function demoBenchmark(numTexts: number): Promise<BenchmarkResult> {
  await delay(700);
  // Realistic AMD ROCm embedding throughput (all-MiniLM-L6-v2 class model).
  const textsPerSec = 232.4;
  const elapsedMs = Math.round((numTexts / textsPerSec) * 1000 * 10) / 10;
  return {
    device: "cuda", // torch reports ROCm devices under the cuda namespace
    device_name: "AMD Radeon RX 7900 XTX (gfx1100, ROCm 6.1)",
    batch_size: 32,
    num_texts: numTexts,
    elapsed_ms: elapsedMs,
    texts_per_sec: textsPerSec,
  };
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, "");
}

// ---------------------------------------------------------------------------
// Streaming endpoints (routed through the two streaming hooks via demoFetch)
// ---------------------------------------------------------------------------

/**
 * Builds an SSE ReadableStream matching the backend's framing so the existing
 * fetch-based parsers in useChatStream / useStreamingCompletion work unchanged.
 * NOTE: the client parser reads a single `data:` line per event, so no chunk
 * may contain a newline — mirroring the live app's token stream.
 */
function sseResponse(
  events: { event: string; data: string; delay?: number }[],
  signal?: AbortSignal | null,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const ev of events) {
        if (signal?.aborted) break;
        if (ev.delay) await delay(ev.delay);
        controller.enqueue(encoder.encode(`event: ${ev.event}\ndata: ${ev.data}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

/** Split prose into stream chunks, preserving single spaces, no newlines. */
function tokenize(text: string, perTokenDelay = 18): { event: string; data: string; delay: number }[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  return words.map((w, i) => ({
    event: "token",
    data: i === 0 ? w : ` ${w}`,
    delay: perTokenDelay,
  }));
}

function summaryText(p: DemoPaper): string {
  const contribs = p.attrs.contributions.map((c) => lower(c)).join("; ");
  return (
    `This paper focuses on ${lower(p.attrs.focus)} ` +
    `Its core approach: ${lower(p.attrs.method)} ` +
    `The main contributions are: ${contribs}. ` +
    `Empirically, ${lower(p.attrs.result)} evaluated via ${lower(p.attrs.benchmark)} ` +
    `The chief limitation to keep in mind is that ${lower(p.attrs.limitation)} ` +
    `In short, it is a solid reference point for anyone working on ${p.attrs.keywords.slice(0, 3).join(", ")}.`
  );
}

function chatAnswer(message: string, cited: DemoPaper[]): string {
  const topic = message.trim().replace(/\?+$/, "");
  return (
    `Grounded in your indexed papers, here is what the literature says about ${lower(topic)}. ` +
    `${cited[0].title.split(":")[0]} [1] establishes that ${lower(cited[0].attrs.result)} ` +
    `Building on this, ${cited[1].title.split(":")[0]} [2] shows that ${lower(cited[1].attrs.result)} ` +
    (cited[2]
      ? `A third thread, ${cited[2].title.split(":")[0]} [3], adds that ${lower(cited[2].attrs.result)} `
      : "") +
    `The practical takeaway is that the strongest results come from combining these ideas, while the shared open problem remains ${lower(cited[0].attrs.limitation)} ` +
    `See the cited passages below for the exact evidence.`
  );
}

function citationsFor(message: string): { cited: DemoPaper[]; citations: Citation[] } {
  const ranked = [...CORPUS]
    .map((p) => ({ p, score: relevance(message, p) }))
    .sort((a, b) => b.score - a.score);
  const anyMatch = ranked.some((r) => r.score > 0);
  const cited = (anyMatch ? ranked.filter((r) => r.score > 0) : ranked).slice(0, 3).map((r) => r.p);
  const citations: Citation[] = cited.map((p, i) => ({
    index: i + 1,
    paper_id: p.id,
    title: p.title,
    snippet: p.abstract.slice(0, 180) + "…",
    similarity: Math.round((0.84 - i * 0.07) * 1000) / 1000,
    page: null,
  }));
  return { cited, citations };
}

/**
 * Mock replacement for fetch() used only by the two streaming hooks in demo
 * mode. Routes by URL path to a canned SSE stream.
 */
export async function demoFetch(url: string, init?: RequestInit): Promise<Response> {
  const path = safePath(url);
  const signal = init?.signal ?? null;

  if (path.includes("/api/chat/stream")) {
    let message = "your question";
    try {
      const body = JSON.parse((init?.body as string) ?? "{}") as ChatRequest;
      if (body.message) message = body.message;
    } catch {
      /* keep default */
    }
    const { cited, citations } = citationsFor(message);
    const events = [
      { event: "citations", data: JSON.stringify(citations), delay: 260 },
      ...tokenize(chatAnswer(message, cited)),
      { event: "done", data: "" },
    ];
    return sseResponse(events, signal);
  }

  // Paper summary: /api/papers/:id/summary?stream=true
  const summaryMatch = path.match(/\/api\/papers\/([^/]+)\/summary/);
  if (summaryMatch) {
    const paper = resolvePaper(decodeURIComponent(summaryMatch[1]));
    const events = [...tokenize(summaryText(paper), 16), { event: "done", data: "" }];
    return sseResponse(events, signal);
  }

  return new Response("Not found", { status: 404 });
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
