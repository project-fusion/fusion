#!/usr/bin/env bash
# Checks every subject on a pull request, and reports what merging would release.
#
# **The title is one of the subjects.** A squash merge of more than one commit
# lands under the title, and that is the subject `main` then keeps.
#
# Reads: GH_TOKEN, NUMBER, REPO, BASE_SHA.
set -euo pipefail

title=$(gh api "repos/$REPO/pulls/$NUMBER" --jq '.title')
subjects=$(
  gh api "repos/$REPO/pulls/$NUMBER/commits" --paginate \
    --jq '.[].commit.message | split("\n")[0]'
  printf '%s\n' "$title"
)

# `type(scope)!: description`, anchored, because a subject that merely contains
# one of these words is prose rather than a conventional one.
pattern='^(feat|fix|perf|refactor|docs|test|ci|build|chore|style|revert)(\([a-z0-9/._-]+\))?!?: .+'

bad=0
while IFS= read -r subject; do
  [ -n "$subject" ] || continue
  grep -qE "$pattern" <<<"$subject" && continue
  echo "::error::Not a conventional subject: $subject"
  bad=1
done <<<"$subjects"

if [ "$bad" -ne 0 ]; then
  {
    echo "### Not every subject is conventional"
    echo
    echo 'Each one wants `<type>(<scope>): <description>`, where the scope'
    echo 'names the domain it touches. The bump is read from here, so a'
    echo 'subject that does not parse is a release nobody can predict.'
    echo
    echo 'The title is one of them: a squash merge of more than one commit'
    echo 'lands under the title, and that is the subject `main` then keeps.'
  } >> "$GITHUB_STEP_SUMMARY"
  exit 1
fi

# `bump.mjs` from the base branch, since this job has no checkout. Through
# `gh api` rather than `raw.githubusercontent.com`, which answers 404 for a
# private repository without a token.
gh api "repos/$REPO/contents/fusion/scripts/bump.mjs?ref=$BASE_SHA" \
  --jq '.content' | base64 -d > /tmp/bump.mjs

# NUL between whole messages rather than between lines. Split per line, a
# `BREAKING CHANGE:` trailer becomes its own record, parses as no subject, and
# the major it asks for is dropped.
resolved=$(gh api "repos/$REPO/pulls/$NUMBER/commits" --paginate --slurp \
  | jq -j '.[][].commit.message + "\u0000"' \
  | node /tmp/bump.mjs --stdin)

{
  echo "### What merging this would release"
  echo
  if [ "$resolved" = '[]' ]; then
    echo 'Nothing. No subject carries a `helix` or `cortex` scope with a releasing type.'
  else
    jq -r '.[] | "- `\(.domain)`: **\(.level)**"' <<<"$resolved"
  fi
} >> "$GITHUB_STEP_SUMMARY"
