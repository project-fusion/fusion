#!/usr/bin/env bash
# Stamps a preview version into every domain this pull request touches.
#
# The same reading `release-intent` reports and `release` applies, from the same
# file, so a preview cannot be a different version from the one merging would
# produce.
#
# Writes `/tmp/released`, one `domain version` per line, which the publish and
# comment steps read. An empty file means nothing to publish, and every later
# step exits on it.
#
# Reads: NUMBER, BASE_SHA.
set -euo pipefail

short=$(git rev-parse --short=7 HEAD)
: > /tmp/released

base=$(git merge-base "$BASE_SHA" HEAD)
resolved=$(node fusion/scripts/bump.mjs "$base..HEAD")

while IFS=$'\t' read -r domain level; do
  [ -n "$level" ] || continue
  version=$(node fusion/scripts/version.mjs \
    --domain "$domain" --bump "$level" --pre "exp.$NUMBER.g$short" --write | tail -1)
  printf '%s %s\n' "$domain" "$version" >> /tmp/released
done < <(jq -r '.[] | "\(.domain)\t\(.level)"' <<<"$resolved")

if [ ! -s /tmp/released ]; then
  echo "No subject carries a releasing type and a published scope, so there is nothing to publish." \
    >> "$GITHUB_STEP_SUMMARY"
fi
