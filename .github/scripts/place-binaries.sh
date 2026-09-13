#!/usr/bin/env bash
# Puts each binary `binaries.yml` built where its platform package's `files`
# says, executable, and refuses a platform package left without one.
#
# `download-artifact` gives each artifact a directory of its own, named for it,
# and the artifact is named for the package: `helix-cli-linux-x64` holds the
# binary for `helix/cli/platforms/linux-x64`. The mode does not survive the
# upload, which is why the `chmod`; `publish.mjs` refuses a binary that is not
# executable, and this is what stops it getting that far.
#
#   .github/scripts/place-binaries.sh "$RUNNER_TEMP/binaries"
set -euo pipefail

from=$1
missing=()

for package in helix/cli/platforms/*/; do
  platform=$(basename "$package")
  binary=helix
  [ "${platform%%-*}" = win32 ] && binary=helix.exe
  artifact="$from/helix-cli-$platform/$binary"
  if [ ! -f "$artifact" ]; then
    missing+=("$platform")
    continue
  fi
  cp "$artifact" "$package$binary"
  chmod +x "$package$binary"
  echo "placed $package$binary"
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "::error::No binary arrived for ${missing[*]}. A platform package without one installs a command that runs nothing."
  exit 1
fi
