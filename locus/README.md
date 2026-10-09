# locus/

**Fusion Locus**, visual regression testing with baselines kept in git.

**Building.** Phases 0 and 1 are done, and phase 2 is underway. `locus test`
and `locus update` picture HTML files, a server's pages, Storybook stories,
and JSON catalogs, compare by pixel or by structural similarity, and write a
report that `locus report` opens. `locus compare` compares two PNG files, and
`action/` is the GitHub Action. Fusion runs it on every Helix example with the
root [locus.config.ts](../locus.config.ts), and on five site pages with
[fusion/site/locus.config.ts](../fusion/site/locus.config.ts). What each later
phase adds is the roadmap in [cli/npm/README.md](cli/npm/README.md), the page
npm shows.

Packages are flat inside this folder, one directory each, the same arrangement
`helix/` uses.

| Package | Publishes as | What it is |
|---|---|---|
| `cli` | none | the Rust core, the crate `fusion-locus-cli`, which builds `locus` |
| `cli/npm` | `locus` | the command, its shim, and the Node driver that runs Playwright |
| `cli/platforms/*` | `locus-<platform>` | the binary for one platform, an optional dependency of `locus` |

`action` beside `cli` is the GitHub Action, with `action/browser`, the browser
install it shares with Fusion's own workflows. `app`, for the GitHub App, is
planned after it.

## Decisions

Made by the owner on October 8, 2026.

- **The name is Locus.** The package is `@fusion.dev/locus`, the command is
  `locus`, the folder is `locus/`, the release tags are `locus-v*`, and prose
  says Fusion Locus. A locus is a gene's fixed position on a chromosome, as a
  baseline is the fixed point every picture is compared with, and the name sits
  in one family with Helix and Cortex. It was Proof until the owner renamed it,
  before anything was published, on October 8, 2026. Two things share the name
  near it: a recent command line that runs AI coding agents, and `locust`, a
  load-testing tool one letter away.
- **One visibility for every package.** Locus publishes with the same
  `publishConfig.access` as every other package, and changes with them when
  they go public. `fusion workspace`'s `publishable` holds them to one value.
- **MIT**, the license of the rest of this repository.
- **The GitHub Action lives in this repository.**
- **A GitHub App is wanted**, in a later phase, so a retake can open its
  baselines pull request without a token the user stores.
- **A Rust core with capture in Node.** The binary holds the config, the CLI,
  discovery, sharding, baselines, the environment fingerprint, the codecs, the
  diff, and the report. Capture goes through a small Node driver that runs
  Playwright, shipped in the same npm package, the way `helix` ships its
  binary through platform packages.

## Releasing

The lane is Helix's, with `locus` as the domain. A `feat(locus)` or other
releasing subject puts Locus in the release matrix, `release.yml` computes the
number from the `locus-v*` and `locus-attempt-v*` tags, `binaries.yml` builds
`locus` for each platform, and `place-binaries.sh locus` puts each binary in its
platform package before `publish.mjs` packs them.
[RELEASING.md](../.github/RELEASING.md) has the model.

**Locus is held.** `held` in `fusion.json` keeps it out of the release, so a
`feat(locus)` merge builds and tests it, publishes nothing, and spends no
number. Trusted publishing cannot publish a package the registry has never
seen, so the first publish is a person's: bootstrap the placeholders, register
trusted publishing, then delete the entry.
[RELEASING.md](../.github/RELEASING.md#a-held-domain) has the steps.
