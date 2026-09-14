#!/usr/bin/env bash
# Checks every subject on a pull request, and reports what merging would release.
#
# **The title is one of the subjects.** A squash merge of more than one commit
# lands under the title, and that is the subject `main` then keeps.
#
# Reads: GH_TOKEN, NUMBER, REPO, BASE_SHA, HEAD_SHA.
set -euo pipefail

# **A head commit that suppresses its own checks, caught here because here is
# the one place that survives it.** GitHub honors the skip markers anywhere in
# the head commit's message, body included, for `push` and `pull_request`; this
# workflow is `pull_request_target`, which it does not honor, so this is the
# only check immune to the thing it is checking for. Hosting it in `verify`
# would mean it never ran in exactly the case it exists for.
#
# **It is checked first because nothing after it means anything.** On 2 Sep 2026
# a commit whose body explained that the marker is a hazard suppressed every
# `verify` run on its own pull request: no run, no error, a required check that
# never reported, and BLOCKED. Four re-triggers carried the same message and
# failed identically, which reads as broken infrastructure rather than as the
# diff, and cost an hour and two wrong hypotheses.
head_message=$(gh api "repos/$REPO/commits/$HEAD_SHA" --jq '.commit.message')

# The five GitHub honors, and the trailer beside them. The markers match
# anywhere in the message, which is what makes a body dangerous; the trailer is
# anchored to its own line, which is where git trailers live.
skip_markers='\[skip ci\]|\[ci skip\]|\[no ci\]|\[skip actions\]|\[actions skip\]'
if grep -qiE "$skip_markers" <<<"$head_message" ||
  grep -qiE '^[[:space:]]*skip-checks:[[:space:]]*true[[:space:]]*$' <<<"$head_message"; then
  found=$(grep -oiE "$skip_markers" <<<"$head_message" | head -1)
  echo "::error::The head commit's message suppresses this pull request's own checks: ${found:-skip-checks trailer}"
  {
    echo "### This pull request's checks are being skipped by its own commit message"
    echo
    echo 'The head commit carries a marker GitHub reads as "skip this run", so'
    echo '`verify` never started. A required check that never reports is not a'
    echo 'failure anyone can see: the pull request simply sits at BLOCKED, which'
    echo 'reads as broken infrastructure rather than as the diff.'
    echo
    echo 'Reword the head commit and force-push. **Writing about the marker is'
    echo 'writing the marker**, so describe it rather than quoting it: that is'
    echo 'exactly how this happened the first time.'
    echo
    echo 'This check lives in `release-intent` because that workflow runs on'
    echo '`pull_request_target`, which the markers do not suppress. It is the'
    echo 'only place the check can survive the thing it detects.'
  } >> "$GITHUB_STEP_SUMMARY"
  exit 1
fi

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
# **Which domains are still in their 0 phase**, where a breaking change is a
# minor rather than a 1.0.0 this project has not decided to spend. Read off the
# release tags, the same source `resolve-intent.sh` uses on merge, and by the
# highest major rather than the last tag: refs come back in alphabetical order,
# where `v9` sits after `v10`.
zero=''
for domain in helix cortex; do
  major=$(gh api "repos/$REPO/git/matching-refs/tags/$domain-v" \
    --jq "[.[].ref | sub(\"^refs/tags/$domain-v\"; \"\") | split(\".\")[0] | tonumber?] | max // 0")
  if [ "$major" = '0' ]; then
    zero="${zero:+$zero,}$domain"
  fi
done

resolved=$(gh api "repos/$REPO/pulls/$NUMBER/commits" --paginate --slurp \
  | jq -j '.[][].commit.message + "\u0000"' \
  | bun /tmp/bump.mjs --stdin ${zero:+--zero "$zero"})

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

# **Upserted on a marker rather than appended**, so a force-push rewrites the
# one comment instead of stacking another beneath it. Created only when
# something releases, so a docs-only pull request stays quiet, and updated
# whenever one already exists so it can go back to saying nothing.
marker='<!-- release-intent -->'
# **`--paginate` with `--jq` and never `--slurp`**, which `gh` rejects together:
# the filter runs per page and the ids concatenate, so `head -1` is the first.
existing=$(gh api "repos/$REPO/issues/$NUMBER/comments" --paginate \
  --jq "[.[] | select(.body | startswith(\"$marker\")) | .id] | first // empty" | head -1)
body=$(printf '%s\n\n%s\n' "$marker" "$report")

if [ -n "$existing" ]; then
  gh api -X PATCH "repos/$REPO/issues/comments/$existing" -f body="$body" >/dev/null
elif [ "$resolved" != '[]' ]; then
  gh api -X POST "repos/$REPO/issues/$NUMBER/comments" -f body="$body" >/dev/null
fi
