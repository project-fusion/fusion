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
# **Re-derived on top of `main`, never rebased onto it.** Another merge may have
# landed while this release was building, and a release must never be the thing
# that loses somebody's commit. Rebasing a stamp does lose things: two releases
# write different numbers to the same line of the same manifests, and there is no
# reconciliation for that. Measured on 6 Sep 2026, three merges inside a minute
# published `0.10.1` and `0.10.2`, and the second stamp died with `could not
# apply ... chore: stamp helix 0.10.2`. Everything before it had succeeded, which
# is the shape that teaches people to stop reading release runs.
#
# A stamp is idempotent: it says the manifests read `$VERSION`. So it starts from
# whatever `main` holds now and says it again, rather than replaying a diff taken
# against a base that predates somebody else's stamp. Replaying is also how a
# rebase would carry an older lockfile over a dependency change that landed while
# this was building.
#
# **`--allow-major` because the number is already spent.** `version.mjs` refuses
# to allocate a `1.x` without it, which is the right guard when a version is being
# chosen and nonsense here: this one is published, installed and promoted, and the
# manifests are only being told about it.
#
# **A refused token is waited out, not reported as `main` moving.** On 2 Sep 2026
# `helix 0.4.2` published, promoted and tagged, and then this push answered
# `Repository not found` 1.3 seconds after the App's token was minted. The
# `cortex` leg minted its own a few minutes later and pushed. That is the answer
# git gives for a token the server does not accept yet, so the push is tried
# again after a pause, and the reason is said, since "overtaken" was the only
# reason this loop knew and it was the wrong one.
#
# **The lockfile moves with the manifests.** `version.mjs` writes `package.json`
# and nothing else; `bun.lock` carries the workspace versions too, and CI installs
# `--frozen-lockfile`, so manifests stamped without it would fail every run after
# this one.
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

git remote set-url origin "https://x-access-token:$APP_TOKEN@github.com/$REPOSITORY.git"

for attempt in 1 2 3 4; do
  git fetch -q origin main
  git reset -q --hard origin/main

  bun fusion/scripts/version.mjs \
    --domain "$DOMAIN" --set "$VERSION" --allow-major --write
  bun install >/dev/null

  git add -- '**/package.json' '**/src/version.ts' bun.lock
  if git diff --cached --quiet; then
    echo "Nothing to stamp: the manifests already read $VERSION." >> "$GITHUB_STEP_SUMMARY"
    exit 0
  fi

  git commit -q -m "chore: stamp $DOMAIN $VERSION into the manifests [skip ci]" -m \
    "Written by \`release.yml\` after $DOMAIN-v$VERSION published, installed from the
registry and promoted to \`latest\`. The tag is still the record; this is the
manifests agreeing with it."

  if pushed=$(git -c http.https://github.com/.extraheader= push -q origin HEAD:main 2>&1); then
    exit 0
  fi
  echo "$pushed" >&2

  case "$pushed" in
    *'Repository not found'* | *'Authentication failed'* | *'Permission to'* | *'returned error: 40'[13]*)
      refused="the App's token was refused"
      ;;
    *)
      refused=''
      ;;
  esac
  if [ "$attempt" -lt 4 ]; then
    echo "${refused:-\`main\` moved} while stamping $VERSION; trying again." >> "$GITHUB_STEP_SUMMARY"
    if [ -n "$refused" ]; then
      sleep $((attempt * 10))
    fi
  fi
done

echo "::error::Could not stamp $DOMAIN $VERSION onto main after four attempts${refused:+, the last because $refused}. $DOMAIN-v$VERSION is published, promoted and tagged; only the manifests are behind it, and the next release stamps over them."
exit 1
