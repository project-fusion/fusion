# Working in this repo

Fusion Development Group. **The strategy folder is not in this repository.** It
was removed when the history was rewritten for the public repository, and it
lives in the archive alongside the rest of what was taken out. Comments
here still cite it by name, `plan/00-thesis.md` and `plan/23-helix-docs.md` among
them, because the reasoning they carry is still why the code is shaped as it is;
the documents themselves are elsewhere. What remains in
[`fusion/docs/`](fusion/docs/) is the queue, the published writing, and two
generated references.

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
is one guard, `check:css` is the twenty in that group, `check` is all 77. The
groups are `api`, `css`, `gen`, `pkg`, `prose` and `spec`, and they sort by what
a guard reads rather than by what kind of fault it catches, because the useful
question after an edit is "what covers the thing I just touched" and never "run
me every consistency check".

**`check` used to be the fixer**, which is why `fix` exists and why this table
has an extra row. A flat `check:*` namespace of 77 entries had no way to run a
subset and no way to run the whole set short of `verify`, which also compiles,
tests and runs two cargo passes.

**A bare name that is not a runner is the thing to avoid**, and every family had
one. `check` was the fixer, `tokens` wrote the reference its own
`check:tokens-reference` judged, `dev` did not run `dev:watch` and `test` did not
run `test:template`. They are `watch` and `smoke:template` now, and `fix` runs
all five of its members rather than three of them.

**A family with no bare name is fine.** `gen`, `rs`, `smoke`, `probe`, `specs`
and `visual` have none, because a runner over them would either be meaningless or
wrong: `smoke:template` takes a domain and a registry tag, and the note above
says why `gen` must not have one. The rule is that a bare name, if it exists,
runs everything under it. It does not say one has to exist.

**`regen` exists because the order is not obvious and getting it wrong is a red
build.** Eleven generators have a `check:gen:` that judges them, and several read
what an earlier one wrote: `gen:reference` and `gen:element-events` read the
manifests `analyze` produces, `gen:tokens-reference` reads what
`gen:tokens-layer` emits, `gen:metrics` measures the built packages, and
`gen:content` and `gen:catalog` read the pages `gen:docs` filled. Run out of
order they each succeed and disagree with each other, and the failure surfaces in
CI as *"the tree is unchanged by verifying it"*, which names none of them. The
order was carried in a conversation until it was got wrong twice in one night; it
is a script now.

**So `gen` is the one family with no runner, and that is deliberate.** Everywhere
else a bare name runs everything beneath it, which is safe because the members
are independent. These are not: a `gen` assembled from its own members would run
them in whatever order they sorted in, and the failure it produced would be the
exact one the paragraph above is about, under a name promising the opposite.
`regen` is the hand-written order and `gen:*` are its members.

**A writer and its judge share a name.** `gen:reference` writes what
`check:gen:reference` reads. That pairing was kept by hand and lost twice,
`element-events` and `themed-page` each landing in one list and not the other,
and a third time in `catalog`, which is regenerated and has no judge at all.
Three of them did not even share a word before this: `check:gen:eval` judged
`eval:build`, and `eval` was a different command that ran the corpus.

**`verify` is CI's job, not a local ritual.** `verify.yml` runs all of it on every
push, sharded across `plan`, `checks`, `lint`, `types`, `tests` and four `browser`
jobs, on a clean checkout, and it is better at every part of that than a laptop
is. Running it locally before pushing duplicates a ten minute gate that already
exists.

**What CI cannot do is regenerate**, which is the one thing worth checking before
a push. `fusion/docs/token-reference.md is behind helix/styles/tokens.json` is
a red build that stays red until somebody runs `bun run gen:tokens-reference`
and pushes again, so `.githooks/pre-push` runs `biome ci`, `check:css:reachable`
and the twelve generated-file checks and nothing else: 9 seconds against ten
minutes. It judges
and never writes, because a hook that edits the tree during `git push` produces
a push that does not contain the edits. `git push --no-verify` skips it.

**The count is load-bearing and this sentence has been wrong before.** It said
seven while the loop held eleven, because the loop grows whenever a generator
does and the prose does not. The loop is the authority; if they disagree again,
the loop is right.

Installed by `git config core.hooksPath .githooks`, which the `prepare` script
runs on `bun install`. No hook manager: husky and lefthook would each be a
dependency whose job is that one line, and lefthook's parallelism buys nothing
against seven checks that finish in seconds.

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
  5.4's. Taking `ts` off the callback is what keeps `@fusion.dev/helix-cem` compiling
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
  `bun run check:pkg:node` enforces it, and CI pins it.

## Layout

```
helix/     styles core headless styled icons theme cem docs gallery sandbox
           testing cli
cortex/    core trace engram docs
fusion/    docs today, cli and site to follow: what belongs to the company
           rather than to a product. `insights` is the published writing, and
           the queue and two generated references sit above it
tooling/   CI and build scripts, and shrinking
.local/    per-machine scratch, gitignored
```

- **Product domains at root, packages flat inside.** A new product gets a new
  top-level folder.
- **In `tooling/scripts`, flat is runnable and `lib/` is importable.** 101 files
  sit flat and every one is invoked by a script, a workflow, `turbo.json` or the
  hook; six sit in `lib/` and nothing invokes any of them. So `ls
  tooling/scripts` answers "what can I run" and the answer is exactly the script
  names.

  **The rule existed and was half applied.** `lib/` was added 22 Aug 2026 and
  took the three modules written after it, while `workspace.mjs`,
  `theme-facts.mjs` and `theme-intents.mjs` stayed flat among the hundred
  commands, which is where a reader looks for something to run. Moving them
  needed one thing beyond the import paths: both `workspace.mjs` and
  `theme-facts.mjs` derive the repository root from their own directory, so a
  file one level deeper resolved the root to `tooling/` and every check that
  reads a manifest failed at once.

  A shebang is not the signal, which is worth saying because it looks like one:
  thirteen modules do not carry it and nine of those are invoked anyway.
- **A folder inside a tier is a component family, except under `shared/`.**
  `helix/styled/src/shared/field` and `helix/styled/src/shared/chart` hold
  stylesheets several families import, and they are not families: `field/` is
  taken by seventeen of them and `chart/series.css` by four. They sat directly in
  `src/` until 26 Aug 2026, where they sorted among ninety families and read like
  two more, which is the only thing that was wrong with them.

  **The bar is a file more than one family imports**, and `check:css:hooks` holds it:
  a sheet in there with one reader belongs inside that reader, and every folder
  under `shared/` is discovered rather than listed. That rule is separate from the
  naming exemption which lets `--chart-*` not be named after the family reading
  it, because granting an exemption is a decision and `field/` needs the first
  rule while declaring no hooks at all.

  **They cannot move to `@fusion.dev/helix-styles`**, which is the question they invite.
  That package ships document CSS; these are shadow styles, and `:host([terminus="ring"])`
  and `[part="label"]` mean nothing outside a shadow root.
- **The folder drops the domain prefix; the package name keeps it.**
  `helix/styled` is `@fusion.dev/helix`; `cortex/core` is the crate `fusion-cortex-core`.
  Scope searches by path (`cortex/core`), not folder name, since bare leaf
  names recur across domains.
- **`<domain>/docs` is a content package, not a site**: versioned MDX plus a
  typed registry. The site that renders it is separate and depends on it.
- **`fusion/` is the company tier, and it is a domain like the other two.** It
  holds what belongs to Fusion rather than to Helix or Cortex: the CLI, the
  writing, and the site that renders everything above it. `fusion/docs/insights`
  is what gets published, and the queue and the two generated references are
  infrastructure sitting above it.

  **The scope already said this.** `@fusion.dev/helix-*` and
  `@fusion.dev/cortex-*` name their domain; `@fusion.dev/*` bare names the company, which is why
  `@fusion.dev/insights` and `@fusion.dev/cli` carry no domain prefix while
  `@fusion.dev/helix-core` does. The folder now matches the scope it was always
  published under.

  *Amended 24 Aug 2026, when `site/content` became `docs/insights`.* The rule
  then read "domain folders at root" without qualification, so a package under
  `docs/` was a contradiction and the move was held on it for a day. It was
  right about what it was protecting, which is products scattering, and too
  broad about how it said so.

  *Amended again 28 Aug 2026, and this is the reason the first amendment was
  needed.* `docs/` and `site/` were company-tier folders that had no company
  tier to sit in, so each had to be argued for as an exception. Folding them
  into `fusion/` makes them ordinary, and the exception disappears rather than
  gaining a third clause. Three domains, each a folder, each a version line.

  **What settled it was this file's own next bullet.** A `<domain>/docs` is a
  content package and *the site that renders it is separate*, which is exactly
  what `site/content` was not: filing the published writing under `site/` made it
  a part of the renderer, so replacing `fusion/site` would have taken the company's
  written arguments with it. The insights are rendered by the site and are not of
  it, and that is the same relationship `helix/docs` already has to the docs
  site.

## Versioning: lockstep per domain

Every package within a domain shares one version; domains move independently.

Full-repo lockstep is wrong here because docs packages carry the version of what
they document: publishing a Cortex fix would bump the Helix docs to a version in
which nothing about Helix changed. Per-domain keeps the property that matters,
that `@fusion.dev/helix-headless@x` works with `@fusion.dev/helix@x`.

**Rust crates carry their own version and never inherit one.**
`[workspace.package]` holds the edition, the license and the toolchain floor,
which are facts about the workspace; a version is a fact about a domain, and the
workspace is about to hold two. This said "split it when Helix gains a Rust
crate" until the split was done ahead of that crate, which is the right order:
`release.yml` computes `helix` and `cortex` from separate tags, so a shared
field would take two numbers and keep whichever stamped last. Three identical
lines today is what lets them differ tomorrow, and `check:pkg:publishable` fails
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
Cortex release currently ships `@fusion.dev/cortex-docs` alone.

**The crates are meant to publish, and crates.io cannot hold them privately.**
There is no private mode: a private Cargo release needs an alternate registry,
declared as `publish = ["name"]`. Until there is a consumer worth standing one
up for, `publish = false` is the honest setting, and anything needing a crate
takes it as a git dependency pinned to the `cortex-v*` tag the release already
pushes. `check:pkg:publishable` holds `publish` and `release.yml` to each other in
both directions, so the day the flag changes is the day the workflow has to.

## Naming

- **Verticals get descriptive names**: Fusion Design, Fusion Mind, Fusion
  Energy, Fusion Capital, Fusion Studio.
- **Products get evocative names**: Helix, Cortex. A module earns one only when
  it carries a differentiated idea: inside Cortex that is exactly three, Engram
  (memory), Trace (provenance), Recall (context). The rest stay descriptive.
- **npm scopes name the domain, not the audience**: `@fusion.dev/helix-*` and
  `@fusion.dev/cortex-*` for anything belonging to that product, `@fusion.dev/*` for what
  spans the company. Package names drop the product prefix: `@fusion.dev/helix`, not
  `@fusion.dev/helix-helix-styled`.
- **`private` decides what ships, and the scope does not.** A package can belong
  to Helix and still never leave: `@fusion.dev/helix-cem` is the analyzer configuration
  and `@fusion.dev/helix-sandbox` the editor and spec runner, both Helix byproducts and
  both build tooling for this repository. Naming them `@fusion.dev/*` to say
  "does not publish" would file Helix-specific tooling beside the repository
  root and the site, and claim they are general Fusion tooling, which is the one
  thing they are not. `bun run check:pkg:publishable` enforces the rest:
  `@fusion.dev/*` is always private, a published package may never depend on an
  unpublished one, and every published package agrees on visibility.
- **CLI binaries drop `-cli`**: the crate `cortex-cli` ships `cortex`.

## Commits

- **No `Co-Authored-By` trailer.** Claude Code adds one by default; `.claude/settings.json`
  sets `includeCoAuthoredBy: false` to stop it. The setting covers this tool and
  this checkout, so the rule is written here too: authorship of a commit is
  whoever is accountable for it, and a trailer naming a tool records which
  keyboard was used rather than who decided anything.

## Code style

- **No em dashes** in code, docs, comments, or copy. Use periods, colons,
  commas, or parentheses.
- **American spelling** everywhere, comments and prose alike, held by
  `check:prose:dialect`. It is checked rather than asked for because it was asked for
  once and did not survive: a sweep on 19 Aug 2026 took it from 658 occurrences
  to 239, and four days later it was 1,685 across 386 files. An unwritten
  convention is learned from the corpus, so prose in the wrong dialect teaches
  the next contributor to write it, which is why comments are in scope and not
  only copy. `bun run fix:dialect` rewrites; `check:prose:dialect` judges.
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
