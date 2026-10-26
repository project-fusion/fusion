#!/usr/bin/env bash
# Stops the compile a step left running, so its target directory can be saved.
#
# **A step that runs out of time ends its own shell, and cargo goes on under
# it.** On run 38940234854 every Rust job ran out of time on a cold cache, and
# every progress entry failed to save: tar found objects removed and
# directories changed as it read them, because rustc was still writing them.
# This sends the compile a stop and waits up to 30 seconds for it to end, then
# kills what is left. An object rustc did not finish has no fingerprint, so the
# next run compiles it again.
set -uo pipefail
names='cargo|cargo-nextest|rustc|clippy-driver'
pkill -TERM -x "$names" || true
for _ in $(seq 30); do
  pgrep -x "$names" >/dev/null || exit 0
  sleep 1
done
pkill -KILL -x "$names" || true
sleep 1
