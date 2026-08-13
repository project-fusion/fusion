# Working in this repo

Fusion Development Group. Strategy lives in [`docs/`](docs/); start with
[`docs/00-thesis.md`](docs/00-thesis.md).

Area rules load automatically: `.claude/rules/helix.md` for `helix/**`,
`.claude/rules/cortex.md` for `cortex/**`. To add a component, use the
`adding-helix-components` skill.

## Product framing

- **Two cores.** **Helix** is the DNA (design system). **Cortex** is the mind
  (memory, provenance, context). Products build *on top of* them.
- **Thesis: sovereignty at every scale.** Personal, then organizational, then
  national. Cheap intelligence and cheap energy are the mechanism.
- **The Sovereignty Constraint** governs every product:

  > No Fusion product may create a dependency its user cannot exit. The user
  > holds their own keys, data, and hardware. Fusion may operate a control
  > plane, never a chokepoint.

  Test any proposal with: *what happens to the user if Fusion shuts down
  tomorrow?* If they lose the thing, it is not a Fusion product.
- **Voice:** plural ("we"), engineer-targeted, spare. No marketing bombast.
- **Stage labels are honest.** Active ships with users. Building is real work,
  nothing shipped. Declared is committed direction, no work started. Never
  soften them.

## Commands

| Command | Does |
|---|---|
| `bun run verify` | Everything. Must pass before anything is called done |
| `bun run check` | Fixes what it can: ordering, formatting, tokens |
| `bun run build` | Compiles TS. Runs `styles` and `analyze` first |
| `bun run analyze` | Regenerates custom-elements manifests |
| `cargo test --workspace` | Rust |

**`verify` never writes.** It runs `biome ci`, not `biome check --write`. A step
that edits your files cannot tell you whether they were correct. `check` fixes;
`verify` judges.

## Stack

Rust for backend and substrate cores. TypeScript for frontend.

- **bun** as package manager. Not npm, pnpm, or yarn.
- **Turborepo** for TS tasks. **Cargo workspace directly** for Rust: putting
  Rust behind a JS runner adds indirection and loses incremental compilation.
- **Biome only** for TS/JS. `cargo fmt` and `clippy` for Rust.
- **Lit** with legacy decorators (`experimentalDecorators: true`,
  `useDefineForClassFields: false`).
- Config files are TypeScript (`*.config.ts`). The CLIs run under bun, which
  resolves TS natively, so configs are type-checked rather than failing at
  runtime on a typo.

## Layout

```
helix/     styles core headless web react icons theme cem docs
cortex/    core trace engram docs
docs/      company strategy, tracked
tooling/   CI and build scripts
.local/    per-machine scratch, gitignored
```

- **Domain folders at root, packages flat inside.** A new product gets a new
  top-level folder.
- **The folder drops the domain prefix; the package name keeps it.**
  `helix/web` is `@helix-io/web`; `cortex/core` is the crate `cortex-core`.
  Scope searches by path (`cortex/core`), not folder name, since bare leaf
  names recur across domains.
- **`<domain>/docs` is a content package, not a site**: versioned MDX plus a
  typed registry. The site that renders it is separate and depends on it.

## Versioning: lockstep per domain

Every package within a domain shares one version; domains move independently.

Full-repo lockstep is wrong here because docs packages carry the version of what
they document: publishing a Cortex fix would bump the Helix docs to a version in
which nothing about Helix changed. Per-domain keeps the property that matters,
that `@helix-io/react@x` works with `@helix-io/web@x`.

The Rust workspace holds only Cortex crates today, so `[workspace.package]
version` *is* the Cortex version. **When Helix gains a Rust crate, split it** or
the two domains are silently back in full lockstep.

Nothing is published: every package is `private: true`, every crate
`publish = false`.

## Naming

- **Verticals get descriptive names**: Fusion Design, Fusion Mind, Fusion
  Energy, Fusion Capital, Fusion Studio.
- **Products get evocative names**: Helix, Cortex. A module earns one only when
  it carries a differentiated idea: inside Cortex that is exactly three, Engram
  (memory), Trace (provenance), Recall (context). The rest stay descriptive.
- **npm scopes**: `@helix-io/*` and `@cortex-io/*` for outside adoption,
  `@fusion-io/*` for company-internal. Package names drop the product prefix:
  `@helix-io/web`, not `@helix-io/helix-web`.
- **CLI binaries drop `-cli`**: the crate `cortex-cli` ships `cortex`.

## Code style

- **No em dashes** in code, docs, comments, or copy. Use periods, colons,
  commas, or parentheses.
- **Alphabetize** object keys, interface members, and exported types
  (case-insensitive). Skip where order is semantic: positional arguments,
  middleware chains, CSS box-side shorthand, export conditions.
- **Always brace** `if`/`else`/`for`/`while` bodies.
- **Multiline JSDoc** on every `@property` and exported type member.
- **Specs are `*.spec.ts`**, colocated, excluded from `tsconfig` so they never
  reach `dist`.
- Rust: workspace lints are `clippy::pedantic`, `unsafe_code` forbidden. Fix
  findings rather than allowing them; comment any allow at its site.

### package.json key order

Identity first (`name`, `description`, `version`), then consumption fields, then
`scripts`, then alphabetical. `bun run order` applies it.

**`exports` conditions are order-sensitive**: they match top to bottom, so
`types` must precede `default` or TypeScript resolves the runtime entry and
reports the package as untyped. Biome's `useSortedKeys` breaks this, which is
why it is off for package.json.

## Where a fix lives

Identify the source of the problem and fix it there. A patch at the consumer
level masks an architectural gap. If the symptom appears in one consumer but the
cause is deeper, the fix still goes deeper.
