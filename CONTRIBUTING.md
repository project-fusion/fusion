# Contributing

## Before anything

```bash
bun install
```

**bun, not npm or pnpm or yarn.** The lockfile is `bun.lock` and a different
package manager will write a second one.

## The two commands

| Command | Does |
|---|---|
| `bun run check` | Fixes what it can: ordering, formatting, tokens, dialect |
| `bun run verify` | Judges. Must pass before anything is called done |

**`verify` never writes.** It runs `biome ci`, not `biome check --write`, because
a step that edits your files cannot tell you whether they were correct. Run
`check` while you work and `verify` before you open a pull request.

Rust is `cargo test --workspace`, and `cargo fmt` and `clippy` rather than
Biome. Workspace lints are `clippy::pedantic` with `unsafe_code` forbidden: fix
a finding rather than allowing it, and comment any allow at its site.

## What the queue is

[`docs/19-queue.md`](docs/19-queue.md) is the issue tracker, in the repository,
under review, and versioned with the code it describes. Numbers are stable: a
finished item keeps its number, so a commit naming #49 still means something a
year from now. `bun run check:queue` prints the next free number and holds the
ordering.

If you are proposing work rather than doing it, a queue row is often the better
artifact than an issue, because the reasoning survives next to the code.

## House style

Most of this is enforced, so `bun run check` will tell you. The parts worth
knowing before you write:

- **No em dashes**, in code, docs, comments or copy. Periods, colons, commas or
  parentheses.
- **American spelling** everywhere, comments and prose alike. `bun run dialect`
  rewrites and `check:dialect` judges. Comments are in scope because an
  unwritten convention is learned from the corpus.
- **Alphabetize** object keys, interface members and exported types, skipping
  where order is semantic: positional arguments, middleware chains, CSS
  box-side shorthand, export conditions.
- **Always brace** `if`, `else`, `for` and `while` bodies.
- **Multiline JSDoc** on every `@property` and exported type member.
- **Specs are `*.spec.ts`**, colocated, excluded from `tsconfig`.

**Comments say why, not what.** The code already says what it does. A comment
earns its place by recording a decision, a measurement, or a thing that was
tried and did not work.

## Where a fix lives

Identify the source of the problem and fix it there. A patch at the consumer
level masks an architectural gap. If the symptom appears in one consumer and
the cause is deeper, the fix still goes deeper.

## Adding a Helix component

There is a skill for it: `.claude/skills/adding-helix-components`. A component
is not one file. It is both tiers, tokens, specs on every part, manifest
metadata and an example, and `bun run check:stable` knows the difference.

## Commits

Write what changed and why. **No `Co-Authored-By` trailer**: authorship is
whoever is accountable for the commit, and a trailer naming a tool records
which keyboard was used rather than who decided anything.

## Pull requests

One change per pull request. `verify` has to pass. If your change is visual,
`bun run visual:update` on Linux takes the new baselines and the review is the
diff on them.

We would rather read a small pull request that does one thing than a large one
that does four, and we will say so rather than merging it out of politeness.
