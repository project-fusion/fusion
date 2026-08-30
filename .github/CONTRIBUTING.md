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
| `bun run fix` | Fixes what it can: ordering, formatting, tokens, dialect |
| `bun run verify` | Judges. Must pass before anything is called done |

**`verify` never writes.** It runs `biome ci`, not `biome check --write`, because
a step that edits your files cannot tell you whether they were correct. Run
`fix` while you work, `check` for the guards alone, and `verify` before you open
a pull request.

Rust is `cargo test --workspace`, and `cargo fmt` and `clippy` rather than
Biome. Workspace lints are `clippy::pedantic` with `unsafe_code` forbidden: fix
a finding rather than allowing it, and comment any allow at its site.

## House style

Most of this is enforced, so `bun run fix` will tell you. The parts worth
knowing before you write:

- **No em dashes**, in code, docs, comments or copy. Periods, colons, commas or
  parentheses.
- **American spelling** everywhere, comments and prose alike. `bun run fix:dialect`
  rewrites and `fusion prose`'s `dialect` judges. Comments are in scope because an
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

There is a skill for it: `.agents/skills/adding-helix-components`. A component
is not one file. It is both tiers, tokens, specs on every part, manifest
metadata and an example, and `helix component --only stable` knows the difference.

The skill lives under `.agents/` because its content is agent-facing and only
the directory is one vendor's. `.claude/skills/<name>` is a symlink into it, so
Claude Code finds it where it looks and there is still exactly one copy to edit.
A second tool that reads a different directory gets a second symlink, never a
second file.

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
