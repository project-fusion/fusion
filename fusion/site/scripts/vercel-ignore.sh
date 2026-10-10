#!/usr/bin/env bash
# Vercel's ignored build step: exit 0 skips the build, and exit 1 builds.
#
# **A preview is skipped when everything that changed since the branch last
# built is a visual baseline**: a picture or an accessibility snapshot under an
# `.examples` folder, or anything under `fusion/site/baselines`. Those commits
# are retakes. Each full build takes about seven and a half minutes, and the
# retakes were about a fifth of all previews. The site serves the styled
# tier's pictures, so a skipped preview shows the previous ones until the
# branch's next build.
#
# **Anything uncertain builds.** Production always builds, so the site always
# matches `main`. A branch with no earlier build builds. So does one whose last
# built commit is not in Vercel's shallow clone.
#
# The bot's retake branches never get this far: `git.deploymentEnabled` in
# `vercel.json` turns their deployments off.
set -uo pipefail

if [ "${VERCEL_ENV:-}" != "preview" ]; then
  exit 1
fi

previous="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$previous" ] || ! git cat-file -e "${previous}^{commit}" 2>/dev/null; then
  exit 1
fi

if ! changed="$(git diff --name-only "$previous" HEAD)"; then
  exit 1
fi
if [ -z "$changed" ]; then
  exit 1
fi

while IFS= read -r file; do
  case "$file" in
    fusion/site/baselines/*) ;;
    */.examples/*.png | */.examples/*.aria.yml) ;;
    *)
      echo "Building: $file changed since the last build."
      exit 1
      ;;
  esac
done <<<"$changed"

echo "Skipping: only visual baselines changed since ${previous}."
exit 0
