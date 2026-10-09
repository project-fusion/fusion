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
for domain in helix cortex locus; do
  last=$(git tag --list "$domain-v*" --sort=-v:refname | head -1)
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
