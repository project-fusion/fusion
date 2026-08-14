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

## A content property is its slot's fallback

Where a property carries content rather than configuration, it is the fallback
content of a slot of the same name, never a second thing rendered beside it:

```ts
html`<slot name="content">${this.content}</slot>`
```

Text stays an attribute, because that is what most tooltips and most avatars
hold, and `content="Save"` is less to write than a slotted span. Anything
richer replaces it by being slotted. Both can never show at once.

**Fallback, because detection does not exist.** This is the same wall as the
bare-slot rule above: `:host(:has([slot='content']))` is invalid CSS, and the
server has no children to inspect, so a component cannot ask whether it was
given anything and choose. Slot fallback is the platform answering that
question itself, at assignment time, with no code, no attribute on the host,
and no disagreement between what the server rendered and what the client shows.

Two things follow for the component:

- **Ask the slot, not the property, whether there is anything to show.** Any
  logic gated on emptiness (`show()` refusing to open an empty tooltip) reads
  `assignedNodes()` *without* `flatten`, which answers what the consumer
  provided rather than what the fallback would render. Client only, which is
  where such logic runs anyway.
- **Re-read on `slotchange`.** Content arriving from the light DOM changes no
  property, so nothing schedules an update. A framework rendering the content
  after the element upgrades would otherwise leave a stale accessible name.

`Avatar` had this before it was written down: its default slot falls back to
the initials derived from `name`. `Tooltip` follows it.

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

## Size and density

**A control has no size. It takes its height from the region it is in.**

```html
<helix-flex data-density="lg">
  <helix-button appearance="primary">See what is shipping</helix-button>
</helix-flex>
```

The reasoning, because the conclusion looks like a restriction and is not. Size
gets asked to do three jobs at once, and only one of them belongs to the
control:

- **Emphasis.** `appearance` carries it. A filled primary button says "this one
  matters" far louder than eight more pixels.
- **Fit.** A fact about the region: a toolbar is tight, a hero is spacious, a
  table row is tighter still.
- **Optical role.** Real, and only for things that are not controls. An avatar
  at 24 in a list and 96 on a profile is a different graphic, not a taller
  control.

The test that settles it: *can two controls sitting together legitimately differ
in height?* Save and Cancel, an icon button beside a text button, an input and
its submit, the halves of a split button. In every case, no. So a per-instance
size is only ever used to say something about the region, one element at a time,
which is precisely how a row ends up with one member the wrong height. Said once
on the region, a ragged row is not discouraged, it is unwritable.

That is also what makes it safe for anything generating code: there is no size
to get wrong, and one question to ask per region rather than one per element.

- **`data-density` on any container**, `sm` / `md` / `lg`. `md` is the default
  and is never written.
- **Containers that are dense by nature declare it themselves**: app header,
  toolbar and banner do, so a control put in one is already right.
- **`size` survives only on avatar and spinner**, which are pictures.

It works through custom properties (`--helix-size-control`,
`--helix-size-checkbox`, `--helix-size-tag`), which is why it costs no component
any API and crosses every shadow boundary on its own. The `-sm` / `-md` / `-lg`
tokens are the scale and never move; the unsuffixed ones are the current step.

`data-link-size` stays. A text link has no control height: its size is
typography, and it follows the text around it.

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

**Apps use components, not native elements.** *Reversed 13 Aug 2026.* The base
layer still styles `h1`–`h6` and `:where(a)`, because prose the design system
never renders (markdown, a CMS) has to look right too. But an app written
against Helix reaches for `Heading`, `Text`, `Link`, `Flex`, and `Grid` rather
than raw tags, so dropping a component in works without the app knowing which
token to apply.

The earlier rule said a component is only built when it has behavior. That was
right about what *earns* an element and wrong about what an app should *write*:
`Flex` has no behavior and still removes every hand-rolled layout div.

`Heading` keeps `level` and `size` separate, which is the risk that killed the
first `Text`. They default to matching, so a heading is correct by doing
nothing, and `size` is only ever a deliberate exception.

Layout components are presentation with no structure or a11y of their own, so
they ship in `helix/web` with **no headless tier**. The tier split exists to
keep behavior separate from styling, and there is no behavior to separate.

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
React, and no React package: there is not one.

**Bind Helix events with `addEventListener`, not a prop.** `onhelix-select` and
its siblings do not survive hydration: React records the prop and attaches no
listener, so on a server-rendered page the handler never runs. The element still
does its own job, nothing is logged, and it repairs itself the moment React
commits an update for any other reason. That last part is why it passes every
casual check. Use `useHelixEvent` in `site/ui/lib`, which binds from an effect
and therefore runs on hydration and on mount alike.

Measured on the sandbox against React 19.2.8. Hydrated, a click on a file tab
moved the tab and left the consumer's state untouched, and dispatching the event
straight at the host reached nothing either, which is what distinguishes an
absent listener from one that ignored the event. Navigating away and back so the
same component *mounted* rather than hydrated, the first click worked. Before
this was found, the sandbox's example tree and file tabs were dead on every
fresh page load.

React's own events are unaffected: `onClick` on a `<helix-button>` goes through
the synthetic system, which hydration does set up.

**The prop form still decides event names**, because it is what a consumer
reaches for first and what has to keep working once React fixes this.
`onhelix-open` reaches `helix-open`; `onHelixOpen` binds an event called
`HelixOpen` that nobody dispatches. **And it stops at one hyphen**:
`onhelix-value-change` binds nothing at all, measured against the same version.
Every Helix event name therefore carries at most one hyphen, and
`conventionLint` fails the build on one that carries two.

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

## The sandbox

`@helix-io/sandbox` ships the sandbox elements; `sandbox/ui` is the Next site
that renders them. Both dev and production work the same way as the marketing
site, with element registration in one client component.

- **A separate package, never the component library.** The previous Helix
  exported `HelixSandboxEditorBase`, `HelixSandboxTerminalBase`,
  `HelixSandboxResizeHandleBase`, and seven more from `helix/web`'s public
  barrel: 119 kB of 1.22 MB, roughly a tenth of the library, shipped to every
  consumer as tooling for one internal site. Single tier, because the headless
  and styled split exists so a consumer can bring their own presentation, and
  nobody reskins a dev tool.
- **The preview renders into the light DOM.** `createRenderRoot()` returns
  `this`. A shadow root would cut the preview off from the base layer, so a
  heading would come out at the browser's default size and a link in the wrong
  color, and the preview would be a worse likeness the more the design system
  does.
- **Source and preview never speak directly.** The source pane dispatches
  `SourceChange` and the root hands the value to whatever preview is slotted
  into it, the same event-not-registration shape the accordion uses.
- **The divider is a real `role="separator"`** with `aria-valuenow`, moved by
  arrow keys as well as by pointer. A divider only a mouse can move is unusable
  without one.

### The preview runs untrusted code

A sandbox executes whatever is typed into it, so the preview frame is the
security boundary and everything about it follows from that.

- **`sandbox="allow-scripts"`, and never `allow-same-origin` beside it.** The
  two together are the same as no sandbox at all: a document on its own origin
  can reach up and remove the attribute. `allow-forms` is granted because
  examples have forms; top-level navigation, popups and modals are not.
- **The frame is a static document, not a route.** A sandboxed frame has an
  opaque origin, and from there every module import and `fetch` back to the site
  is cross-origin without CORS headers, so a framework route's chunks never load
  and the document never comes alive. A classic `<script src>` is not
  CORS-checked and does run, which is why `bun run frame` emits one IIFE with
  the component library inside it and a plain HTML file beside it.
- **Messages are identified by window, not by origin.** An opaque origin arrives
  as the string `"null"`, which any other sandboxed frame on the page also
  reports, so matching on it proves nothing. `event.source` is a reference the
  sender cannot forge. Sending goes to `'*'` because `postMessage` has no target
  string naming an opaque origin, which costs nothing: what is sent is the
  example's own source, to the document about to render it.

What this prevents, measured before it was fixed: `innerHTML` refuses a
`<script>` tag but not an `onerror` on an image that fails to load, and that
handler read the site's `localStorage`, its cookies, and the editor's contents,
and rewrote the page. Confirmed closed the same way, from inside the frame:
every one of those is now a `SecurityError`.

**The spec runner is a separate frame and is deliberately not sandboxed.** It
has to `import()` a bundle, which an opaque origin cannot do, and what it runs
is this repo's own spec files rather than anything a reader typed. The family
name it is given is matched against `^[a-z][a-z0-9-]*$` before it reaches an
import, so it cannot be steered off the path.

### The site

Two page kinds, kept apart on purpose:

- **`/components/<family>` is the API**, read from the manifest and nothing
  else. No examples: it answers what a component can do, and a reference page
  that starts collecting pictures stops being complete.
- **`/components/<family>/<example>` is the sandbox**, one example, editable.

Examples are `.examples/*.html` beside the component. `default.html` is the
headline preview and reads as "Preview"; every other slug is a named variant.

**Names drop the product.** `helix-app-header` displays as "App Header":
repeating "Helix" on every row inside the Helix site is noise. The tag keeps its
prefix, because that is a real identifier a consumer types.

## Tree-shaking## Tree-shaking

One family per module, subpath exports (`@helix-io/web/card`) so consumers need
not import the barrel, and `sideEffects` declared honestly: `web` has them
because `@customElement` registers on import, `headless` does not. Getting it
wrong is silent both ways.
