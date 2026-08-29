# AGENTS.md

This file provides guidance for AI agents and contributors working with code in
this repository.

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
| `bun run check` | Every guard, and nothing else. `check:<group>` for one group |
| `bun run fix` | Fixes what it can: ordering, formatting, tokens |
| `bun run regen` | Every generated file, in the one order that works |
| `bun run build` | Compiles TS. Runs `styles` and `analyze` first |
| `bun run analyze` | Regenerates custom-elements manifests |
| `cargo test --workspace` | Rust |

**`verify` never writes.** It runs `biome ci`, not `biome check --write`. A step
that edits your files cannot tell you whether they were correct. `fix` writes;
`check` and `verify` judge.

**A name runs a leaf or everything under it, and never both.** `check:css:tokens`
is one guard, `check:css` is the twenty in that group, `check` is all 78. The
groups are `api`, `css`, `gen`, `pkg`, `prose` and `spec`, and they sort by what
a guard reads rather than by what kind of fault it catches, because the useful
question after an edit is "what covers the thing I just touched" and never "run
me every consistency check".

**A bare name, if it exists, runs everything under it.** A family with no bare
name is fine: `gen`, `rs`, `smoke`, `probe`, `specs` and `visual` have none,
because a runner over them would be meaningless or wrong. What to avoid is a
bare name that is not a runner.

**Never add a bare `gen`.** Eleven generators have a `check:gen:` that judges
them, and several read what an earlier one wrote: `gen:reference` and
`gen:element-events` read the manifests `analyze` produces, `gen:tokens-reference`
reads what `gen:tokens-layer` emits, `gen:metrics` measures the built packages,
and `gen:content` and `gen:catalog` read the pages `gen:docs` filled. Run out of
order they each succeed and disagree with each other, and the failure surfaces in
CI as *"the tree is unchanged by verifying it"*, which names none of them. So
`regen` is the hand-written order and `gen:*` are its members: a `gen` assembled
from its own members would run them in whatever order they sorted in, producing
that exact failure under a name promising the opposite.

**A writer and its judge share a name.** `gen:reference` writes what
`check:gen:reference` reads. Add both, or the pair drifts silently: a check in
`verify` whose writer is not in `regen` is a red build with no published way out
of it.

**`verify` is CI's job, not a local ritual.** `verify.yml` runs all of it on every
push, sharded across `plan`, `checks`, `lint`, `types`, `tests` and four `browser`
jobs, on a clean checkout, and it is better at every part of that than a laptop
is.

**What CI cannot do is regenerate**, which is the one thing worth checking before
a push. `fusion/docs/token-reference.md is behind helix/styles/tokens.json` is a
red build that stays red until somebody runs `bun run gen:tokens-reference` and
pushes again, so `.githooks/pre-push` runs `biome ci`, `check:cli` and
the twelve generated-file checks and nothing else: seconds against ten minutes.
It judges and never writes, because a hook that edits the tree during `git push`
produces a push that does not contain the edits. `git push --no-verify` skips it.

Installed by `git config core.hooksPath .githooks`, which the `prepare` script
runs on `bun install`. No hook manager: husky and lefthook would each be a
dependency whose job is that one line.

**The generated-file list in the hook is kept in step with `regen` by hand**, and
the loop in `.githooks/pre-push` is the authority. If prose anywhere counts it and
disagrees, the loop is right.

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
- **`node_modules` holds two TypeScripts and that is correct.**
  `@custom-elements-manifest/analyzer` pins `typescript ~5.4.2` and resolves its
  own nested 5.4.5, which is what keeps `bun run analyze` working at all: it is
  a library consumer of the API that 7 no longer has. Upgrading the root does
  not touch it, and nothing should try to dedupe them.
- **A cem plugin must never import `typescript` itself.** The analyzer
  re-exports it and hands the module to each plugin as
  `analyzePhase({ node, ts })`, so the AST a plugin sees is 5.4's. Taking `ts`
  off the callback is what keeps `@fusion.dev/helix-cem` compiling under 7, and an
  import would pull 7's types onto 5.4's nodes.
- Config files are TypeScript (`*.config.ts`), so they are type-checked rather
  than failing at runtime on a typo. **Not all of them run under bun, and the
  exception has a floor.** `cem analyze` is a Node CLI with its own shebang, so
  `bun run analyze` hands it to whatever Node is on `PATH`. Below Node 22.18 it
  cannot load a `.ts` config, falls back to a default one, and writes a manifest
  with every Helix plugin missing while reporting success: measured on 18.16, a
  manifest 69,081 lines shorter. `engines.node` states the floor,
  `bun run check:pkg:node` enforces it, and CI pins it.

## Layout

```
helix/     styles core headless styled icons theme cem docs diagnostics
           gallery sandbox testing cli
cortex/    core trace engram docs
fusion/    docs site: what belongs to the company rather than to a product.
           `insights` is the published writing, and the queue and two
           generated references sit above it
tooling/   CI and build scripts, and shrinking
.local/    per-machine scratch, gitignored
```

- **Product domains at root, packages flat inside.** A new product gets a new
  top-level folder.
- **In `tooling/scripts`, flat is runnable and `lib/` is importable.** A hundred
  files sit flat and every one is invoked by a script, a workflow, `turbo.json`
  or the hook; six sit in `lib/` and nothing invokes any of them. So
  `ls tooling/scripts` answers "what can I run" and the answer is exactly the
  script names. A shebang is not the signal, which is worth saying because it
  looks like one: several of the flat scripts do not carry one and are invoked
  anyway.

  **Moving a module into `lib/` takes one thing beyond the import paths.**
  `workspace.mjs` and `theme-facts.mjs` derive the repository root from their own
  directory, so a file one level deeper resolves the root to `tooling/` and every
  check that reads a manifest fails at once.
- **A folder inside a tier is a component family, except under `shared/`.**
  `helix/styled/src/shared/field` and `helix/styled/src/shared/chart` hold
  stylesheets several families import, and they are not families.

  **The bar is a file more than one family imports**, and `helix component`'s `hooks` holds
  it: a sheet in there with one reader belongs inside that reader, and every
  folder under `shared/` is discovered rather than listed.

  **They cannot move to `@fusion.dev/helix-styles`**, which is the question they
  invite. That package ships document CSS; these are shadow styles, and
  `:host([terminus="ring"])` and `[part="label"]` mean nothing outside a shadow
  root.
- **The folder drops the domain prefix; the package name keeps it.**
  `helix/styled` is `@fusion.dev/helix`; `cortex/core` is the crate
  `fusion-cortex-core`. Scope searches by path (`cortex/core`), not folder name,
  since bare leaf names recur across domains.
- **`<domain>/docs` is a content package, not a site**: versioned MDX plus a
  typed registry. The site that renders it is separate and depends on it.
- **`fusion/` is the company tier, and it is a domain like the other two.** It
  holds what belongs to Fusion rather than to Helix or Cortex: the CLI, the
  writing, and the site that renders everything above it. `fusion/docs/insights`
  is what gets published, and the queue and the two generated references are
  infrastructure sitting above it.

  **The scope already said this.** `@fusion.dev/helix-*` and
  `@fusion.dev/cortex-*` name their domain; `@fusion.dev/*` bare names the
  company, which is why `@fusion.dev/insights` and `@fusion.dev/cli` carry no
  domain prefix while `@fusion.dev/helix-core` does.

  The insights are rendered by the site and are not of it, which is the same
  relationship `helix/docs` has to the docs site. Filing the published writing
  under `site/` would make replacing the renderer take the company's written
  arguments with it.

## Versioning: lockstep per domain

Every package within a domain shares one version; domains move independently.

Full-repo lockstep is wrong here because docs packages carry the version of what
they document: publishing a Cortex fix would bump the Helix docs to a version in
which nothing about Helix changed. Per-domain keeps the property that matters,
that `@fusion.dev/helix-headless@x` works with `@fusion.dev/helix@x`.

**Rust crates carry their own version and never inherit one.**
`[workspace.package]` holds the edition, the license and the toolchain floor,
which are facts about the workspace; a version is a fact about a domain.
`release.yml` computes `helix` and `cortex` from separate tags, so a shared field
would take two numbers and keep whichever stamped last. `check:pkg:publishable`
fails both on a crate taking `version.workspace = true` and on
`[workspace.package]` declaring a version at all.

**The version lives in the tag, not in the manifest.** Every manifest holds
`0.0.0-dev` and the release stamps the real number in CI seconds before packing.
Committing it back would need a bot whose push access outranks branch protection,
to record something `git tag` already holds. `helix-v1.4.0` means a release that
promoted; `helix-attempt-v1.4.0` means a number that was spent, and version
computation reads both so a failed release burns a number rather than poisoning
the next one.

**The crates are meant to publish, and crates.io cannot hold them privately.**
There is no private mode: a private Cargo release needs an alternate registry,
declared as `publish = ["name"]`. Until there is a consumer worth standing one up
for, `publish = false` is the honest setting, and anything needing a crate takes
it as a git dependency pinned to the `cortex-v*` tag the release already pushes.
`check:pkg:publishable` holds `publish` and `release.yml` to each other in both
directions, so the day the flag changes is the day the workflow has to.

## Naming

- **Verticals get descriptive names**: Fusion Design, Fusion Mind, Fusion
  Energy, Fusion Capital, Fusion Studio.
- **Products get evocative names**: Helix, Cortex. A module earns one only when
  it carries a differentiated idea: inside Cortex that is exactly three, Engram
  (memory), Trace (provenance), Recall (context). The rest stay descriptive.
- **npm scopes name the domain, not the audience**: `@fusion.dev/helix-*` and
  `@fusion.dev/cortex-*` for anything belonging to that product, `@fusion.dev/*`
  for what spans the company. Package names drop the product prefix:
  `@fusion.dev/helix`, not `@fusion.dev/helix-helix-styled`.
- **`private` decides what ships, and the scope does not.** A package can belong
  to Helix and still never leave: `@fusion.dev/helix-cem` is the analyzer
  configuration and `@fusion.dev/helix-sandbox` the editor and spec runner, both
  Helix byproducts and both build tooling for this repository. Naming them
  `@fusion.dev/*` to say "does not publish" would claim they are general Fusion
  tooling, which is the one thing they are not. `bun run check:pkg:publishable`
  enforces the rest: `@fusion.dev/*` is always private, a published package may
  never depend on an unpublished one, and every published package agrees on
  visibility.
- **CLI binaries drop `-cli`**: the crate `cortex-cli` ships `cortex`.

## Code style

- **Comment the contested, not the settled.** A comment earns its place when it
  stops someone undoing something on purpose: a trap that looks like a bug, a
  decision whose obvious-looking alternative is wrong, a constraint invisible
  from the code. Reasoning the code already shows does not need writing down,
  and neither does the history of how a comment reached its current wording. A
  rule enforced by a `check:` has that check as its record; say what the rule is
  and let the guard hold it.
- **No em dashes** in code, docs, comments, or copy. Use periods, colons,
  commas, or parentheses.
- **American spelling** everywhere, comments and prose alike. It is checked
  rather than asked for, because an unwritten convention is learned from the
  corpus: prose in the wrong dialect teaches the next contributor to write it,
  which is why comments are in scope and not only copy. `bun run fix:dialect`
  rewrites; `check:prose:dialect` judges.
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
`scripts`, then alphabetical. `bun run fix:order` applies it.

**`exports` conditions are order-sensitive**: they match top to bottom, so
`types` must precede `default` or TypeScript resolves the runtime entry and
reports the package as untyped. Biome's `useSortedKeys` breaks this, which is
why it is off for package.json.

## Where a fix lives

Identify the source of the problem and fix it there. A patch at the consumer
level masks an architectural gap. If the symptom appears in one consumer but the
cause is deeper, the fix still goes deeper.

## Commits

**No `Co-Authored-By` trailer.** `.claude/settings.json` sets
`includeCoAuthoredBy: false` to stop the one Claude Code adds by default. The
setting covers that tool and this checkout, so the rule is written here too:
authorship of a commit is whoever is accountable for it, and a trailer naming a
tool records which keyboard was used rather than who decided anything.

## Before a push

1. `bun run fix` if anything is unformatted or out of order.
2. `bun run regen` if you changed a generator's source. CI cannot do this for
   you and it is the one class of failure a push will not resolve on its own.
3. `git push`. The hook judges formatting, reachable host rules and the twelve
   generated files in seconds; `verify.yml` does the rest.
