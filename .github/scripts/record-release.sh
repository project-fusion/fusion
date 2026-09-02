#!/usr/bin/env bash
# Tags the release and writes its notes.
#
# **A merge commit's subject carries the number and its body is the pull request
# title**, so the two become one line. Anything else keeps its subject. The
# setting is the real invariant and it is not in this tree: flip the repository
# to squash-only and every subject carries its own number; flip it back and this
# reconstruction is what holds the notes together.
#
# **The first release states its size rather than listing it.** With no previous
# tag the range is the whole history: a release body nobody reads and close
# enough to GitHub's size limit to fail. Naming the count says what is not
# listed, where a `head -n` would read as a complete list that happened to be
# short.
#
# **Empty notes warn and do not fail.** This runs last because the tag is the
# record of a release that happened, so failing here would leave packages
# promoted with nothing recording it: the worst state of the three. A release can
# legitimately carry no commit under `$DOMAIN/` when the bump came from a label
# and the change was in `tooling/` or the root manifest, which belong to no
# domain path.
#
# Reads: DOMAIN, VERSION, SHA, SERVER_URL, REPOSITORY, GH_TOKEN.
set -euo pipefail

tag="$DOMAIN-v$VERSION"

# `helix-attempt-v*` does not match `helix-v*`, so a burnt number is not mistaken
# for the last release. Same distinction version computation reads, from the
# other side.
prev=$(git tag --list "$DOMAIN-v*" --sort=-v:refname | head -1)

notes() {
  git log --first-parent --format='%H' "$@" | while read -r commit; do
    subject=$(git log -1 --format='%s' "$commit")
    case "$subject" in
      'Merge pull request #'*)
        number=${subject#Merge pull request #}
        number=${number%% *}
        title=$(git log -1 --format='%b' "$commit" | sed -n '/./{p;q;}')
        printf -- '- %s (#%s)\n' "${title:-$subject}" "$number"
        ;;
      *) printf -- '- %s\n' "$subject" ;;
    esac
  done
}

if [ -n "$prev" ]; then
  notes "$prev..$SHA" -- "$DOMAIN/" > notes.md
else
  # Written only when there is something to count. Stating a count of zero left a
  # non-empty file, so the guard below could not see it and the body read
  # `0 commits` as though that were a result.
  count=$(git log --first-parent --oneline "$SHA" -- "$DOMAIN/" | wc -l | tr -d ' ')
  if [ "$count" -gt 0 ]; then
    printf 'First release. %s commits under `%s/` to here.\n' "$count" "$DOMAIN" > notes.md
  else
    : > notes.md
  fi
fi

if [ ! -s notes.md ]; then
  echo "::warning::No commit under $DOMAIN/ since ${prev:-the first commit}."
  echo "No change under \`$DOMAIN/\` in this release." > notes.md
fi

if [ -n "$prev" ]; then
  printf '\n[Compare with %s](%s/compare/%s...%s)\n' \
    "$prev" "$SERVER_URL/$REPOSITORY" "$prev" "$tag" >> notes.md
fi

git tag "$tag" "$SHA"
git push origin "$tag"
gh release create "$tag" --title "$tag" --notes-file notes.md
