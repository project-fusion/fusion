#!/usr/bin/env bash
# Whether a pull request's `verify` already passed on the tree this push
# landed, as `proven` on GITHUB_OUTPUT.
#
# **The tree and not the commit**, because a rebase merge of a branch that was
# up to date lands a new commit holding the same files, and every check here is
# a function of the files. **The tree the pull request's run checked out**, which
# is the merge of its head into the base and not the head itself: a head behind
# the base has the head's tree and was verified against another. So `plan`
# records the tree it checked out as an artifact name, and this looks that name
# up rather than comparing heads.
#
# **Never fails.** A lookup that cannot answer answers `false`, and the push is
# verified in full, which is what it was before this existed. A failure here
# would also fail the gate, and a run that verified everything must not go red
# because the shortcut was unavailable.
#
# Reads: TREE, REPOSITORY, GH_TOKEN. Writes: `proven` on GITHUB_OUTPUT.
set -uo pipefail

no() {
  echo 'proven=false' >> "$GITHUB_OUTPUT"
  echo "$1" >> "$GITHUB_STEP_SUMMARY"
  exit 0
}

[ -n "${TREE:-}" ] || no "This push names no tree, so every job runs."

if ! runs=$(gh api "repos/$REPOSITORY/actions/artifacts?name=verified-tree-$TREE&per_page=100" \
  --jq '.artifacts[].workflow_run.id' | sort -u); then
  no "The artifact lookup for tree $TREE failed, so every job runs."
fi

for run in $runs; do
  # The workflow is named by its file rather than by `name`, which is text a
  # pull request can set to anything; the file is the one that ran.
  if ! said=$(gh api "repos/$REPOSITORY/actions/runs/$run" --jq '[.event, .conclusion, .path] | @tsv'); then
    continue
  fi
  IFS=$'\t' read -r event conclusion path <<< "$said"
  if [ "$event" = pull_request ] && [ "$conclusion" = success ] \
    && [ "${path%%@*}" = .github/workflows/verify.yml ]; then
    echo 'proven=true' >> "$GITHUB_OUTPUT"
    echo "Run $run verified tree $TREE on a pull request, so this push runs nothing again." \
      >> "$GITHUB_STEP_SUMMARY"
    exit 0
  fi
done

no "No pull request's run verified tree $TREE, so every job runs."
