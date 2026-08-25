# Working in this repo

Fusion Development Group. **The strategy folder is not in this repository.**
`docs/plan/` was removed when the history was rewritten for the public repository,
and it lives in the archive alongside the rest of what was taken out. Comments
here still cite it by name, `plan/00-thesis.md` and `plan/23-helix-docs.md` among
them, because the reasoning they carry is still why the code is shaped as it is;
the documents themselves are elsewhere. What remains in [`docs/`](docs/) is the
queue, the published writing, and two generated references.

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
- **TypeScript 7**, which is the native compiler: `typescript` publishes a
  `bin/tsc` shim over a platform binary, ships no `tsserver`, and exports no
  synchronous compiler API. An editor asked to use the workspace version wants
  `tsc --lsp --stdio` rather than a server script, and anything reaching for
  `ts.createProgram` has to take the `./unstable/*` surfaces instead.
  **`node_modules` holds two TypeScripts and that is correct.**
  `@custom-elements-manifest/analyzer` pins `typescript ~5.4.2` and resolves its
  own nested 5.4.5, which is what keeps `bun run analyze` working at all: it is
  a library consumer of the API that 7 no longer has. Upgrading the root does
  not touch it, and nothing should try to dedupe them. **A cem plugin must never
  import `typescript` itself.** The analyzer re-exports it and hands the module
  to each plugin as `analyzePhase({ node, ts })`, so the AST a plugin sees is
  5.4's. Taking `ts` off the callback is what keeps `@helix-io/cem` compiling
  under 7, and an import would pull 7's types onto 5.4's nodes. This floor is
  the analyzer's own. The Node one above it is ours, and belongs to the config
  format rather than to the analyzer.
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
helix/     styles core headless styled icons theme cem docs gallery sandbox
           testing cli
cortex/    core trace engram docs
site/      ui, the Next application that renders everything above and below
docs/      plan/ is the numbered strategy, insights/ is the published writing;
           the queue and two generated references sit above both, being
           infrastructure rather than either
tooling/   CI and build scripts
.local/    per-machine scratch, gitignored
```

- **Product domains at root, packages flat inside.** A new product gets a new
  top-level folder.
- **The folder drops the domain prefix; the package name keeps it.**
  `helix/styled` is `@helix-io/styled`; `cortex/core` is the crate `fusion-cortex-core`.
  Scope searches by path (`cortex/core`), not folder name, since bare leaf
  names recur across domains.
- **`<domain>/docs` is a content package, not a site**: versioned MDX plus a
  typed registry. The site that renders it is separate and depends on it.
- **`docs/` is the repository's own writing, grouped by what a file is**, and it
  is the one folder that is not a product domain. `plan/` is strategy, `insights/`
  is what gets published, and a package inside it is scoped `@fusion-io/*`
  because the writing belongs to the company rather than to any product.

  *Amended 24 Aug 2026, when `site/content` became `docs/insights`.* This said
  "domain folders at root" without qualification, so a package under `docs/` was
  a contradiction and the move was held on it for a day. The rule was right about
  what it was protecting, which is products scattering, and too broad about how
  it said so: `docs/` holds no product and never did.

  **What settled it was this file's own next bullet.** A `<domain>/docs` is a
  content package and *the site that renders it is separate*, which is exactly
  what `site/content` was not: filing the published writing under `site/` made it
  a part of the renderer, so replacing `site/ui` would have taken the company's
  written arguments with it. The insights are rendered by the site and are not of
  it, and that is the same relationship `helix/docs` already has to the docs
  site.

## Versioning: lockstep per domain

Every package within a domain shares one version; domains move independently.

Full-repo lockstep is wrong here because docs packages carry the version of what
they document: publishing a Cortex fix would bump the Helix docs to a version in
which nothing about Helix changed. Per-domain keeps the property that matters,
that `@helix-io/headless@x` works with `@helix-io/styled@x`.

**Rust crates carry their own version and never inherit one.**
`[workspace.package]` holds the edition, the license and the toolchain floor,
which are facts about the workspace; a version is a fact about a domain, and the
workspace is about to hold two. This said "split it when Helix gains a Rust
crate" until the split was done ahead of that crate, which is the right order:
`release.yml` computes `helix` and `cortex` from separate tags, so a shared
field would take two numbers and keep whichever stamped last. Three identical
lines today is what lets them differ tomorrow, and `check:publishable` fails
both on a crate taking `version.workspace = true` and on `[workspace.package]`
declaring a version at all.

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
  spans the company. Package names drop the product prefix: `@helix-io/styled`, not
  `@helix-io/helix-styled`.
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
- **American spelling** everywhere, comments and prose alike, held by
  `check:dialect`. It is checked rather than asked for because it was asked for
  once and did not survive: a sweep on 19 Aug 2026 took it from 658 occurrences
  to 239, and four days later it was 1,685 across 386 files. An unwritten
  convention is learned from the corpus, so prose in the wrong dialect teaches
  the next contributor to write it, which is why comments are in scope and not
  only copy. `bun run dialect` rewrites; `check:dialect` judges.
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
