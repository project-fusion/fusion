#!/usr/bin/env bash
# Whether this push can reach the browser, as `browser` on GITHUB_OUTPUT.
#
# **An unresolvable base runs everything.** A force push or a new branch leaves
# nothing to diff against, and the safe answer to "what changed" with no answer
# is "all of it".
#
# Reads: BASE, HEAD. Writes: `browser` on GITHUB_OUTPUT.
set -euo pipefail

if ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  echo 'browser=true' >> "$GITHUB_OUTPUT"
  echo "Base ${BASE} is unresolvable, so every job runs." >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi

changed=$(git diff --name-only "$BASE" "$HEAD")
total=$(printf '%s\n' "$changed" | grep -c . || true)
# `fusion/docs/`, where the writing lives, and a `.md` anywhere: no browser job
# reads one, and every document, README and convention file is `.md`. The
# `.mdx` under the docs packages are not here, because the site renders them.
skippable=$(printf '%s\n' "$changed" | grep -cE '^(fusion/docs/|cortex/|\.claude/|\.agents/)|\.md$' || true)

if [ "$total" -gt 0 ] && [ "$total" -eq "$skippable" ]; then
  echo 'browser=false' >> "$GITHUB_OUTPUT"
  echo "All $total changed files are outside the browser's reach, so those jobs are skipped." \
    >> "$GITHUB_STEP_SUMMARY"
else
  echo 'browser=true' >> "$GITHUB_OUTPUT"
fi
