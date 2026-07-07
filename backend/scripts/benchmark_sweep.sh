#!/usr/bin/env bash
# Sweeps the embedding benchmark endpoint across batch sizes and devices,
# writing one JSON array to gpu_benchmark_results.json — this becomes the
# README/demo-script evidence for the mandatory AMD GPU usage criterion.
set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"
OUT_FILE="${2:-gpu_benchmark_results.json}"

NUM_TEXTS_VALUES=(10 50 200 500)
DEVICES=("cuda" "cpu")

echo "[" > "${OUT_FILE}"
first=true

for num_texts in "${NUM_TEXTS_VALUES[@]}"; do
  for device in "${DEVICES[@]}"; do
    echo "Benchmarking num_texts=${num_texts} device=${device}..."
    result=$(curl -s -X POST -G "${BASE_URL}/api/embeddings/benchmark" \
      --data-urlencode "num_texts=${num_texts}" \
      --data-urlencode "device=${device}")

    if [ "${first}" = false ]; then
      echo "," >> "${OUT_FILE}"
    fi
    first=false
    echo -n "${result}" >> "${OUT_FILE}"
    echo "  -> ${result}"
  done
done

echo "]" >> "${OUT_FILE}"
echo "Wrote sweep results to ${OUT_FILE}"
