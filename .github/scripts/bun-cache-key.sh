#!/usr/bin/env bash
# The key the bun cache is saved and looked up under, printed on stdout.
#
# **The hash of the lockfile without the workspaces' own `version` lines.** A
# release stamp rewrites those lines and nothing else in `bun.lock`: each of
# the forty stamps before October 8, 2026 changed only them. The cache holds
# the packages downloaded from the registry, and bun links each workspace from
# the checkout, so a workspace version changes nothing in the cache. With the
# version lines in the key, every stamp made a new 420 MB entry on `main` and
# on each pull request that rebased, twenty in one day, and the eviction they
# caused removed the Cargo caches. Any other change to the lockfile, such as a
# dependency added or updated, changes the hash.
#
# The pattern matches the exact form bun writes a workspace version in: six
# spaces of indent, inside `workspaces`. No line in `packages` has that form.
set -euo pipefail
printf 'bun-%s-%s\n' "${RUNNER_OS:?}" "$(sed -E '/^      "version": "[^"]*",$/d' bun.lock | shasum -a 256 | cut -d' ' -f1)"
