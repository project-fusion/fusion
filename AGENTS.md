# AGENTS.md

This file provides guidance for AI agents and contributors working with code in
this repository.

Area conventions load automatically: [helix/CONVENTIONS.md](helix/CONVENTIONS.md)
for `helix/**`, [cortex/CONVENTIONS.md](cortex/CONVENTIONS.md) for `cortex/**`. To add a component, use the
`add-component` skill.

## Product framing

- **Two cores.** **Helix** is the DNA (design system). **Cortex** is the mind
  (memory, provenance, context). Products build *on top of* them.
- **Thesis: intelligence belongs in the foundation.** An intelligent design
  system, intelligent tooling and intelligent services, built on one substrate
  rather than bolted onto three.
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
| `bun run build` | Compiles TS. Runs `turbo run styles` and `analyze` first |
| `bun run analyze` | Writes the manifests and framework typings. Untracked, so a fresh clone needs it |
| `cargo test --workspace` | Rust |

**`verify` never writes.** It runs `biome ci`, not `biome check --write`. A step
that edits your files cannot tell you whether they were correct. `fix` writes;
`check` and `verify` judge.

**No generated file is committed.** Each one is written by the build of the
package that needs it and named in that task's `outputs`, so a fresh clone has
none of them until the thing that reads them has been built, and every rule that
reads one says so rather than reporting a clean tree it never looked at. The
`-- --check` runs stay: they no longer catch a commit somebody forgot, and they
still catch a hand-edit and a generator that has stopped being deterministic.

The reference pages, the metrics table and the landing claims were tracked until
then, on the argument that people read them in a diff. What that bought was a
file that could disagree with its generator; what it cost was a sweep, described
under [Before a push](#before-a-push), that twice took unreviewed work into a
commit named for something else.

**A name runs a leaf or everything under it, and never both.** `helix component`'s
`tokens` is one guard, `check:css` is every guard in that group, `check` is all
of them. The groups are `cli`, `css`, `gen`, `prose` and `spec`, and they sort by
what a guard reads rather than by what kind of fault it catches, because the
useful question after an edit is "what covers the thing I just touched" and never
"run me every consistency check". `check:withheld` stands beside the groups as
a leaf of its own: it reads the whole tree and the commits on their way in, so
no group is the thing it covers.

**Do not write down how many there are.** A count is derivable and each command
prints its own, so one written here is a second source of truth and always the
stale copy. Every count this paragraph once carried had rotted. That is the same
argument that makes the reference pages generated rather than typed, and it
applies to a number in a sentence as much as to a table.

The names are worth stating and the arithmetic is not, because the names are the
vocabulary somebody has to guess right to run the thing.

**A bare name, if it exists, runs everything under it.** A family with no bare
name is fine: `gen`, `rs`, `smoke`, `probe`, `specs` and `visual` have none,
because a runner over them would be meaningless or wrong. What to avoid is a
bare name that is not a runner.

**Never add a bare `gen`.** Every generator has a check that judges it, and
several read what an earlier one wrote: `gen:element-events` reads the
manifests `analyze` produces, `turbo run docs` reads the registry
`turbo run token-layer` emits, `gen:metrics` measures the built packages,
`turbo run content` and `turbo run catalog` read the pages `turbo run docs` filled, and
`turbo run catalog` reads what `turbo run content` writes on top of that. Run out of
order they each succeed and disagree with each other, and the failure surfaces in
CI as *"the tree is unchanged by verifying it"*, which names none of them. So
`regen` is the hand-written order and `gen:*` are its members: a `gen` assembled
from its own members would run them in whatever order they sorted in, producing
that exact failure under a name promising the opposite.

**A writer and its judge share a name.** `turbo run docs` writes what
`turbo run docs -- --check` reads. Add both, or the pair drifts silently: a check in
`verify` whose writer is not in `regen` is a red build with no published way out
of it.

**`verify` is CI's job, not a local ritual.** `verify.yml` runs all of it on every
push, sharded across `plan`, `warm`, `checks`, `lint`, `types`, `tests` and the
`browser` matrix, on a clean checkout, and it is better at every part of that than
a laptop is.

**Deleting a documentation page wants `turbo run docs` before `regen`.** `regen`
runs `analyze` near its start and `turbo run docs` near its end, so for every
step between the two the registry still names a page the tree no longer has. `catalog` skips it and says so now
rather than dying on it, but the run still writes a site missing that page until
the registry catches up, and the warning names the command.

**What CI cannot do is regenerate**, which is the one thing worth checking before
a push. `helix/docs/content/metrics.mdx is behind the built packages` is a red
build that stays red until somebody runs `bun run gen:metrics` and pushes again,
so `.githooks/pre-push` runs the withheld-name check, `biome ci`, `check:cli`
and the generated-file checks and nothing else: seconds against minutes.
It judges and never writes, because a hook that edits the tree during `git push`
produces a push that does not contain the edits. `git push --no-verify` skips it.

Installed by `git config core.hooksPath .githooks`, which the `prepare` script
runs on `bun install`. No hook manager: husky and lefthook would each be a
dependency whose job is that one line. The script asks whether it is in a
repository first, because `bun install` also runs where there is none: a
`vercel deploy` uploads files rather than cloning, and `git config` there exits
128 and takes the install down with it.

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
  than failing at runtime on a typo. **`cem analyze` runs as `bun --bun`, and
  the reason is its config.** It is a Node CLI with its own shebang, and under
  a Node below 22.18 it cannot load a `.ts` config, falls back to a default one,
  and writes a manifest with every Helix plugin missing while reporting
  success: measured on 18.16, a manifest 69,081 lines shorter. Run by bun it
  loads the config every time, and the manifests came back byte for byte the
  same. **Node still has a floor**, because what carries a Node shebang and is
  not run with `--bun` runs under it: Next's `bin` in `build` and `dev`, and
  npm in the release. `engines.node` states the floor,
  `fusion workspace --only node` holds `@types/node` to it, and the release
  workflows pin it.

## Layout

```
helix/     styles core headless styled icons theme cem docs diagnostics
           gallery sandbox testing cli templates create-app
cortex/    core trace engram docs
fusion/    cli docs rules scripts site: what belongs to the company rather than
           to a product. `docs/insights` is the published writing; `rules` is
           the crate both command lines take, which is what a rule is and not
           what either product's rules read
.local/    per-machine scratch, gitignored
```

- **The root holds configuration and the three documents.** Manifests,
  lockfiles, tool configs, the license, and `README`, `AGENTS`, `CLAUDE`.
  Anything a tool does not read at startup belongs to the package or the domain
  that owns it.
- **Product domains at root, packages flat inside.** A new product gets a new
  top-level folder.
- **A check belongs to a CLI noun; a script belongs where its output belongs.**
  Everything that judges the workspace is a rule under `fusion workspace`,
  `fusion prose`, `fusion spec` or `helix component`, reached from the root by
  one delegating script apiece. Everything that *writes* something lives in the
  package that owns what it writes, declared in that package's own manifest, so
  `helix/docs` builds the docs and `helix/styles` builds the token layer.

  **What is left over is `fusion/scripts`, and it is small on purpose.** A
  script goes there when it is genuinely cross-cutting and cannot be a rule: the
  ones that drive a browser, the pair that builds and runs the eval corpus, and
  the meta-check that floors the generators. Anything that could be a rule should be
  one, because a rule returns a count that `floors` can read and a script returns
  a sentence somebody has to parse.

  **In `fusion/scripts`, flat is runnable and `lib/` is importable.** Every flat
  file is invoked by a script, a workflow, `turbo.json` or the hook, and nothing
  invokes anything in `lib/`, so `ls fusion/scripts` answers "what can I run" and
  the answer is exactly the script names. A shebang is not the signal, which is
  worth saying because it looks like one: several of the flat scripts do not
  carry one and are invoked anyway.

  **Moving a module into `lib/` takes one thing beyond the import paths.**
  `workspace.mjs` and `theme-facts.mjs` derive the repository root from their own
  directory, so a file one level deeper resolves it one level short and every
  check that reads a manifest fails at once.
- **A folder inside a tier is a component family, except under `shared/`.**
  `helix/styled/src/shared/field` and `helix/styled/src/shared/chart` hold
  stylesheets several families import, and they are not families.

  **The bar is a file more than one family imports**, and `helix component`'s `shared` holds
  it from both sides: a file in there with one reader belongs inside that
  reader, a family's own sheet that another family composes belongs in there,
  and every folder under `shared/` is discovered rather than listed. It is not
  only stylesheets: `shared/mixin-control-surface` is the API half of the same
  idea, a pair of presentational properties three button families share.

  **They cannot move to `@fusion.dev/helix-styles`**, which is the question they
  invite. That package ships document CSS; these are shadow styles, and
  `:host([terminus="ring"])` and `[part="label"]` mean nothing outside a shadow
  root.
- **A component owns its markup and the sheet that styles it.** A rule reaching
  from one component's sheet into another's markup is the coupling that stops
  either being moved, and CSS modules punish it further: a class hashes per
  file, so one name in two sheets is two classes and a selector spanning two
  sheets matches nothing. Moving a component moves its rules in the same commit.
- **The folder drops the domain prefix; the package name keeps it.**
  `helix/styled` is `@fusion.dev/helix`; `cortex/core` is the crate
  `fusion-cortex-core`. Scope searches by path (`cortex/core`), not folder name,
  since bare leaf names recur across domains.
- **A package is reached by what it exports.** An import naming another
  package's `src/` or `dist/` pins that package's layout, so a file moves and a
  consumer that never asked for it breaks. Public declaration files live in
  `<package>/types/` and are named in `exports`, which is why no `.d.ts` sits
  beside a package root and none is copied into `src`.
- **`<domain>/docs` is a content package, not a site**: versioned MDX plus a
  typed registry. The site that renders it is separate and depends on it.
- **`fusion/` is the company tier, and it is a domain like the other two.** It
  holds what belongs to Fusion rather than to Helix or Cortex: the CLI, the
  writing, and the site that renders everything above it. `fusion/docs/insights`
  is what gets published.

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
would take two numbers and keep whichever stamped last. `fusion workspace`'s `publishable`
fails both on a crate taking `version.workspace = true` and on
`[workspace.package]` declaring a version at all.

**The tag is the record, and the two ecosystems differ.** The release computes
the number from the tag. It stamps that number into the **npm manifests** and
pushes the result to `main` through a GitHub App with a ruleset bypass, which
`release.yml` documents at the step that does it. The **crates rest at
`0.0.0-dev`**, because nothing stamps them. `helix-v1.4.0` means a release that
promoted; `helix-attempt-v1.4.0` means a number that was spent, and version
computation reads both so a failed release burns a number rather than poisoning
the next one.

**The crates are meant to publish, and crates.io cannot hold them privately.**
There is no private mode: a private Cargo release needs an alternate registry,
declared as `publish = ["name"]`. Until there is a consumer worth standing one up
for, `publish = false` is the honest setting, and anything needing a crate takes
it as a git dependency pinned to the `cortex-v*` tag the release already pushes.
The `publishable` rule holds `publish` and `release.yml` to each other in both
directions, so the day the flag changes is the day the workflow has to.

## Naming

- **Verticals get descriptive names**: Fusion Studio, Fusion Design, Fusion
  Mind.
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
  tooling, which is the one thing they are not. `fusion workspace --only publishable`
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
- **Measure it rather than assert it.** "Too small" ages into a claim nobody can
  check; "192 against a 240 floor" tells the next reader what to re-measure when
  they doubt it. Date a measurement that could drift.
- **No em dashes** in code, docs, comments, or copy. Use periods, colons,
  commas, or parentheses.
- **American spelling** everywhere, comments and prose alike. It is checked
  rather than asked for, because an unwritten convention is learned from the
  corpus: prose in the wrong dialect teaches the next contributor to write it,
  which is why comments are in scope and not only copy. `bun run fix:dialect`
  rewrites; `fusion prose`'s `dialect` judges.
- **Alphabetize** object keys, interface members, and exported types
  (case-insensitive). Skip where order is semantic: positional arguments,
  middleware chains, CSS box-side shorthand, export conditions.
- **A markdown table is alphabetical when its first column is a set, and left
  alone when it is a sequence.** A list of packages, of frameworks, of rules is
  a set, and a reader scans it for one row. A scale is not: `space-2xs` through
  `space-2xl`, the surface ladder, the layer stack and the separation policy all
  read as sequences, and sorting them turns the argument into a list. The same
  test `TOKEN_GROUPS` applies, and for the same reason.
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

**No `Co-Authored-By` trailer.** Authorship of a commit is whoever is
accountable for it, and a trailer naming a tool records which keyboard was used
rather than who decided anything. Claude Code adds one by default and
`includeCoAuthoredBy: false` stops it; that is a per-machine setting now, in
`~/.claude/settings.json`, because a tool's configuration is not a fact about
this repository.

## Before a push

1. `bun run fix` if anything is unformatted or out of order.
2. `bun run regen` if you changed a generator's source. CI cannot do this for
   you and it is the one class of failure a push will not resolve on its own.
3. `git push`. The hook judges formatting, reachable host rules and the
   generated files in seconds; `verify.yml` does the rest.

**Nothing generated is staged, because nothing generated is tracked.** These
files are written from the whole tree at once, so while they were committed any
of them could carry a change somebody else had made in the same checkout, and
`git add -A` after a `regen` was how that got swept into a commit named for
something else: twice in one session, once a private repository name. Ignoring
them ends the sweep rather than making it visible, and a merge conflict in one
is no longer possible.
