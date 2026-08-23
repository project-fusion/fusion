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
- Config files are TypeScript (`*.config.ts`), so they are type-checked rather
  than failing at runtime on a typo. **Not all of them run under bun, and the
  exception has a floor.** `cem analyze` is a Node CLI with its own shebang, so
  `bun run analyze` hands it to whatever Node is on `PATH`. Below Node 22.18 it
  cannot load a `.ts` config, falls back to a default one, and writes a manifest
  with every Helix plugin missing while reporting success: measured on 18.16, a
  manifest 69,081 lines shorter. `engines.node` states the floor,
  `bun run check:node` enforces it, and CI pins it.

## Layout

```
helix/     styles core headless web react icons theme cem docs gallery
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
that `@helix-io/headless@x` works with `@helix-io/web@x`.

The Rust workspace holds only Cortex crates today, so `[workspace.package]
version` *is* the Cortex version. **When Helix gains a Rust crate, split it** or
the two domains are silently back in full lockstep.

**The version lives in the tag, not in the manifest.** Every manifest holds
`0.0.0-dev` and the release stamps the real number in CI seconds before packing.
Committing it back would need a bot whose push access outranks branch
protection, to record something `git tag` already holds. `helix-v1.4.0` means a
release that promoted; `helix-attempt-v1.4.0` means a number that was spent, and
version computation reads both so a failed release burns a number rather than
poisoning the next one.

Eight packages publish and the Rust crates do not yet (`publish = false`), so a
Cortex release currently ships `@cortex-io/docs` alone.

**The crates are meant to publish, and crates.io cannot hold them privately.**
There is no private mode: a private Cargo release needs an alternate registry,
declared as `publish = ["name"]`. Until there is a consumer worth standing one
up for, `publish = false` is the honest setting, and anything needing a crate
takes it as a git dependency pinned to the `cortex-v*` tag the release already
pushes. `check:publishable` holds `publish` and `release.yml` to each other in
both directions, so the day the flag changes is the day the workflow has to.

## Naming

- **Verticals get descriptive names**: Fusion Design, Fusion Mind, Fusion
  Energy, Fusion Capital, Fusion Studio.
- **Products get evocative names**: Helix, Cortex. A module earns one only when
  it carries a differentiated idea: inside Cortex that is exactly three, Engram
  (memory), Trace (provenance), Recall (context). The rest stay descriptive.
- **npm scopes name the domain, not the audience**: `@helix-io/*` and
  `@cortex-io/*` for anything belonging to that product, `@fusion-io/*` for what
  spans the company. Package names drop the product prefix: `@helix-io/web`, not
  `@helix-io/helix-web`.
- **`private` decides what ships, and the scope does not.** A package can belong
  to Helix and still never leave: `@helix-io/cem` is the analyzer configuration
  and `@helix-io/sandbox` the editor and spec runner, both Helix byproducts and
  both build tooling for this repository. Naming them `@fusion-io/*` to say
  "does not publish" would file Helix-specific tooling beside the repository
  root and the site, and claim they are general Fusion tooling, which is the one
  thing they are not. `bun run check:publishable` enforces the rest:
  `@fusion-io/*` is always private, a published package may never depend on an
  unpublished one, and every published package agrees on visibility.
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
