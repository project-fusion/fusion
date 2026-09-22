#!/usr/bin/env bash
# What Vercel runs to install the workspace, and the `helix` binary with it.
#
# **The site's build writes every manifest, and a manifest is Rust's now.** It
# builds each helix package, each of those runs `analyze`, and `analyze` runs
# `helix manifest build`. That was `@custom-elements-manifest/analyzer` until
# it was replaced, which was JavaScript and ran anywhere bun did; the builder
# has no Rust toolchain and nothing else hands it a binary. GitHub's jobs get
# one from `.github/actions/helix`, restored from a cache Vercel cannot read,
# and turbo's remote cache is no use either: a preview starts building the
# moment a commit lands, before any job has put a manifest in it.
#
# **So it is compiled here, once per deploy.** Measured at seventeen seconds
# cold on a laptop and twenty-seven megabytes, which on a builder with a
# minimal toolchain to fetch first comes to about a minute.
#
# The binary lands in `target/debug/`, which is where
# `helix/cli/npm/bin.mjs` looks once it finds no `HELIX_BIN` and no cargo on
# the path: the build step runs in a fresh shell, and the toolchain this puts
# in `~/.cargo` is not on its path.
#
# `1.96` is the toolchain CI builds with, and the floor `rust-version` names.
set -euo pipefail

bun install

# **The toolchain is asked for by version, not accepted because one is there.**
# The builder carries a rustc of its own, 1.92 when this was written, and the
# first version of this script used whatever `cargo` it found: that cleared a
# floor of 1.90 by luck and failed the day the floor moved to 1.96, with
# `rustc 1.92.0 is not supported`. So rustup installs the pinned one beside
# whatever is there, and the build names it.
if ! command -v rustup >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 --retry 5 --silent --show-error --fail https://sh.rustup.rs \
    | RUSTUP_INIT_SKIP_PATH_CHECK=yes sh -s -- -y --profile minimal --default-toolchain none --no-modify-path
fi
# shellcheck source=/dev/null
[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"
rustup toolchain install 1.96 --profile minimal

cargo +1.96 build -p fusion-helix-cli --locked
