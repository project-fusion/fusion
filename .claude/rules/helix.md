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
- **A region becomes an element only when it has behavior, state, or API.**
  Otherwise it is a slot. Card's header, body, and footer carried none of the
  three, so five elements became one and a title became a real `<h2>` the
  consumer writes. `Tabs.Tab`, `Select.Option`, and `Accordion.Item` do carry
  state, so they stay elements.
- **A region with no behavior is a bare `<slot>`, not a wrapped one.** A `<slot>`
  is `display: contents` in the UA stylesheet, so an unassigned one generates no
  box: no grid row, no flex item, no gap. A wrapper generates one either way, so
  an omitted region paints an empty inset band and the component is forced to
  detect its own emptiness. Measured on Card, same content: wrappers present but
  empty rendered 85px against an ideal of 53px; bare slots rendered 53px with no
  hiding logic at all.

  It has to be layout rather than detection, because **the detection does not
  exist**. `:host(:has([slot='header']))` is invalid CSS: `:has()` is not
  allowed inside the functional `:host()`, so the rule is dropped at parse time
  and the region stays hidden even when filled. Verified in Chrome 148 —
  `:host`, `:host(*)`, and `:host([a])` report supported, `:host(:has(*))` does
  not, and the compound `:host:has(...)` reports supported and still does not
  work. JavaScript is not an option either: the server cannot inspect children.

  The consequence is that the inset moves to the container and slotted content
  is styled with `::slotted()`. Regions lose their `part`, which is the right
  trade: a header is whatever element the consumer slotted, not a wrapper we put
  around it. Keep a wrapper only where it carries something real, as `<nav>`
  does in AppHeader, being a landmark whether or not it is filled.

## Server rendering

Every component must render on a server with no DOM. The app no longer ships
declarative shadow DOM (see below), but Lit SSR still has to succeed: it is what
the `*.ssr.spec.ts` suite exercises, and a component that touches the DOM to
render is broken in any non-browser context.

Shadow styles now arrive with the definition rather than in the markup, so the
flash window is "before the element upgrades", covered by
`@helix-io/web/elements.css`. Within that, the risk is still **state, not
styling**.

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

**Never assert structure against the raw SSR string.** Declarative shadow DOM
inlines the component's stylesheet into the very markup being asserted, and that
stylesheet names every part, host attribute, and token the component uses. So
`toContain('part="media"')` passes on a *selector*, and
`not.toContain('data-scrolled')` fails on a `:host([data-scrolled])` *rule* —
both saying nothing about what rendered. This has produced a false pass twice,
once hiding a stale build for several commits.

Use the helpers in `web/src/testing/ssr.ts`: `withoutStyles`, `hasPart`,
`partTag`, `hostTag`. Attribute bindings render across multiple lines, so match
with `/<a\s+part="button"/`, never `'<a part="button"'`.

**Reflect only what CSS selects on.** Reflection exists so a selector can reach a
value. `href`, `target`, and `rel` reflected on Button until they were told not
to, which wrote a destination onto a host that is not a link and put a bare
`target rel` pair into every button ever rendered. `appearance`, `size`,
`disabled`, and `orientation` reflect; the rest do not.

**Shared test scaffolding lives in `web/src/testing/`**, excluded from the build
in `tsconfig.json`. `registerDom()` is idempotent because bun runs every DOM
spec in one process and `GlobalRegistrator.register()` throws on the second
call. It also shims `attachInternals`, which happy-dom does not implement —
Lit's server shim does, so the gap is the test double's alone and the fix
belongs there. A guard in `HelixFormElement` would make production code
defensive about a capability every browser has, and swallow a real failure.

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

**Typography and links are the base layer, not components.** The type scale
lives on `h1`–`h6` in `base.css`, and anchor treatment on `:where(a)`. A `Text`
component would take the heading level as a prop, which lets `size` be set
independently of it, and that is how a page gets an `<h4>` styled like a title.
A `Link` component would add a shadow boundary around an element that already
carries everything a link needs. Styling the elements also reaches prose the
design system never renders: markdown, a CMS, anything with an `<a>` in it.

A component gets built when it has behavior. Presentation of native elements is
a stylesheet.

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

Events are declared, never inferred, and **names are PascalCase and compound**:

```ts
@event {HelixOpenChangeEvent} OpenChange - Fired when it opens.
```

Two rules, both enforced by `helix-convention-lint`:

**PascalCase.** Events dispatched inside a shadow root are retargeted to look
like they came from the host, so a name that could collide with a native event
is indistinguishable from one escaping a component's internals. Every native
event name is lowercase, so casing alone makes that collision impossible. This
is the protection a `helix-` prefix used to provide.

**Compound.** React strips `on` from a prop and listens for the remainder
verbatim, so the event name decides the React API: `OpenChange` is
`onOpenChange`. A single word is unreachable, because React's synthetic system
has already claimed the prop: an event named `Change` would be bound by
`onChange`, which React wires to the native `change`, so ours would never fire.
`ValueChange`, `CheckedChange`, `OpenChange`.

The type in braces is what lets the React generator emit
`(event: HelixOpenChangeEvent) => void` instead of `(detail: unknown)`. Each
event is a class in `helix/core/src/events.ts` that carries its own name and
augments `HTMLElementEventMap`. There is no generic `emit(name, detail)` helper:
a dispatch through one cannot be named by the analyzer.

Every `@property` gets a one-line description.

**A camelCase property needs an explicit `attribute`.** Lit lowercases a
property name to derive its attribute rather than dash-casing it, so
`removeLabel` is reachable only as `removelabel` unless it declares
`@property({ attribute: 'remove-label' })`. Nothing warns: the attribute a
consumer would guess simply does nothing.

## Use the elements directly

**Write `<helix-card>` in JSX.** Plain custom elements, no wrapper, no patched
React.

**Register once, in a client component.** A custom element registers as a side
effect of importing its module, and that import has to be in the client graph to
ever run. A server component's imports do not ship to the browser. So one client
component holds every element import and renders `null`:

```tsx
'use client'
import '@helix-io/web/card'
export function HelixElements(): null {
  return null
}
```

Render it once in the layout. **Pages stay server components**, because an
unregistered tag is just an unknown element in the HTML that upgrades when the
definition lands. Consumers are on the App Router; asking them to mark every
page `'use client'` to use a button would not be a design system.

**Import `@helix-io/web/elements.css` beside the base layer.** It is generated
from the element sources by `tooling/scripts/build-elements-css.mjs` and hides
each tag with `:not(:defined)` until it upgrades, using `visibility` so the page
does not reflow. Without it a card arrives as a run of unstyled text and then
snaps into a card. CSS cannot select "any custom element", and a bare
`:not(:defined)` would also catch Next's own dev overlay, so the tags are
enumerated.

### Why there is no declarative shadow DOM

`@lit-labs/nextjs` and `@lit-labs/ssr-react` were removed. They rendered DSD by
monkey-patching `React.createElement` through a webpack `imports-loader` rule,
and three things ended it:

- **It cannot work with server components.** The patch runs only on the server;
  the client copy is a deliberate passthrough, because it assumes the client
  re-runs the same JSX and yields a tree with no `<template>`, matching the DOM
  after the parser consumed the DSD. A server component is never re-run. Its
  output, template included, is replayed from the flight payload through DOM
  APIs, and **DSD does not activate for script-inserted nodes**. Measured: 12
  templates left inert, no shadow root attached, React error #418.
- **It hooks `config.webpack`, which Turbopack ignores**, so it would stop
  working silently on that migration. We have already lost time to one silent
  DSD failure.
- **`@lit-labs/nextjs` has not published since July 2025.** There is no fixed
  version to wait for.

Marking pages `'use client'` did make it work, at 15.1 kB of route JavaScript.
That is not the trade: it surrenders RSC on every page using a component, to
keep an unmaintained patch to React.

**Verify in a browser, never by grepping the HTML.** A string check passes on
markup the browser then discards, which is exactly how the broken DSD survived
several commits. The assertion that means something is
`element.shadowRoot !== null` on a loaded page.

## React wrappers

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
