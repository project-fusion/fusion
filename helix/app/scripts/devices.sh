#!/usr/bin/env bash
# Runs the gallery's flows on one booted iOS simulator or Android emulator,
# with a release build of the gallery, and writes what they make into one
# folder. `.github/workflows/native-devices.yml` runs it each night.
#
#   helix/app/scripts/devices.sh <ios|android> <device> <app> <out> [part]
#
# <device> is the simulator's UDID or the emulator's serial, such as
# `emulator-5554`. <app> is the build: the `.app` for iOS, the `.apk` for
# Android. Run it from the repository's root, with `maestro` on the path.
# [part] is `flows`, `screens`, or `all`, which is the default. The workflow
# runs `flows` and `screens` on two devices at once, each with its own
# timeout.
#
# Each pass is one `maestro test`, and there are as few as the device settings
# allow: each run on an iOS simulator spent one to two minutes starting in CI
# (runs 38193448320 and 38196585542).
#
# `flows`, in light mode at the default text size:
#
# 1. `interactions`: the flow that accepts iOS's prompt for links, then each
#    family's flow, which presses, drags, and selects it, reads what a screen
#    reader hears of it, and records a video, and the flows of the gallery's
#    own checks, such as right to left and numbers in German.
# 2. `keys`, on Android alone: the flows in `keys`, which move through each
#    family with a hardware keyboard's keys. Maestro sends an iOS simulator
#    Return and Delete and no arrow keys.
# 3. The list of 1,000 rows, drawn and then scrolled. The screen counts the
#    frames it draws while the list moves, on both platforms. On Android,
#    `dumpsys gfxinfo` counts them too, reset between `rows-open` and
#    `rows-scroll`. On iOS one pass, `rows`, runs both.
#
# `screens`:
#
# 1. `links`, on iOS alone, where `screens` runs on its own: the flow that
#    accepts iOS's prompt for links on a new simulator.
# 2. `screens-<mode>-<size>`, four times: light and dark, at the default and
#    the largest text size, with a screenshot of each family's examples in
#    each, from the flows in `screens`. The script sets the appearance between
#    them, since Maestro's `setDarkMode` left an iOS 27 simulator light (run
#    38196585542).
#
# `all` runs the passes of `flows`, then those of `screens`, on one device.
#
# <out> gets `screenshots`, `videos`, `frame-rate`, a JUnit report of each
# pass in `reports`, what Maestro keeps of each pass that fails in `debug`,
# and `summary.md`. A pass that fails leaves the next ones to run, and the
# script fails at the end.
set -uo pipefail

if [[ ($# -ne 4 && $# -ne 5) || ($1 != ios && $1 != android) || (${5:-all} != all && ${5:-all} != flows && ${5:-all} != screens) ]]; then
  echo "Usage: $0 <ios|android> <device> <app> <out> [flows|screens|all]" >&2
  exit 2
fi

platform=$1
device=$2
app=$3
out=$4
part=${5:-all}
flows=helix/app/.maestro
package=dev.fusion.helix.app
started=$SECONDS

mkdir -p "$out"/{debug,frame-rate,reports,screenshots,videos}
failed=()
passes=()

# Says what the script does next, and how long it has run.
say() {
  echo "[$((SECONDS - started)) s] $*"
}

# Sets the device's appearance: `light` or `dark`.
appearance() {
  if [[ $platform == ios ]]; then
    xcrun simctl ui "$device" appearance "$1"
  elif [[ $1 == dark ]]; then
    adb -s "$device" shell cmd uimode night yes > /dev/null
  else
    adb -s "$device" shell cmd uimode night no > /dev/null
  fi
}

# Sets the device's text size: `default`, or `largest`, which is iOS's largest
# accessibility size, 3.571 times the default, and Android's 200 percent.
text_size() {
  case $platform:$1 in
    ios:default) xcrun simctl ui "$device" content_size large ;;
    ios:largest) xcrun simctl ui "$device" content_size accessibility-extra-extra-extra-large ;;
    android:default) adb -s "$device" shell settings put system font_scale 1.0 ;;
    android:largest) adb -s "$device" shell settings put system font_scale 2.0 ;;
  esac
}

# Runs one pass, named by the first argument, with the rest given to
# `maestro test`. Maestro installs its driver on the device for the first pass
# and reuses it after.
#
# A CI runner's simulator once took longer than Maestro allows to start the
# driver before the `rows` pass (run 39536899709, "iOS driver not ready in
# time"), so the script allows five minutes, and runs a pass again once when
# the driver still did not start.
export MAESTRO_DRIVER_STARTUP_TIMEOUT=${MAESTRO_DRIVER_STARTUP_TIMEOUT:-300000}
driver=--reinstall-driver
run_maestro() {
  local name=$1
  shift
  maestro --device "$device" --platform "$platform" test "$driver" \
    --debug-output "$out/debug/$name" \
    --format junit --output "$out/reports/$name.xml" \
    "$@" 2>&1 | tee "$out/debug/$name.log"
}

# Whether the pass named by the argument failed because Maestro's driver did
# not start.
driver_late() {
  grep -q "driver not ready in time" "$out/debug/$1.log" 2> /dev/null
}

# Whether the Android emulator dropped off adb during a pass, which a CI
# runner's emulator did three times by October 20, 2026 ("adb: device
# offline"); every flow after the drop then fails in milliseconds without
# reaching the gallery. It reconnects, waits for the boot to finish, and says
# whether the device came back.
#
# The emulator can also drop off for under a second and come back before the
# pass ends, which failed three flows of run 39622908821 in milliseconds each.
# Maestro's log of each flow, in the pass's debug folder, names that drop
# (its console output does not, as run 39633692694 showed), so a pass whose
# flows' logs say "device offline", that the device was not found, or that
# Maestro's server on it died (run 39640601450) counts as one the emulator
# dropped off during, even when it is back.
emulator_back() {
  [[ $platform == android ]] || return 1
  if [[ $(adb -s "$device" get-state 2> /dev/null) == device ]]; then
    grep -rqsE "device offline|device '[^']*' not found|Device server died" "$out/debug/$1"
    return
  fi
  say "The emulator went offline; reconnecting"
  adb reconnect offline > /dev/null 2>&1 || true
  timeout 180 adb -s "$device" wait-for-device || return 1
  for _ in $(seq 1 60); do
    [[ $(adb -s "$device" shell getprop sys.boot_completed 2> /dev/null | tr -d '\r') == 1 ]] && return 0
    sleep 2
  done
  return 1
}

pass() {
  local name=$1 began=$SECONDS result=passed
  shift
  [[ -n ${GITHUB_ACTIONS:-} ]] && echo "::group::$name"
  say "Running $name"
  if ! run_maestro "$name" "$@"; then
    if driver_late "$name"; then
      say "Maestro's driver did not start; running $name again"
      driver=--reinstall-driver
      rm -rf "$out/debug/$name"
      run_maestro "$name" "$@" || result=failed
    elif emulator_back "$name"; then
      say "Running $name again on the reconnected emulator"
      driver=--reinstall-driver
      # Kept apart: a failure in the first run before the drop may not come
      # back in the second, as in run 41272571475.
      mv "$out/debug/$name" "$out/debug/$name-first"
      run_maestro "$name" "$@" || result=failed
    else
      result=failed
    fi
    [[ $result == failed ]] && failed+=("$name")
  fi
  driver=--no-reinstall-driver
  [[ -n ${GITHUB_ACTIONS:-} ]] && echo "::endgroup::"
  passes+=("| \`$name\` | $result | $((SECONDS - began)) s |")
  if [[ $result == failed && -n ${GITHUB_ACTIONS:-} ]]; then
    echo "::error title=$platform $name::The $name pass failed. Its report and what Maestro kept of it are in the run's artifacts."
  fi
}

say "Installing the gallery"
case $platform in
  ios) xcrun simctl install "$device" "$app" ;;
  android) adb -s "$device" install -r "$app" > /dev/null ;;
esac

# A CI runner's emulator showed "Pixel Launcher isn't responding" over the
# gallery, and every flow after it failed (run 39548403020). Android hides
# the dialogs for apps that stop responding or crash with this setting.
if [[ $platform == android ]]; then
  adb -s "$device" shell settings put global hide_error_dialogs 1
fi

if [[ $part != screens ]]; then
  say "Setting light mode and the default text size"
  appearance light
  text_size default
  pass interactions "$flows"
  if [[ $platform == android ]]; then
    pass keys "$flows/keys"
    pass rows-open "$flows/rows-open.yaml"
    adb -s "$device" shell dumpsys gfxinfo "$package" reset > /dev/null
    pass rows-scroll "$flows/rows-scroll.yaml"
    adb -s "$device" shell dumpsys gfxinfo "$package" > "$out/frame-rate/gfxinfo.txt"
  else
    pass rows "$flows/rows.yaml"
  fi

  # The line the screen of 1,000 rows shows, read from the view hierarchy.
  say "Reading the frame rate the screen shows"
  maestro --device "$device" --platform "$platform" hierarchy --no-reinstall-driver > "$out/frame-rate/hierarchy.json" 2> /dev/null
  readout=$(jq -r 'first(.. | objects | select(.attributes?["resource-id"]? == "rows-frame-rate") | .attributes | [.text, .accessibilityText] | map(select(. != null and . != "")) | .[0] // empty) // empty' "$out/frame-rate/hierarchy.json" 2> /dev/null)
  echo "${readout:-The screen of 1,000 rows gave no frame rate.}" > "$out/frame-rate/screen.txt"
fi

if [[ $part != flows ]]; then
  # A new simulator asks before a link opens the gallery the first time, and
  # `interactions` has not run on it to accept.
  if [[ $part == screens && $platform == ios ]]; then
    say "Setting light mode and the default text size"
    appearance light
    text_size default
    pass links "$flows/allow-links.yaml"
  fi
  for mode in light dark; do
    for size in default largest; do
      say "Setting $mode mode and the $size text size"
      appearance "$mode"
      text_size "$size"
      pass "screens-$mode-$size" -e "MODE=$mode" -e "SIZE=$size" "$flows/screens"
    done
  done
  say "Setting light mode and the default text size"
  appearance light
  text_size default
fi
say "Done"

# The pictures and videos the flows took, out of Maestro's folders. What
# Maestro keeps of a pass that passed goes: mostly the simulator's own log,
# 158 MB over the passes of run 38196585542.
find "$out/debug" -path '*/takeScreenshot/*.png' -exec mv {} "$out/screenshots/" \;
find "$out/debug" -path '*/startRecording/*.mp4' -exec mv {} "$out/videos/" \;
for kept in "$out"/debug/*; do
  if [[ -d $kept && " ${failed[*]:-} " != *" $(basename "$kept") "* ]]; then
    rm -rf "$kept"
  fi
done
# Maestro names a failed flow's folder by the flow, and the upload refuses
# the whole artifact over one path with a colon in it, such as
# `Screens: Badge`: run 38957410938 kept nothing of either screens job. Each
# character the upload refuses becomes a hyphen, the deepest paths first.
find "$out/debug" -depth -name '*[":<>|*?]*' | while IFS= read -r path; do
  mv "$path" "$(dirname "$path")/$(basename "$path" | tr '":<>|*?' '-------')"
done

{
  case $part in
    flows) said="the flows" ;;
    screens) said="the screenshots" ;;
    all) said="the flows and the screenshots" ;;
  esac
  if [[ $platform == ios ]]; then
    echo "## iOS simulator: $said"
  else
    echo "## Android emulator: $said"
  fi
  echo
  echo "| Pass | Result | Time |"
  echo "|---|---|---|"
  printf '%s\n' "${passes[@]}"
  echo
  echo "$(find "$out/screenshots" -name '*.png' | wc -l | tr -d ' ') screenshots and $(find "$out/videos" -name '*.mp4' | wc -l | tr -d ' ') videos are in the job's artifact, after $((SECONDS - started)) s on the device."
  if [[ -s $out/frame-rate/screen.txt ]]; then
    echo
    echo "### Frame rate of the list of 1,000 rows"
    echo
    echo "The screen's own count, on the UI thread: $(cat "$out/frame-rate/screen.txt")"
    if [[ -s $out/frame-rate/gfxinfo.txt ]]; then
      echo
      echo "\`dumpsys gfxinfo\`, from the end of drawing the rows to the end of the scroll:"
      echo
      echo '```'
      grep -E '^(Total frames rendered|Janky frames|[0-9]+th percentile|Number [A-Z])' "$out/frame-rate/gfxinfo.txt"
      echo '```'
    fi
    echo
    echo "A simulator and an emulator draw with the computer's processor and graphics, so these numbers follow changes from night to night and say nothing about a phone."
  fi
} > "$out/summary.md"

if [[ ${#failed[@]} -gt 0 ]]; then
  echo "These passes failed: ${failed[*]}" >&2
  exit 1
fi
