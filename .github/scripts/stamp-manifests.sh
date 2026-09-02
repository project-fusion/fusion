#!/usr/bin/env bash
# Writes the published version back into the manifests, on `main`.
#
# **The commit subject is unscoped, and it has to stay that way.**
# `chore(helix)` is a releasing subject, and this commit lands inside the window
# the next run reads from the tag, so a scoped one makes every release the cause
# of the next: release, stamp, release, forever, whatever the merge contained.
# `[skip ci]` does not save it, that stopping the run on *this* push and leaving
# the commit in the window for the next one. Unscoped, the domain is empty and
# `bump.mjs` releases nothing. `bump.spec.mjs` reads this line and asserts it.
#
# **Rebased rather than forced.** Another merge may have landed while this
# release was building, and a release must never be the thing that loses
# somebody's commit.
#
# **The push has to be told to forget the runner's own credentials.**
# `actions/checkout` runs with `persist-credentials: true`, and an
# `AUTHORIZATION: basic` header carrying the default `GITHUB_TOKEN` outranks the
# credentials in the remote URL set below. Left in place it pushes as
# `github-actions[bot]`, which is not this ruleset's bypass actor, and `main`
# refuses it. It cannot be unset: `checkout@v7` writes the header to a file under
# `_temp` and pulls it in with `includeIf.gitdir`, so `--unset-all --local` does
# not see it and exits 5. Emptying the value resets the list for one command.
#
# Reads: DOMAIN, VERSION, APP_SLUG, APP_ID, APP_TOKEN, REPOSITORY.
set -euo pipefail

# Taken from the token rather than written here, so renaming the App or replacing
# it does not leave a workflow attributing its commits to something that no
# longer exists.
git config user.name "$APP_SLUG[bot]"
git config user.email "$APP_ID+$APP_SLUG[bot]@users.noreply.github.com"

git add -- '**/package.json' bun.lock
if git diff --cached --quiet; then
  echo "Nothing to stamp: the manifests already read $VERSION." >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi

git commit -q -m "chore: stamp $DOMAIN $VERSION into the manifests [skip ci]" -m \
  "Written by \`release.yml\` after $DOMAIN-v$VERSION published, installed from the
registry and promoted to \`latest\`. The tag is still the record; this is the
manifests agreeing with it."

git remote set-url origin "https://x-access-token:$APP_TOKEN@github.com/$REPOSITORY.git"
git fetch -q origin main
git rebase -q origin/main
git -c http.https://github.com/.extraheader= push origin HEAD:main
