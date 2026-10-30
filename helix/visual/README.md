# helix/visual

The Rust crate behind `helix visual`: Helix's visual tests, which picture each
page and compare it with a baseline kept in git. What the command does is
documented where it publishes from, in
[../cli/npm/visual/README.md](../cli/npm/visual/README.md), because that is the
page a consumer reads.

| Here | What it is |
|---|---|
| `src/` | The crate, `fusion-helix-visual`: the config, discovery, sharding, baselines, the environment fingerprint, the codecs, the diff, and the report |
| `action/` | The GitHub Action, with `action/browser`, the browser install it shares with Fusion's own workflows |

The rest lives with the command line that runs it:

| There | What it is |
|---|---|
| `helix/cli/src/args.rs` | The `visual` noun, whose verbs are this crate's `Visual` |
| `helix/cli/npm/visual/` | The capture driver that runs Playwright, `defineConfig`, and the config's types, shipped in `@fusion.dev/helix-cli` |
| `helix/cli/tests/visual.rs` | The contract tests for `helix visual compare` |
| `fusion/scripts/check-visual-run.mjs` | A whole run in a real browser, against a server with each fault planted |

Fusion runs it on every Helix example with the root
[visual.config.ts](../../visual.config.ts), and on five site pages with
[fusion/site/visual.config.ts](../../fusion/site/visual.config.ts).

## Decisions

Made by the owner on October 8, 2026.

- **A noun of `helix`.** Helix is the design system for any web project, and
  its tools sit under it: one install, one version, and one MCP server that can
  check a page and picture it.
- **A library crate and not a module of `helix/cli`**, so the config, the
  codecs, the diff, and the report keep the boundary they had as a command, and
  the scan and the theme code cannot reach into them.
- **A Rust core with capture in Node.** The binary holds the config, the
  discovery, the sharding, the baselines, the environment fingerprint, the
  codecs, the diff, and the report. Capture goes through a small Node driver
  that runs Playwright, shipped in `@fusion.dev/helix-cli`.
- **Playwright is an optional peer** of `@fusion.dev/helix-cli`, because a
  project that only scans or derives a theme never pictures a page.
- **The GitHub Action lives in this repository.**
- **A GitHub App is wanted**, in a later phase, so a retake can open its
  baselines pull request without a token the user stores.

## Releasing

It releases with Helix: a `feat(helix/visual)` subject is a Helix release, and
`binaries.yml` builds it into `helix` for each platform.
[RELEASING.md](../../.github/RELEASING.md) has the model.
