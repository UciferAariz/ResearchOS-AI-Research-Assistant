#!/usr/bin/env bash
# Populates ChromaDB with a topically diverse demo corpus by hitting /api/search
# for a curated set of queries (search auto-indexes results). Run this once the
# backend is up on the GPU notebook so similarity/recommendations have good
# demo material without needing another GPU session.
set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"

QUERIES=(
  "transformer attention mechanism"
  "diffusion models image generation"
  "reinforcement learning from human feedback"
  "graph neural networks"
  "large language model evaluation"
  "retrieval augmented generation"
  "contrastive learning representation"
  "vision transformer image classification"
  "speech recognition deep learning"
  "federated learning privacy"
)

for query in "${QUERIES[@]}"; do
  echo "Indexing: ${query}"
  curl -s -G "${BASE_URL}/api/search" \
    --data-urlencode "q=${query}" \
    --data-urlencode "max_results=12" \
    -o /dev/null -w "  -> HTTP %{http_code}\n"
done

echo "Done. ~$(( ${#QUERIES[@]} * 12 )) papers indexed (fewer if arXiv returned duplicates)."
