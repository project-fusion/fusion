#!/usr/bin/env bash
# The build the jobs after `warm` read: everything `turbo run build` writes
# except the site's own `next build`. Extra tasks, such as `analyze`, are
# passed as arguments and run with the build.
#
# **No job after `warm` reads `.next`.** On October 8, 2026 no script, rule or
# check in the repository opened it, and the one check that `next build`
# carries, `check-highlight.mjs`, runs in `packaging`, which builds the site.
# With `next build` in `warm`, every job after it waited about 55 seconds for a
# directory none of them opened.
#
# **The site's other tasks are read off turbo's graph.** The frame, the specs,
# the catalog and the rest are what `@fusion.dev/site#build` depends on in the
# site package, and the checks read them. Listing them here would be a second
# copy of `turbo.json` that a new task could miss, so the dry run names them.
set -euo pipefail
site=$(bunx turbo run build --filter=@fusion.dev/site --dry=json |
  jq -r '.tasks[] | select(.taskId == "@fusion.dev/site#build") | .dependencies[] | select(startswith("@fusion.dev/site#")) | sub("^@fusion.dev/site#"; "")')
if [ -z "$site" ]; then
  echo "build-for-checks: turbo names no task that the site build depends on" >&2
  exit 1
fi
bunx turbo run build "$@" --filter='!@fusion.dev/site'
# shellcheck disable=SC2086 # one task name per word
bunx turbo run $site --filter=@fusion.dev/site
