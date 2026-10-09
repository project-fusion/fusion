#!/usr/bin/env bash
# Installs Chromium's system packages, from the cache when it hit and from the
# mirror when it did not, then the headless shell. `action.yml` beside this
# and `locus/action/action.yml` run it: a composite action resolves a local
# `uses:` against the caller's repository, so the two share a script and not a
# step. The reasoning is in `action.yml`.
#
#   PLAYWRIGHT  the command that runs Playwright's command line
#   IMAGE       the runner image, or empty off a GitHub-hosted runner
#   HIT         `true` when the system packages came from the cache
set -euo pipefail
shopt -s nullglob

from_cache() {
  local files=(~/.cache/playwright-deps/*.deb)
  echo "${#files[@]} packages from the cache"
  if [ "${#files[@]}" -gt 0 ]; then
    sudo dpkg -i "${files[@]}"
  fi
}

# `timeout` stops the runner, and `sudo` does not pass a signal from its own
# process group on to apt, so apt is stopped here. Until it exits it holds the
# dpkg lock, and the second attempt fails on the lock.
attempt() {
  # Word splitting is wanted: the command may be two words, `bunx playwright`.
  # shellcheck disable=SC2086
  timeout 240 $PLAYWRIGHT install --with-deps --only-shell chromium && return 0
  sudo pkill -x apt-get || true
  for _ in $(seq 20); do pgrep -x apt-get > /dev/null || break; sleep 1; done
  sudo pkill -9 -x apt-get || true
  sudo dpkg --configure -a || true
  return 1
}

from_mirror() {
  sudo tee /etc/apt/apt.conf.d/90-playwright-deps > /dev/null <<'CONF'
Acquire::Retries "3";
Acquire::http::Timeout "20";
Acquire::https::Timeout "20";
APT::Keep-Downloaded-Packages "true";
CONF
  sudo apt-get clean
  dpkg-query -W -f='${binary:Package} ${Version}\n' | sort > "$RUNNER_TEMP/packages-before"
  if ! attempt; then
    echo "::warning::The first mirror stalled or failed. Trying again without it."
    cat /etc/apt/apt-mirrors.txt || true
    if [ -f /etc/apt/apt-mirrors.txt ] && [ "$(wc -l < /etc/apt/apt-mirrors.txt)" -gt 1 ]; then
      sudo sed -i 1d /etc/apt/apt-mirrors.txt
    fi
    attempt
  fi
  dpkg-query -W -f='${binary:Package} ${Version}\n' | sort > "$RUNNER_TEMP/packages-after"
  comm -13 "$RUNNER_TEMP/packages-before" "$RUNNER_TEMP/packages-after" > "$RUNNER_TEMP/packages-changed"
  local changed files=(/var/cache/apt/archives/*.deb)
  changed=$(wc -l < "$RUNNER_TEMP/packages-changed")
  echo "apt installed or upgraded $changed packages and kept ${#files[@]} files"
  if [ -z "${IMAGE:-}" ]; then
    return 0
  fi
  if [ "$changed" -ne "${#files[@]}" ]; then
    echo "::warning::apt kept ${#files[@]} files for $changed packages, so none are cached."
    return 0
  fi
  mkdir -p ~/.cache/playwright-deps
  cp "$RUNNER_TEMP/packages-changed" ~/.cache/playwright-deps/packages.txt
  if [ "${#files[@]}" -gt 0 ]; then
    cp "${files[@]}" ~/.cache/playwright-deps/
  fi
}

if [ "${HIT:-}" = 'true' ]; then
  from_cache
else
  from_mirror
fi

# shellcheck disable=SC2086
$PLAYWRIGHT install --only-shell chromium
