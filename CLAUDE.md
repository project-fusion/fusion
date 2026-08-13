# Working in this repo

Fusion Development Group. Strategy lives in [`docs/`](docs/); start with
[`docs/00-thesis.md`](docs/00-thesis.md).

## Product framing

- **Two cores, one thesis.** **Helix** is the DNA (design system, tokens,
  components). **Cortex** is the mind (memory, provenance, context, reasoning).
  Products are built *on top of* them, never presented as co-equal with them.
- **Thesis: sovereignty, at every scale.** Personal first, then organizational,
  then national. Abundance of intelligence and energy is the mechanism.
- **The Sovereignty Constraint** governs every product:

  > No Fusion product may create a dependency that its user cannot exit. The
  > user holds their own keys, data, and hardware. Fusion may operate a control
  > plane, never a chokepoint. Every product must keep working if Fusion
  > disappears.

  The test for anything proposed: *what happens to the user if Fusion shuts down
  tomorrow?* If the answer is "they lose the thing," it is not a Fusion product.

- **Voice:** plural ("we"), engineer-targeted, spare and direct. No marketing
  bombast.
- **Stage labels are honest.** Active ships with users. Building is real work,
  nothing shipped. Declared is committed direction, no work started. Never
  soften these.

## Stack

**Rust** for backend and substrate cores. **TypeScript** for frontend.

| Concern | Tool |
|---|---|
| Package manager | **bun**. Not npm, pnpm, or yarn |
| TS task runner | **Turborepo**. `bun run build`, `bun run test` |
| Rust | **Cargo workspace directly**, not wrapped by a JS runner |
| Lint and format | **Biome only** for TS/JS. `cargo fmt` + `clippy` for Rust |
| Components | **Lit** with legacy decorators (`experimentalDecorators: true`, `useDefineForClassFields: false`) |

`bun run verify` runs everything: lint, typecheck, manifests, TS tests, clippy,
Rust tests. It must pass before anything is called done.

**`verify` never writes.** It runs `biome ci`, not `biome check --write`. A
verification step that edits your files cannot tell you whether the files were
correct, and in CI it reports success on a tree nobody reviewed. `bun run check`
is the one that fixes things.

### package.json key order

Identity first (`name`, `description`, `version`), then how the package is
consumed, then `scripts`, then everything else alphabetically. `bun run order`
applies it and runs as part of `check`.

Alphabetizing the whole file buries `name` under `devDependencies`. Worse,
**`exports` conditions are order-sensitive**: they match top to bottom, so
`types` must precede `default` or TypeScript resolves the runtime entry and
reports the package as untyped. Biome's `useSortedKeys` assist reorders them and
silently breaks resolution, which is why it is turned **off for package.json**
in `biome.json` and `tooling/scripts/order-manifests.mjs` owns that file's
ordering instead.

Cargo is a first-class monorepo tool on its own. Do not put Rust behind Nx or
Turbo; the wrapper adds indirection and takes away incremental compilation.

## Layout

Domain folders at the repo root, packages flat inside them. A new product gets a
new top-level folder.

```
helix/     styles core headless web react icons theme cem docs
cortex/    core trace engram docs
docs/      company strategy, tracked
.local/    per-machine scratch, gitignored
tooling/   shared CI and script infrastructure
```

`<domain>/docs` is a **content package**, not a site: versioned MDX plus a typed
registry. The site that renders it is a separate app and depends on this. That
seam is what lets one site serve several documentation versions, and what makes
docs versionable at all.

## Versioning: lockstep per domain

**Every package within a domain shares one version. Domains move
independently.**

| Domain | Version | Covers |
|---|---|---|
| Helix | one | `@helix-io/*`, including `docs` |
| Cortex | one | `cortex-*` crates, `@cortex-io/*` |

Full-repo lockstep is the obvious alternative and it is wrong here for one
concrete reason: docs packages carry the version of the thing they document. If
every package moved together, publishing a Cortex fix would bump the Helix docs
to a version in which nothing about Helix changed, and `helix.fusion.dev/v0.4`
would document a release that never happened.

Per-domain lockstep keeps the property that actually matters, which is that
`@helix-io/react@x` is always known to work with `@helix-io/web@x`. There is no
compatibility matrix inside a domain, and no meaningless version churn across
them.

Today the Rust workspace contains only Cortex crates, so
`[workspace.package] version` *is* the Cortex version. **When Helix gains a Rust
crate, that inherited version has to be split** into per-crate versions, or
Helix and Cortex are silently back in full lockstep.

Nothing is published yet: every npm package is `private: true` and every crate
is `publish = false`. Changing this policy is free right now and expensive
later.

**The folder drops the domain prefix; the package name keeps it.** `helix/web`
is the package `@helix-io/web`; `cortex/core` is the crate `cortex-core`. Cargo
permits a crate name that differs from its directory. Consequence worth knowing:
bare leaf names (`core`, `web`) recur across domains, so scope searches by path
(`cortex/core`), not by folder name.

## Naming

- **Verticals get descriptive names**: Fusion Design, Fusion Mind, Fusion
  Energy, Fusion Capital, Fusion Studio. Legible to a visitor in one second.
- **Products get evocative names**: Helix, Cortex. What people install and say.
- A module earns an evocative name only when it carries a differentiated idea.
  Inside Cortex that is exactly three: **Engram** (memory), **Trace**
  (provenance), **Recall** (context assembly). Everything else stays
  descriptive: `cortex-reason`, `cortex-policy`, `cortex-eval`.
- npm scopes: **`@helix-io/*`** and **`@cortex-io/*`** for things meant for
  outside adoption, `@fusion-io/*` for company-internal.
- Package names are `<role>` under a product scope: `@helix-io/web`, not
  `@helix-io/helix-web`.
- CLI binaries drop the `-cli` suffix: the crate `cortex-cli` ships the command
  `cortex`.

## Helix layering

Five tiers, each with one job. The dependency direction never reverses.

```
styles     tokens, base layer. Pure CSS, zero dependencies
core       HelixElement, mixins, decorators
headless   structure, a11y, state, form participation. NO CSS
web        styled tier. Extends headless, references tokens
react      generated wrappers over web
```

**`headless` must never depend on `styles`.** That single constraint is what
makes the headless tier independently consumable, and therefore separately
valuable. If styling leaks downward, we have shipped one package in five files.

- **Base is headless, styled is presentational.** Base owns what the component
  *is and does*: markup, accessibility wiring, slots, events, form
  participation. No CSS, no tokens, no `appearance`/`tone` properties. Styled
  extends it and adds only presentation.
- **Shadow DOM uses CSS Shadow Parts, not classnames.** Every structural element
  gets `part="<name>"`; document each with `@csspart`. Parts are the public
  override API via `::part()`.
- **Per-component CSS hooks with token defaults.** Expose
  `--disclosure-padding` defaulting to `var(--helix-space-3)`, so a consumer
  restyles one component without touching `--helix-*` and affecting everything.
- **Inline literal-union types in `@property`** (`tone: 'info' | 'success'`), not
  extracted type aliases. The CEM analyzer expands inline unions into discrete
  enum metadata; aliases emit just the alias name and lose the value list.
- **Mixins need an explicit interface.** TypeScript cannot emit declarations for
  an anonymous class with private members (TS4094). Declare the public surface
  as `export declare class XInterface` and cast the mixin's return to
  `Constructor<XInterface> & T`. See `helix/core/src/mixins/with-open.ts`.
- **Apps compose Helix components, not raw HTML.** `<Text>` not `<h1>`, `<Input>`
  not `<input>`. Structural wrappers (`div`, `ul`, `section`, `form`) are fine;
  CSS already does layout. If a primitive is missing, add it to the design
  system rather than working around it in the app.

**Visual direction** for the styling refresh lives in
[`docs/08-visual-direction.md`](docs/08-visual-direction.md): enterprise density
with consumer restraint, hierarchy from type and space rather than color,
borders over shadows, motion as feedback only. The current tokens are a working
default, not that direction.

## Tokens: primitives are private, semantics are the API

Two layers in `@helix-io/styles`, and components see only the second.

| Layer | File | Shape | Who may reference it |
|---|---|---|---|
| **Primitive** | `primitives.css` | `--_helix-neutral-500`, `--_helix-scale-4` | `@helix-io/styles` only |
| **Semantic** | `tokens.css` | `--helix-color-primary`, `--helix-space-md` | everything |

A primitive answers *what value exists*. A semantic token answers *what it is
for*. The indirection is the point: a theme changes what
`--helix-color-primary` resolves to without every component knowing which step
of which ramp it happened to be.

**Fifteen categories**, and every token belongs to exactly one:

`color` `space` `radii` `font` `text` `weight` `leading` `tracking` `border`
`shadow` `material` `duration` `easing` `size` `layer`

`--helix-<category>-<role>`. No exceptions, no uncategorized tokens.

### `bun run check:tokens` enforces three rules

1. **No raw values** where a token exists. A `#f5f5f5` in one component is
   invisible in review and then invisible in every theme that component appears
   in. The theme changes, that value does not, and it surfaces months later as
   "the disclosure looks wrong in dark mode".
2. **No primitive access** from outside the styles package.
3. **No references to tokens that do not exist.** This is the rule that earns
   its keep: a renamed token resolves to nothing and the property silently falls
   back to the browser default, so the code looks correct and the component is
   quietly unstyled. Renaming the radius scale broke twelve references and none
   of them would have thrown.

Per-component hooks (`--disclosure-padding`) are not Helix tokens and are
exempt. They should default to a semantic token.

## Tree-shaking

Three things, together:

- **One family per module**, with subpath exports (`@helix-io/react/disclosure`,
  `@helix-io/web/disclosure`). Importing from the barrel pulls everything;
  subpaths exist so consumers do not have to.
- **`sideEffects` declared honestly.** `@helix-io/web` is
  `["./dist/**/*.js"]` because `@customElement()` registers on import and
  dropping that import breaks the element. `@helix-io/headless` and
  `@helix-io/react` are `false`: headless registers nothing, which is what makes
  it headless, and the React wrappers are pure.
- **Generated wrappers import only their own element**, so an app using
  `Disclosure` never pulls `Table` into the bundle.

Getting `sideEffects` wrong is silent in both directions: too broad and nothing
shakes, too narrow and a bundler drops a registration and the element renders as
an unknown tag with no error.

## React wrappers are generated, never written

`bun run generate` in `helix/react` reads `@helix-io/web`'s manifest and emits
the wrappers. Hand-writing them means the React API drifts from the element API
the first time someone adds a property and forgets the wrapper.

**Composition namespaces use dot notation**: `Disclosure.Root`, `Card.Header`.
Groups come from the file layout via the `helix-composition` plugin, where the
directory is the group and the file is the part:

```
src/card/card.ts         ->  Card.Root
src/card/card-header.ts  ->  Card.Header
src/scroll-area/…        ->  ScrollArea.Root
```

Deriving groups from tag names instead is ambiguous exactly where it matters:
`helix-scroll-area` is one component and `helix-card-header` is part of another,
and nothing in either name says which.

Two things the generator must keep doing, both learned the hard way:

- **Skip `readonly` members.** A getter like `isOpen` reads as a plain boolean
  field in the manifest, but assigning to it throws. Emitting it as a prop hands
  consumers an API that fails at runtime.
- **Name components with their part.** The namespace object owns the bare group
  name, so the root component is `DisclosureRoot`, not `Disclosure`.

## Theming is derivation, not override

**Tokens are a function, not a table.** `@helix-io/theme` computes a complete
token set from a handful of intent inputs, and every foreground/background pair
meets its contrast target **by construction** rather than by audit.

This is why colors are OKLCH: equal numeric steps in sRGB are not equal
perceptual steps, which makes both scale generation and contrast math
unreliable. Two rules that fall out of it and are easy to get wrong:

- **Solve against gamut-fitted colors.** Solving against a color that cannot be
  rendered and then measuring against the one that can is how a palette passes
  in theory and fails by a hundredth in practice.
- **Solve foregrounds against every surface they land on.** In a dark theme
  `surface` is *lighter* than `background`, so light text loses contrast inside
  cards. A palette verified only against the page background ships a real
  failure.

Both are covered by regression tests in `helix/theme/src/derive.test.ts`. Do not
weaken them.

## The custom elements manifest

`@helix-io/cem` owns the analyzer config and every Helix plugin. Component
packages do not configure the analyzer themselves; they call
`createHelixCemConfig({ tier })` so a new plugin is added once rather than
copied into each package and left to drift.

```js
// helix/web/custom-elements-manifest.config.mjs
import { createHelixCemConfig } from '@helix-io/cem'

export default createHelixCemConfig({ tier: 'styled' })
```

Four plugins ship today, and **order matters**: `helix-tier` stamps each
component with its tier, because the wrapper generator wraps only the styled
tier and cannot infer that. `helix-declared-events` drops inferred events (see
below). `helix-react-events` records the generated prop on each event
(`open-change` becomes `onOpenChange`) so the React API is readable from the
manifest rather than implicit in the generator. `helix-convention-lint` enforces
the conventions in this file and **fails the build** by default.

### Inheritance across packages works. Use it.

`createHelixCemConfig` sets `dependencies: true`, which collects dependencies'
manifests so the analyzer's inheritance pass can resolve members, events, slots,
and parts across package boundaries, stamping each with `inheritedFrom`.

**Every package that ships classes others extend needs its own manifest**,
including `@helix-io/core`, which ships no components but does ship the mixins.
Without it, `open` and `defaultOpen` are missing from every component that uses
`WithOpen`, and the omission is silent.

Consequence for mixins: **document members on the mixin's inner class**, not
only on the exported `declare class` interface. The interface is what TypeScript
consumers read; the inner class is what the analyzer reads when resolving
inherited members. Documenting only the interface leaves every inheriting
component's API undescribed in tooling.

### Events are declared, not inferred

Use **`@event`**, not `@fires`. Both work; pick one so the codebase is
greppable.

The analyzer records an event for every `dispatchEvent` it can see, and when the
call sits in a generic helper it records the *parameter identifier*.
`HelixElement.emit(name, detail)` produced a phantom event called `name` on
every element inheriting it. `helix-declared-events` drops events with no
description, on the rule that a dispatch inside a mixin or base helper cannot be
named by inference, so anything real is declared with `@event`.

### Two analyzer facts that cost time

- **Plugins are objects, not factories.** The `Config` type says
  `Array<() => unknown>`, but the runtime destructures hooks straight off each
  element. The type is wrong; `createHelixCemConfig` casts at that one boundary.
  Passing factories fails silently: manifests generate with none of your fields.
- **Do not import `custom-elements-manifest/schema`.** The analyzer bundles its
  own copy, and two copies produce nominally distinct types that
  `exactOptionalPropertyTypes` refuses to unify. `@helix-io/cem` declares the
  manifest structurally in `types.ts` instead.

## Where does a fix live?

Identify the *source* of the problem and fix it there. Surgical patches at the
consumer level mask architectural gaps.

- **Universal behavior** → `helix-headless` or `helix-core`. If it affects every
  consumer, it does not get a per-app workaround.
- **Cross-cutting element concerns** → `helix/core/src/mixins/`. Controlled and
  uncontrolled state, event sanitization, form participation.
- **App-specific composition** → the app. Routing, page layout, app state.

If the symptom appears in one consumer but the cause sits deeper, the fix still
goes deeper.

## Code style

- **No em dashes** in code, docs, comments, or copy. Use periods, colons,
  commas, or parentheses. They invite over-long sentences and read badly when
  scraped by an LLM.
- **Alphabetize** keys in object literals, interface members, and exported
  `type` definitions, case-insensitive ascending. Skip where order is semantic:
  positional arguments, middleware chains, CSS box-side shorthand, step
  sequences. Biome's `useSortedKeys` assist enforces the mechanical part.
- **Always brace** `if`/`else`/`for`/`while` bodies. Enforced by
  `useBlockStatements`.
- **Multiline JSDoc on every `@property` and every exported type member.**
  Single-line comments invite cramped descriptions; the full form forces a real
  one and renders properly in IDE tooltips and the CEM.
- **Class JSDoc leads with purpose, not appearance.** "Disclosures let users
  show and hide a section of related content," not "A themed collapsible."
- Rust: workspace lints are `clippy::pedantic` with `unsafe_code` forbidden.
  Fix findings rather than allowing them, and when an allow is genuinely right,
  comment why at the allow site.

## AI is a first-class consumer

Agents write against this system, so the API has to be legible to one. When a
convention conflicts with what a static analyzer or code-authoring agent can
read, prefer legibility.

- **Typed enums beat conventions.** An agent gets compile-time feedback on
  `tone="info"` and writes correct code first try; it cannot verify a CSS
  variable name it guessed.
- **Explicit names beat terse ones.** `appearance` over `variant`, `foreground`
  over `fg`.
- **Document via machine-readable mechanisms**: CEM JSON, JSDoc with
  `@cssproperty`/`@slot`/`@csspart`, TypeScript types. These flow into IDE
  tooltips, wrapper generators, and agent context.

For runtime page generation (a future product), the model emits a **validated
schema, not code**, with the JSON Schema derived from the CEM. Invalid output is
rejected and retried, never rendered. See
[`docs/07-design.md`](docs/07-design.md).
