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

majors=$(jq -r '[.[] | select(.level == "major") | .domain] | join("`, `")' <<<"$resolved")

report=$(
  echo "### What merging this would release"
  echo
  if [ "$resolved" = '[]' ]; then
    echo 'Nothing. No subject carries a `helix` or `cortex` scope with a releasing type.'
  else
    jq -r '.[] | "- `\(.domain)`: **\(.level)**"' <<<"$resolved"
  fi
  if [ -n "$majors" ]; then
    echo
    echo "> [!WARNING]"
    echo "> **Breaking.** Merging releases a new major of \`$majors\`, so every"
    echo "> consumer takes the break on its next upgrade. A \`!\` in a subject or a"
    echo "> \`BREAKING CHANGE:\` trailer is what asks for this; drop it if that is not"
    echo "> the intent."
  fi
)

printf '%s\n' "$report" >> "$GITHUB_STEP_SUMMARY"

# **A label, because the summary is a page nobody opens.** It reads at a glance
# in the pull request list and in the merge queue, which a step summary does not.
if [ -n "$majors" ]; then
  gh label create breaking --repo "$REPO" --color b60205 \
    --description 'Merging releases a new major' --force >/dev/null 2>&1 || true
  gh pr edit "$NUMBER" --repo "$REPO" --add-label breaking >/dev/null
else
  gh pr edit "$NUMBER" --repo "$REPO" --remove-label breaking >/dev/null 2>&1 || true
fi

# **Upserted on a marker rather than appended**, so a force-push rewrites the
# one comment instead of stacking another beneath it. Created only when
# something releases, so a docs-only pull request stays quiet, and updated
# whenever one already exists so it can go back to saying nothing.
marker='<!-- release-intent -->'
existing=$(gh api "repos/$REPO/issues/$NUMBER/comments" --paginate --slurp \
  --jq "[.[][] | select(.body | startswith(\"$marker\")) | .id] | first // empty")
body=$(printf '%s\n\n%s\n' "$marker" "$report")

if [ -n "$existing" ]; then
  gh api -X PATCH "repos/$REPO/issues/comments/$existing" -f body="$body" >/dev/null
elif [ "$resolved" != '[]' ]; then
  gh api -X POST "repos/$REPO/issues/$NUMBER/comments" -f body="$body" >/dev/null
fi
