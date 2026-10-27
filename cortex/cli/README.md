# `cortex`

The Rust crate behind the `cortex` command. What the command does is documented
where it publishes from, in [npm/README.md](npm/README.md), and in the Cortex
docs.

| Here | What it is |
|---|---|
| `src/` | The crate |
| `tests/` | The scripted session, on SQLite, Postgres, and Ollama |
| `demo/` | A week of notes and the script that answers for it |
| `npm/` | The published launcher, `@fusion.dev/cortex-cli`, which runs the binary |
| `platforms/` | One package per platform, each carrying the binary |

The crate is `publish = false`: it reaches consumers through npm, so the tag and
the npm version are the record and the crate rests at `0.0.0-dev`.
