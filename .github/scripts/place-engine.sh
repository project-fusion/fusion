#!/usr/bin/env bash
# Puts the theme engine `engine.yml` built where `@fusion.dev/helix-native`'s
# `files` says, and refuses a release left without either platform's.
#
# `download-artifact` gives each artifact a directory of its own, named for it:
# `helix-native-engine-ios` holds `ios/theme/engine`, and
# `helix-native-engine-android` holds `android/src/engine`. A package without
# them installs a module that derives nothing, and an app's seeds would be left
# unread without a word.
#
#   .github/scripts/place-engine.sh "$RUNNER_TEMP/engine"
set -euo pipefail

from=$1
missing=()

place() {
  local platform=$1 into=$2 expected=$3
  local artifact="$from/helix-native-engine-$platform"
  if [ ! -e "$artifact/$expected" ]; then
    missing+=("$platform")
    return
  fi
  rm -rf "$into"
  mkdir -p "$into"
  cp -R "$artifact/." "$into/"
  echo "placed $into"
}

place ios helix/native/ios/theme/engine HelixThemeFFI.xcframework/Info.plist
place android helix/native/android/src/engine jniLibs/arm64-v8a/libfusion_helix_native.so

if [ ${#missing[@]} -gt 0 ]; then
  echo "::error::No theme engine arrived for ${missing[*]}. @fusion.dev/helix-native without it derives no theme from an app's seeds."
  exit 1
fi
