#!/usr/bin/env bash
# Comments on the pull request with what was published and how to install it.
#
# One line per domain, because a pull request can release both and they carry
# different versions.
#
# Reads: NUMBER, GH_TOKEN, and `/tmp/released` from `stamp-experimental.sh`.
set -euo pipefail
[ -s /tmp/released ] || exit 0

{
  echo "Experimental build published from \`$(git rev-parse --short=7 HEAD)\`."
  echo
  while read -r domain version; do
    echo "- \`$domain\` at \`$version\`"
  done < /tmp/released
  echo
  echo '```bash'
  echo "bun add @fusion.dev/helix@exp-$NUMBER"
  echo '```'
  echo
  echo "Tagged \`exp-$NUMBER\`. Nothing resolves to this by asking for" \
    "\`next\` or \`latest\`, and the tag stops being updated when this" \
    "pull request closes."
} > /tmp/comment.md

gh pr comment "$NUMBER" --edit-last --create-if-none --body-file /tmp/comment.md
