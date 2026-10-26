#!/usr/bin/env bash
# A week of notes, a question that needs three of them, and the answer after
# one note is forgotten.
#
# Runs on the script in week.json, with no model, by default:
#
#   cortex/cli/demo/session.sh
#
# Runs on Ollama on your machine when CORTEX_OLLAMA_MODEL names a chat model:
#
#   CORTEX_OLLAMA_MODEL=qwen3:1.7b CORTEX_OLLAMA_EMBED_MODEL=nomic-embed-text \
#     cortex/cli/demo/session.sh
#
# CORTEX names the binary, and CORTEX_STORE the store, which is a new SQLite
# file in a temporary directory unless it is set.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cortex="${CORTEX:-cortex}"
scratch=""
if [[ -z "${CORTEX_STORE:-}" ]]; then
  scratch="$(mktemp -d)"
  trap 'rm -rf "$scratch"' EXIT
  export CORTEX_STORE="$scratch/cortex.db"
fi

if [[ -n "${CORTEX_OLLAMA_MODEL:-}" ]]; then
  export CORTEX_PROVIDER=ollama CORTEX_MODEL="$CORTEX_OLLAMA_MODEL"
  export CORTEX_EMBEDDER=ollama CORTEX_EMBED_MODEL="${CORTEX_OLLAMA_EMBED_MODEL:-nomic-embed-text}"
  other="${CORTEX_OLLAMA_REPLAY_MODEL:-$CORTEX_OLLAMA_MODEL}"
else
  export CORTEX_PROVIDER=scripted CORTEX_MODEL=week
  export CORTEX_EMBEDDER=scripted CORTEX_SCRIPT="$here/week.json"
  other=large
fi

question="Who reviews the 0.12 schema migration, and when does the release ship?"

step() {
  printf '\n$ %s\n' "$*"
  "$@"
}

# Run from the demo folder, so sources print as notes/monday.md.
cd "$here"

# A note a day, each consolidated the day it was written.
for day in monday:2026-10-19 tuesday:2026-10-20 wednesday:2026-10-21 thursday:2026-10-22 friday:2026-10-23; do
  step "$cortex" ingest "notes/${day%%:*}.md" --at "${day#*:}"
  step "$cortex" consolidate
done

step "$cortex" ask "$question"
step "$cortex" why
step "$cortex" replay --model "$other"

step "$cortex" forget notes/wednesday.md
step "$cortex" ask "$question"
step "$cortex" why
