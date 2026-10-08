# proof/

**Fusion Proof**, visual regression testing with baselines kept in git.

**Building.** Phase 0 is done: the domain, the packages, and the release lane.
Nothing captures or compares yet, and `proof` answers `--version` and `--help`.
What each later phase adds is the roadmap in
[cli/npm/README.md](cli/npm/README.md), the page npm shows.

Packages are flat inside this folder, one directory each, the same arrangement
`helix/` uses.

| Package | Publishes as | What it is |
|---|---|---|
| `cli` | none | the Rust core, the crate `fusion-proof-cli`, which builds `proof` |
| `cli/npm` | `proof` | the command, its shim, and the Node driver that runs Playwright |
| `cli/platforms/*` | `proof-<platform>` | the binary for one platform, an optional dependency of `proof` |

Two folders are planned beside `cli`: `action` for the GitHub Action in phase 2,
and `app` for the GitHub App after it.

## Decisions

Made by the owner on October 8, 2026.

- **The name is Proof.** The package is `@fusion.dev/proof`, the command is
  `proof`, the folder is `proof/`, the release tags are `proof-v*`, and prose
  says Fusion Proof.
- **One visibility for every package.** Proof publishes with the same
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

The lane is Helix's, with `proof` as the domain. A `feat(proof)` or other
releasing subject puts Proof in the release matrix, `release.yml` computes the
number from the `proof-v*` and `proof-attempt-v*` tags, `binaries.yml` builds
`proof` for each platform, and `place-binaries.sh proof` puts each binary in its
platform package before `publish.mjs` packs them.
[RELEASING.md](../.github/RELEASING.md) has the model.

**The first publish is a person's**, because trusted publishing cannot publish
a package the registry has never seen. Until the placeholders exist the
release refuses Proof before it allocates a number:
[RELEASING.md](../.github/RELEASING.md#a-new-package).
