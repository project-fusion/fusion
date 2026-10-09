# `locus`

The Rust crate behind the `locus` command. What the command does is documented
where it publishes from, in [npm/README.md](npm/README.md), because that is the
page a consumer reads on npm.

| Here | What it is |
|---|---|
| `npm/` | The published package, `@fusion.dev/locus`: the shim that resolves or builds the binary, and the capture driver |
| `platforms/` | One package per platform, each carrying the binary the release builds for it |
| `src/` | The crate |
| `tests/` | Its contract tests |

The crate is `publish = false`: it reaches consumers through npm, so the tag
and the npm version are the record and the crate rests at `0.0.0-dev`.
