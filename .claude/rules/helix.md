---
paths:
  - "helix/**"
---

# Helix rules

## Tiers

```
styles     tokens, base layer. Pure CSS, zero dependencies
core       HelixElement, mixins, event classes
headless   structure, a11y, state, form participation. NO CSS
web        styled tier. Extends headless, references tokens
react      generated wrappers over web and headless
```

**`headless` must never depend on `styles`.** That constraint is what makes the
headless tier independently consumable. If styling leaks downward, we have
shipped one package in five files.

- **Base extends, styled inherits transitively.** Styled must never extend a
  different root, or a form control's validity ends up in one branch and its
  presentation in another.
- **Base is headless, styled is presentational.** Base owns markup, ARIA, slots,
  events, form participation. No CSS, no tokens, no `appearance`/`tone`.
- **The headless tier is `BaseCard`, not `CardBase`**, and namespaces as
  `BaseCard.Root` beside `Card.Root`. Both tiers register elements
  (`helix-base-card`, `helix-card`): an unregistered element can only be
  subclassed, which is not "independently consumable".
- **Mixins add API, controllers add behavior.** If it introduces a property or
  method a consumer uses, it is a mixin. If it only reacts to lifecycle, it is a
  controller.
- **One folder per part**: `card/root/card-root.{ts,css,dom.spec.ts}`. The
  folder is what the composition plugin reads.

## SSR and Declarative Shadow DOM

Every component renders on the server before any JavaScript runs. Lit SSR emits
`<template shadowrootmode="open">` with styles inlined, so markup arrives
styled. The flash risk is **not styling, it is state.**

1. **Never initialize state in `connectedCallback`.** SSR does not call it.
   Derive from properties, or seed in `willUpdate`, which SSR does call.
2. **SSR has no DOM.** The element shim carries attributes but not tree
   traversal: `querySelector` is undefined and any parent-to-child coordination
   throws. Anything that inspects the tree runs in `firstUpdated` or later, and
   is therefore a client-side enhancement.
3. **Semantics on the host, presentation in the shadow root.** IDREFs do not
   cross shadow boundaries, so `aria-labelledby` inside a shadow root can never
   resolve to a light-DOM id.
4. **Guard generated ids** with `if (!this.id)`. The server writes the id into
   the HTML; the client sees it present and skips generation, so both agree.
5. **A child announces itself to its parent.** A parent cannot poll for a child
   that has not upgraded. Dispatch a bubbling ready event.
6. **Every component needs a `*.ssr.spec.ts`** asserting the server output. A
   DOM spec runs after hydration, when everything already looks correct.

Specs split by environment: Lit SSR's shim and happy-dom both patch globals and
cannot share a process. `*.dom.spec.ts` and `*.ssr.spec.ts` run separately.

## Tokens

Two layers. Components see only the second.

| Layer | File | Shape | Who may use it |
|---|---|---|---|
| Primitive | `primitives.css` | `--_helix-neutral-500` | `helix/styles` only |
| Semantic | `tokens.css` | `--helix-color-primary` | everything |

Fifteen categories, every token in exactly one: `color` `space` `radii` `font`
`text` `weight` `leading` `tracking` `border` `shadow` `material` `duration`
`easing` `size` `layer`.

`bun run check:tokens` enforces three rules: no raw values where a token exists,
no primitive access from outside `helix/styles`, and **no references to tokens
that do not exist**. The third earns its keep: a renamed token resolves to
nothing and the property silently falls back to a browser default, so the code
looks correct and the component is quietly unstyled.

Per-component hooks (`--card-padding`) are not Helix tokens and are exempt. They
should default to a semantic token.

Styles are authored in sibling `.css` files. `bun run styles` compiles each into
a generated `.css.ts` calling `createSheet`. Generated files are gitignored;
never edit one.

## The manifest

`@helix-io/cem` owns the analyzer config and plugins. Packages call
`createHelixCemConfig({ tier })` rather than configuring the analyzer.

- **`dependencies: true` is set**, which is what lets inheritance resolve across
  packages. Every package shipping extendable classes needs its own manifest,
  including `helix/core`, which ships mixins rather than components.
- **Document mixin members on the mixin's inner class**, not only on the
  exported `declare class`. The interface is what TypeScript reads; the inner
  class is what the analyzer reads.
- **Plugins are objects, not factories.** The analyzer's `Config` type says
  otherwise and is wrong; passing factories fails silently.
- **Do not import `custom-elements-manifest/schema`.** The analyzer bundles its
  own copy and two copies produce types `exactOptionalPropertyTypes` will not
  unify.

## JSDoc contract

Every component's class JSDoc carries `@summary`, `@description`, `@since`,
`@status`, `@documentation`, plus `@alias` where a component is known by other
names. `helix-convention-lint` requires the first five and **fails the build**.

Only `@summary` is native CEM; the rest reach the manifest through
`helix-metadata`. A `@status experimental` that lives only in a comment cannot
badge a docs page or warn a consumer.

Events are declared, never inferred, and **every name is prefixed `helix-`**:

```ts
@event {HelixOpenChangeEvent} helix-open-change - Fired when it opens.
```

The prefix is not cosmetic. Events dispatched inside a shadow root are
retargeted to look like they came from the host, so an unprefixed name is
indistinguishable from a native event escaping a component's internals: a
`<helix-input>` wrapping an `<input>` would emit an `input` event that is not
ours. The React prop keeps the prefix for a second reason: React binds its own
synthetic listener for any `on*` name it recognizes, so `onInput` would attach
React's handler while `onHelixInput` cannot.

The type in braces is what lets the React generator emit
`(event: HelixOpenChangeEvent) => void` instead of `(detail: unknown)`. Each
event is a class in `helix/core/src/events.ts` that carries its own name and
augments `HTMLElementEventMap`. There is no generic `emit(name, detail)` helper:
a dispatch through one cannot be named by the analyzer.

Every `@property` gets a one-line description.

## React wrappers

**Use the custom elements directly in server components.** The wrappers are
client components, and a client boundary loses declarative shadow DOM: the
shadow root is not server-rendered, so the component arrives unstyled until the
bundle upgrades it. Measured on the marketing home page, the wrapper cost
10.1 kB of route JavaScript against 121 B, and gave up DSD and server-rendered
ARIA to do it.

Reach for `@helix-io/react` inside client components, where a boundary already
exists and typed event callbacks and refs are worth having.

Generated by `bun run generate` in `helix/react`, never written. Hand-written
wrappers drift from the element API the first time someone adds a property.

- **Each wrapper side-effect imports its element** (`import '@helix-io/web/card'`).
  `@customElement` registers on import, and a type-only import erases, so
  without it the tag is never defined: it never upgrades in the browser and Lit
  SSR cannot render its shadow root on the server.

- **Namespaces mean composition, never variation.** `Card.Root` contains
  `Card.Header`. An icon-only button is not a part of Button, so `IconButton` is
  top-level. Variants are props; alternatives are separate components.
- **Groups are parts where homogeneous** (`Radio.Group`, `Checkbox.Group`), and
  separate where not (`Toolbar` holds buttons, dropdowns, and inputs).
- **Skip `readonly` members.** A getter reads as a field in the manifest but
  assigning to it throws.
- **Components carry their part** (`DisclosureRoot`), because the namespace
  object owns the bare group name.
- **The generator formats its own output**, or every build dirties files `check`
  just cleaned.
- **`ref` is typed to the element class**, not `HTMLElement`, or a component's
  imperative methods are unreachable through it.
- **`BaseProps` extends React's `HTMLAttributes`**, so `onClick`, `className`,
  `style`, ARIA, and `data-*` work and typecheck alongside the generated props.

## Tree-shaking

One family per module, subpath exports (`@helix-io/react/disclosure`) so
consumers need not import the barrel, and `sideEffects` declared honestly: `web`
has them because `@customElement` registers on import, `headless` and `react` do
not. Getting it wrong is silent both ways.
