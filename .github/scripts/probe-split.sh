#!/usr/bin/env bash
# Probe only (queue row 440): times helix-headless test:dom in one, two and
# three processes on this runner. Not for main.
set -uo pipefail
cd helix/headless
nproc; free -m; mkdir -p "$RUNNER_TEMP/junit"
mapfile -t files < <(find src -name '*.dom.spec.ts' | sort)
echo "files: ${#files[@]}"
start=$(date +%s%N)
bun test --conditions helix-development --reporter=junit --reporter-outfile="$RUNNER_TEMP/junit/dom.xml" dom.spec > "$RUNNER_TEMP/one.log" 2>&1
echo "one process: exit $? in $(( ($(date +%s%N) - start) / 1000000 )) ms"; tail -5 "$RUNNER_TEMP/one.log"
for n in 2 3; do
  start=$(date +%s%N)
  pids=()
  for ((k = 0; k < n; k++)); do
    group=()
    for ((i = k; i < ${#files[@]}; i += n)); do group+=("./${files[$i]}"); done
    ( s=$(date +%s%N); bun test --conditions helix-development "${group[@]}" > "$RUNNER_TEMP/split-$n-$k.log" 2>&1; echo "  $n/$k exit $? in $(( ($(date +%s%N) - s) / 1000000 )) ms" ) &
    pids+=($!)
  done
  wait "${pids[@]}"
  echo "$n processes: wall $(( ($(date +%s%N) - start) / 1000000 )) ms"
  for ((k = 0; k < n; k++)); do tail -4 "$RUNNER_TEMP/split-$n-$k.log"; done
done
