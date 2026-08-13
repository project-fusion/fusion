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

`bun run verify` runs everything: format, typecheck, TS tests, clippy, Rust
tests. It must pass before anything is called done.

Cargo is a first-class monorepo tool on its own. Do not put Rust behind Nx or
Turbo; the wrapper adds indirection and takes away incremental compilation.

## Layout

Domain folders at the repo root, packages flat inside them. A new product gets a
new top-level folder.

```
helix/     styles core headless web react icons theme
cortex/    core trace engram
docs/      strategy, tracked
.local/    per-machine scratch, gitignored
tooling/   shared CI and script infrastructure
```

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
