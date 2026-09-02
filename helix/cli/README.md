# `helix`

The Rust crate behind the `helix` command. What the command *does* is documented
where it publishes from, in [npm/README.md](npm/README.md), because that is the
page a consumer reads on npm.

| Here | What it is |
|---|---|
| `src/` | The crate |
| `tests/` | Its contract tests |
| `npm/` | The published shim, `@fusion.dev/helix-cli`, which resolves or builds the binary |

The crate is `publish = false`: it reaches consumers through npm rather than
through crates.io, so the tag and the npm version are the record and the crate
rests at `0.0.0-dev`.

Conventions for this folder are in [../CONVENTIONS.md](../CONVENTIONS.md).
