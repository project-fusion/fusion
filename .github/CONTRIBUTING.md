# Contributing

## Before anything

You need Bun 1.4.3 or later, Node 22.18 or later, and Rust 1.97 or later. Then:

```bash
bun install
```

**Install with bun.** The lockfile is `bun.lock`, and another package manager
will write a second one.

## The two commands

| Command | Does |
|---|---|
| `bun run fix` | Fixes what it can: ordering, formatting, tokens, dialect |
| `bun run verify` | Judges. Must pass before anything is called done |

**`verify` never writes.** It runs `biome ci`, because a step that edits your
files cannot tell you whether they were correct. Run `fix` while you work and
`check` for the guards alone. CI runs all of `verify` on every push to a pull
request.

Rust uses `cargo test --workspace`, `cargo fmt`, and `clippy`. Workspace lints
are `clippy::pedantic` with `unsafe_code` forbidden: fix each finding, and
comment any allow at its site.

## House style

Most of this is enforced, so `bun run fix` will tell you.
[`AGENTS.md`](../AGENTS.md) carries the rules and the reasoning behind them, and
is the one copy. These come up on a first change:

- **No em dashes**, in code, docs, comments or copy. Periods, colons, commas or
  parentheses.
- **Anything a user reads follows [VOICE.md](VOICE.md)**: the site, the docs, the
  reference, interface text and errors, and new code comments.
- **American spelling** everywhere, comments and prose alike. `bun run fix:dialect`
  rewrites and `fusion x prose`'s `dialect` judges. Comments are in scope because an
  unwritten convention is learned from the corpus.
- **Comments say why, not what.** A comment earns its place by recording a
  decision, a measurement, or a thing that was tried and did not work. Where
  there is a commit, an issue or a pull request to point at, link it.

## Where a fix lives

Identify the source of the problem and fix it there. A patch at the consumer
level masks an architectural gap. If the symptom appears in one consumer and
the cause is deeper, the fix still goes deeper.

## Adding a Helix component

There is a skill for it: `.agents/skills/add-component`. A component
is not one file. It is both tiers, tokens, specs on every part, manifest
metadata and an example, and `helix component --only stable` knows the difference.

The skill lives under `.agents/` because its content is agent-facing and only
the directory is one vendor's. `.claude/skills/<name>` is a symlink into it, so
Claude Code finds it where it looks and there is still exactly one copy to edit.
A second tool that reads a different directory gets a second symlink, never a
second file.

## Commits

Write what changed and why. Each subject is a conventional commit, such as
`fix(helix): …`, and the pull request title is one too, because the release reads
them to decide what to publish.

**No `Co-Authored-By` trailer.** Authorship is whoever is accountable for the
commit, and a trailer naming a tool does not record who decided anything.

## Contributor agreement

Opening a pull request accepts the [contributor agreement](CONTRIBUTING-AGREEMENT.md).
You keep your copyright and license your contribution under MIT. Name the origin
and license of any code in your pull request that is not yours.

## Pull requests

One change per pull request. `verify` has to pass. If your change is visual,
its baselines change with it, and the review is the diff on them. Baselines are
taken on Linux, because a baseline taken on macOS or Windows fails in CI.

- On Linux, `bun run visual:update` takes the new baselines.
- On another platform, push the change and let `verify` fail. The failed run
  carries the pictures it took. Run `bun run helix visual accept --run` with
  the address of the run to write them into your checkout, then review and
  commit them.
- On a branch of this repository, the failed run also pushes its pictures to
  `visual-preview/<number>` and links GitHub's comparison of them in the
  pull request's visual comment, where each one is drawn. The branch goes when
  the pictures pass or the pull request closes.
- A maintainer can also comment `/accept` on the pull request, which commits
  the run's pictures onto a branch of this repository, or `/retake` and the
  entries to take them again.

Keep a pull request small and about one thing. We will ask you to split a large
one before we merge it.
