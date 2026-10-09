#!/usr/bin/env bash
# The run records of a workflow's recent runs, each run's in a folder of its
# own under DIR: the history `helix visual report --history` reads.
#
#   history.sh RUNS DIR [PREFIX] [WORKFLOW]
#
# Reads the last RUNS completed runs of WORKFLOW, the file name of the one
# running it unless given, leaves this run out, and unpacks every artifact
# whose name starts with PREFIX, `visual-run-` unless given. Needs `gh` and `GH_TOKEN` with `actions: read`.
# A run whose artifacts have expired, or one that kept no record, is passed
# over: history is what is left, and none is an answer too.
set -euo pipefail

count=$1
dir=$2
prefix=${3:-visual-run-}
workflow=${4:-$(basename "${GITHUB_WORKFLOW_REF%%@*}")}
mkdir -p "$dir"

gh api "repos/$GITHUB_REPOSITORY/actions/workflows/$workflow/runs?status=completed&per_page=$count" \
  --jq ".workflow_runs[] | select(.id != ${GITHUB_RUN_ID:-0}) | .id" |
  while read -r run; do
    gh api "repos/$GITHUB_REPOSITORY/actions/runs/$run/artifacts?per_page=100" \
      --jq ".artifacts[] | select(.name | startswith(\"$prefix\")) | select(.expired | not) | \"\(.id) \(.name)\"" |
      while read -r id name; do
        target="$dir/$run-$name"
        mkdir -p "$target"
        if gh api "repos/$GITHUB_REPOSITORY/actions/artifacts/$id/zip" > "$target.zip"; then
          unzip -oq "$target.zip" -d "$target" || true
        fi
        rm -f "$target.zip"
      done
  done
