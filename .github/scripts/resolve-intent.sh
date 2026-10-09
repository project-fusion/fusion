#!/usr/bin/env bash
# What merging this commit releases, as one JSON array on `domains`.
#
# `helix-v*` and not `helix-attempt-v*`: an attempt tag says a number was spent,
# and spending one without publishing must not close the window over the work
# that number was for.
#
# **A domain named under `held` in `fusion.json` gets no leg**, whatever its
# subjects ask, so a merge builds and tests it and publishes none of it:
# [RELEASING.md](../RELEASING.md#a-held-domain).
#
# Reads: SHA. Writes: `domains` on GITHUB_OUTPUT.
set -euo pipefail

held=$(jq -r '.held // {} | keys | join(",")' fusion.json)

: > /tmp/entries
for domain in helix cortex; do
  # **`sed -n 1p` and not `head -1`, which closes the pipe on `git` early.** Under
  # `pipefail` a writer killed by SIGPIPE fails the step with 141, and it is a
  # race: `git` writes the list in 4,096-byte buffers, and the day the Helix tags
  # passed that (286 tags, 4,098 bytes, at `helix-v0.183.0` on October 8, 2026)
  # every release stopped in its first step. `sed` reads it all.
  last=$(git tag --list "$domain-v*" --sort=-v:refname | sed -n 1p)
  # No tag is the first release, and the range is then all of history.
  range=$SHA
  [ -n "$last" ] && range="$last..$SHA"
  # **A domain in its 0 phase raises the minor for a breaking change**, which is
  # what `version.mjs` refuses to do otherwise. Never released is 0 as well.
  zero=()
  major=${last#"$domain-v"}
  if [ -z "$last" ] || [ "${major%%.*}" = '0' ]; then
    zero=(--zero "$domain")
  fi
  bun fusion/scripts/bump.mjs "$range" "${zero[@]}" --held "$held" \
    | jq -c --arg d "$domain" '.[] | select(.domain == $d)' >> /tmp/entries
done

echo "domains=$(jq -c -s '.' /tmp/entries)" >> "$GITHUB_OUTPUT"
