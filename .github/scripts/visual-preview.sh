#!/usr/bin/env bash
# **The pictures a failed check took, on a branch a reviewer can look at
# before accepting them.** `publish` writes the captures of the reports in
# `REPORTS` into the baselines of a checkout of the pull request's head, as
# `/accept` would, commits them onto `visual-preview/<number>`, and links
# GitHub's comparison of that branch with the head in the pull request's
# visual comment. `remove` deletes the branch and takes the link away, once
# the pictures pass, are accepted, or the pull request closes.
#
# **One branch a pull request, pushed over each time**, so a pull request that
# fails ten times leaves one branch, and nothing piles up. It is never a pull
# request and runs no workflow: a push made with `GITHUB_TOKEN` starts none.
#
# Reads `GH_REPO`, `GH_TOKEN`, `NUMBER`, and for `publish` `HEAD_SHA`,
# `REPORTS` and `RUN`.
set -euo pipefail

mode=${1:?publish or remove}
branch="visual-preview/$NUMBER"
marker='<!-- helix-visual -->'
section='<!-- helix-visual-preview -->'

# The pull request's visual comment, by its marker, or nothing.
comment_id() {
  gh api "repos/$GH_REPO/issues/$NUMBER/comments?per_page=100" \
    --jq "[.[] | select(.body | startswith(\"$marker\"))][0].id // empty"
}

# Writes the preview section into the visual comment, in place of the one
# there, or takes it away when given nothing. A comment that is only the
# section goes with it.
write_section() {
  local text=$1 id body kept
  id=$(comment_id)
  if [ -z "$id" ]; then
    [ -n "$text" ] || return 0
    gh pr comment "$NUMBER" --body "$marker"$'\n'"$section"$'\n'"$text"
    return 0
  fi
  body=$(gh api "repos/$GH_REPO/issues/comments/$id" --jq .body)
  kept=${body%%"$section"*}
  if [ -z "$text" ] && [ "$(tr -d '[:space:]' <<<"$kept")" = "$marker" ]; then
    gh api -X DELETE "repos/$GH_REPO/issues/comments/$id" > /dev/null
    return 0
  fi
  if [ -n "$text" ]; then
    kept="$kept"$'\n'"$section"$'\n'"$text"
  fi
  gh api -X PATCH "repos/$GH_REPO/issues/comments/$id" -f body="$kept" > /dev/null
}

remove() {
  # A branch that is not there is the answer already.
  gh api -X DELETE "repos/$GH_REPO/git/refs/heads/$branch" > /dev/null 2>&1 || true
  write_section ''
}

publish() {
  bun helix/cli/npm/bin.mjs visual accept "$REPORTS" || true
  # What `/accept` commits: the pictures and the accessibility snapshots.
  git add -A -- ':(glob)**/*.png' ':(glob)**/*.aria.yml'
  if git diff --cached --quiet; then
    echo "No capture in this run is a baseline to look at."
    remove
    return 0
  fi
  git -c user.name='github-actions[bot]' \
    -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
    commit --quiet -m "test(visual): the captures of verify run $RUN, to look at before accepting"
  git push --quiet --force origin "HEAD:refs/heads/$branch"
  local count compare
  count=$(git diff --name-only HEAD~1 HEAD | wc -l | tr -d ' ')
  compare="$GITHUB_SERVER_URL/$GH_REPO/compare/${HEAD_SHA}...$branch"
  write_section "**[The $count files this run would write as baselines]($compare)**, drawn in GitHub's comparison, with its image diff for a changed picture. \`/accept\` commits the same files onto the branch."
}

case "$mode" in
  publish) publish ;;
  remove) remove ;;
  *)
    echo "::error::\`$mode\` is \`publish\` or \`remove\`."
    exit 1
    ;;
esac
