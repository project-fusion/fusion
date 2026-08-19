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

### A component that renders another names the public tag and imports it

A custom element registers on import. A tag nobody imported is not an error and
not a warning: it is an inert unknown element, laying out as an empty inline
box. A panel built around one looks like a panel that failed to open.

So a template names the **public** tag, `helix-date-picker` rather than
`helix-base-date-picker`, and **each tier side-effect imports its own version of
it**. A consumer on the styled tier then gets the styled calendar; one on the
headless tier brings a calendar of their own under that name. Select does this
for its listbox and Pagination for its select.

**Both tiers, not just the one with the tag in it.** A styled component extends
the headless class and almost never overrides `render`, so it inherits the
template and the obligation with it, while having no `<helix-…>` of its own to
remind anyone. Date Input shipped without the styled import for exactly that
reason, and every example still looked right, because the sandbox and the docs
site import the whole barrel. That is the condition under which this failure is
invisible: it appears only for the consumer who imports one component.

`bun run check:composed` enforces both halves.

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

### State never reflects, and native is where that comes from

**No stateful property reflects: not `value`, not `checked`, not `open`.** This
has been asked three times, always from the same intuition, that native
`<input value="abc">` tracks what a reader types. It does not. Measured in
Chromium with real user input:

```
text   .value = "Grace"          attribute = "Ada"
pass   .value = "correcthorse"   attribute = "hunter2"
area   .value = "Grace"          text content still "Ada"
check  .checked = false          attribute = ""        (still present)
sel    .value = "b"              <option value="a" selected="">A</option>
```

No exceptions anywhere on the form-control surface. The mechanism is in the
spec: an input in "value" mode reflects its `value` **content attribute to
`defaultValue`**, and carries a dirty value flag that, once a reader has typed,
stops the attribute affecting the value at all. Attributes are the declaration;
the property is the state. What builds the wrong intuition is that
`setAttribute('value', …)` *does* move the displayed text right up until the
first edit sets that flag.

**And here reflecting is worse than merely unfaithful, because the attribute is
the channel ownership is read from.** With `reflect: true` on the value mixin,
measured:

```
AT REST:       <helix-input label="L" default-value="Ada" type="text" value="Ada">
AFTER TYPING:  <helix-input label="L" default-value="Ada" type="text" value="Grace">
PASTED:        started "Grace", typed "Hopper", still holds "Grace"
```

Serialize the host, re-parse it, and the new element sees `value` declared
before its first update, latches controlled, and freezes. Note the first line:
untouched, the seed had already leaked into `value`, so even a never-typed-in
control comes back dead from a copy-paste. Decide-once settles the element that
is already alive; it cannot settle markup that outlives it. Lit SSR does emit
reflected attributes (verified with `disabled` set as a property), so this is
not a client-only concern.

The line that is actually drawn, and it is not "value is special":

- **Boolean states mirror to a `data-` name.** `data-open` and `data-checked`,
  read by sixteen rules across six stylesheets. A different name, so a pasted
  `data-open` is inert and can never be re-read as a declaration.
- **Payload states do not.** `value` is a string, and so is `active`, which
  names which child is active. Option's `data-active` is a boolean its listbox
  writes, so it is the first rule rather than an exception to the second.

If a payload ever needs a CSS hook, mirror the boolean fact (`data-filled`), not
the payload: a floating label cares whether there is text, not what it says. And
`helix-input` takes `type="password"`, which a `data-value` would carry straight
past every session-replay masker that knows to mask `.value` and `input[value]`.

**Where we do diverge from native is the name, and it is a real trap.** Native
`<input value="Ada">` seeds; `<helix-input value="Ada">` claims ownership and
the control goes quiet. We took React's `value`/`defaultValue` split, which is
right for our consumers and wrong for anyone reasoning from HTML, and it caught
six of our own examples. `requestControlledChange` therefore audits the first
controlled request an element makes and warns if nothing answered it. Read the
state **before** dispatching, or a consumer answering synchronously looks
identical to one that was never there.

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
  toolbar and announcement do, so a control put in one is already right.
- **`size` survives only on avatar and loader**, which are pictures.

It works through custom properties (`--helix-size-control`,
`--helix-size-checkbox`, `--helix-size-tag`), which is why it costs no component
any API and crosses every shadow boundary on its own. The `-sm` / `-md` / `-lg`
tokens are the scale and never move; the unsuffixed ones are the current step.

`data-link-size` stays. A text link has no control height: its size is
typography, and it follows the text around it.

**A `[part=]` selector for a part nothing renders fails silently.** It is valid
CSS that matches nothing, so there is no error, no warning, and no clue beyond
the feature quietly not happening. `bun run check:selectors` catches it, and it
found two: Card's `orientation="horizontal"` had done nothing since the refactor
that moved its container onto the host, and the Accordion had no border, no
corner radius, and a dead `appearance="plain"` for the same reason.

Parts resolve through `extends`, because a styled component usually renders none
of its own. Comments are stripped from both the CSS and the source first: the
base card's JSDoc quotes the very wrapper it does not render, and reading it in
made the check pass on the bug it was written for.

**`all: unset` takes `box-sizing` with it.** Shadow roots get `border-box` from
`HelixElement.finalizeStyles`, and a rule that unsets everything outranks it, so
the element silently reverts to `content-box`. Restore it in the same rule:

```css
[part="trigger"] {
  all: unset;
  box-sizing: border-box;
}
```

There is nowhere later to put it, because any `*` rule loses to the one that did
the unsetting. Four components were missing it, and the accordion's trigger,
being `inline-size: 100%` with horizontal padding, overflowed its own item by
exactly that padding: measured, 32px past the right edge, which read in the
sandbox as a preview with no padding on one side.

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

### The base layer holds helpers, a component holds itself

**A shadow rule loses to a document rule, whatever the specificity and whatever
the layer.** Measured in Chrome 148 rather than recalled: a `::slotted()` rule
lost to an unlayered `:where()` document rule *and* to the same rule inside a low
`@layer`, and `:host` lost to both. Encapsulation context is sorted before layers
and before specificity, so neither can rescue a component. The only
normal-declaration escape is `!important` from the inner tree, which just moves
the fight onto consumers, who would then need `!important` of their own.

The consequence is per-declaration, which is what makes it so hard to see: in one
rule, the properties the document does not set come through from the shadow and
the ones it does are dead. Measured on Outline, `margin-inline-start` and
`font-weight` arrived and `color` and `text-decoration` did not, so the rule
looked alive. Outline asked for `foreground-muted` from the day it was written
and no outline ever showed it. Dialog kept a `font-size` beside a base-layer rule
that had taken the same property: it read as the deciding value, changing it
moved nothing, and finding that cost an afternoon.

So the split:

- **`helix/styles` holds helpers**, keyed on `data-`: `data-button`, `data-text`,
  `data-navigation-item`, `data-prose`. A recipe pairing a helper with the
  component (`[data-button], helix-button`) is one decision written for two
  surfaces and is fine.
- **A component holds its own styling**, including the light-DOM content it
  slots. If the base layer also names that content, the component cannot.
- **Prose theming is opt-in behind `[data-prose]`.** The base layer still resets
  bare elements, because zeroing a UA margin fights nothing and a component
  slotting a `<p>` wants it too, but it themes nothing without the attribute.
  Markdown, a CMS, anything the library did not render says so once on its
  container.

Two exceptions, both real. `::part()` is the published door into a component, so
a document rule using one is the mechanism rather than a collision. And a rule
undoing the *reset* stays: `helix-card > [slot="media"]` lifts the image clamp,
which is global by necessity.

`bun run check:overruled` enforces it, per declaration. It was written against
the two failures above and fails on both when they are put back.

**Apps use components, not native elements.** *Reversed 13 Aug 2026, and
narrowed 18 Aug 2026: the base layer styles `h1`–`h6` and `:where(a)` only under
`[data-prose]` now, for the reason in the section above.* Prose the design system
never renders (markdown, a CMS) still has to look right, and says so on its
container. But an app written
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

Events are declared, never inferred, and **names are `helix-{verb}`, lowercase
and prefixed**:

```ts
@event {HelixOpenEvent} helix-open - Fired when it opens.
```

*Corrected 17 Aug 2026. This section described PascalCase names (`OpenChange`)
for one day and the code has never carried them since. `f8c7365` made that
change at 00:35 and rewrote this file; `db172f2` reversed it at 23:07 the same
day and did not, so the rule outlived the decision by four days of work against
it. `check:events` and `helix-convention-lint` both enforce
`/^helix-[a-z][a-z0-9-]*$/`, which is what the sixty-six shipped events answer
to.*

**The prefix is what stops a collision with a native name.** An event dispatched
inside a shadow root is retargeted to look like it came from the host, so a bare
`input` from a `<helix-input>` is indistinguishable from the inner control's
own. Prefixed, it can be mistaken for neither. PascalCase was proposed as a
cheaper version of the same protection, on the grounds that every native name is
lowercase; it is not wrong, and it was given up for the reason below.

**At most one hyphen, and that is a measurement rather than a preference.**
React binds a custom element's events from a prop, and a probe dispatching each
candidate from a real element found that it stops at one: `onhelix-open` reaches
`helix-open`, and `onhelix-value-change` binds nothing at all. `conventionLint`
fails the build on a name carrying two.

**Which verbs are usable was measured the same way.** React's synthetic system
owns `change`, `input`, `submit`, `reset`, `copy`, `paste`, `scroll`, `drag`,
`focus` and `blur`, and a prop deriving from one of those is wired to the native
event, so ours would never fire. `open`, `close`, `toggle`, `select`, `dismiss`,
`navigate` and `remove` are free. That is why a value change is `helix-change`
and the rest can be bare verbs, and the linter carries the measured list.

**The same probe is what ended the PascalCase scheme.** Its argument was that
React strips `on` from a prop and listens for the remainder verbatim, so
`OpenChange` would be `onOpenChange`. Measured, React reserves *every* prop
matching `on[A-Z]` for its own system and drops what it does not recognize,
whether or not the element declares the property, so `onOpenChange` in raw JSX
never reached the element and never had. A callback prop is a feature of the
generated wrappers; the DOM event is the universal channel, and it needs a name
a plain listener can use.

The type in braces is what lets the React generator emit
`(event: HelixOpenEvent) => void` instead of `(detail: unknown)`. Each event is a
class in `helix/core/src/events/events.ts` that carries its own name and augments
`HTMLElementEventMap`. There is no generic `emit(name, detail)` helper: a
dispatch through one cannot be named by the analyzer.

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
- **A group is a part when it is the control, and a family when it arranges
  them.** The test is whether the group reports a form value.

  `Radio.Group` and `Toggle.Group` do. They own the `name`, the `value` and the
  validity, and a lone radio is not a control at all: it is an answer to one. The
  group is what the family is about, so it is a part of it, and the member has
  nowhere else to be.

  `Checkbox Group` and `Button Group` do not, and neither calls `setFormValue`.
  Each checkbox is form-associated and submits itself; the group adds
  `role="group"`, a shared name and one place to read the set. A button needs no
  group at all. Both are their own families, because their members are complete
  controls that the family does not need the group to explain.

  *Corrected 15 Aug 2026.* This read "groups are parts where homogeneous", which
  is a fact about the members rather than about the group, and by it both
  `Checkbox Group` and `Button Group` were violations. Neither is: the code was
  following the better rule and the rule was the thing that had drifted. A set of
  checkboxes and a set of radios are equally homogeneous and are not the same
  kind of thing, which is what "homogeneous" could not see.

  A container holding mixed content is a family for the older reason as well:
  `Toolbar` holds buttons, dropdowns and inputs, and is about none of them.
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

### The preview runs a different copy of Helix, and it is pinned

Two copies of the library are on that page and they are not the same build.

The sandbox's own chrome (the tabs, the tree, the toolbar) comes through Next's
module graph from `helix/web/dist`, so `bun run dev:watch` rebuilds it and HMR
shows it immediately. **The preview does not.** It runs `frame.js`, a 400 kB
classic-script IIFE built by `bun run frame` and served from `public/`, which is
the only shape that can carry the library into a sandboxed document (see below).

Both halves of that had to be fixed, and the second is the one that is easy to
miss: a bundle nothing rebuilds, and a bundle that, once rebuilt, still cannot
reach a tab that is already open.

- **`frame` is a turbo task**, `dependsOn: ["^build"]`, and `dev:watch` watches
  it rather than `build`. Because of that dependency, watching the frame
  rebuilds every library it carries as well, so the command does more and says
  less: `turbo watch frame --filter=@fusion-io/site-ui`. Turbo does not accept
  `--filter=pkg#task`, which is what makes the obvious version of this fail.
- **The preview reloads itself.** HMR never re-creates the iframe, so the bundle
  it executed at page load is the one still running, forever. The workbench
  polls `frame.html` in development and calls `HelixSandboxPreview.reload()`
  when its text changes; the new document announces itself and the source is
  resent by the path the first load already uses.
- **`frame.html` must never be cached.** `build-frame.mjs` stamps `frame.js` and
  `frame.css` with a hash of their contents, and those stamps live *inside*
  `frame.html`. Cache that file and the browser asks for yesterday's bundle by
  name forever, which is the stamping achieving precisely nothing. It is served
  `no-store` from `next.config.ts`, and the assets it names stay immutable.

**If you are ever verifying a fix without `dev:watch` running, it is
`bun run frame` and a page reload.** Not a hot reload, and not the chrome
looking right.

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

**An example shows the component. It never explains it.** Slot content is
whatever a real page would hold, which usually means a label and lorem, and the
reference page is where the reasoning goes. Written the other way the copy drifts
from the prose that is actually maintained, a reader has to pick the component
out of a paragraph about it, and anyone copying the example takes the essay with
it. Swept once across all 159: four app-header examples opened with three
explanatory headings apiece, and card, popover, dialog, drawer, accordion, toast
and callout each described their own variant in the slot a consumer fills.

A comment about the *example's own scaffolding* is different and stays, cut to a
line: `<!-- Preview frame: the submit is swallowed. -->` exists so nobody copies
`onsubmit="event.preventDefault()"` into production. A comment about the
component does not.

There is no check for this. The line is between prose about the component and
prose that is merely content, which no word count can see, and the two examples
that legitimately carry the most text (`app-header`, which needs something to
scroll, and `outline`, which needs sections to point at) would be the ones a cap
caught first.

**Names drop the product.** `helix-app-header` displays as "App Header":
repeating "Helix" on every row inside the Helix site is noise. The tag keeps its
prefix, because that is a real identifier a consumer types.

## Tree-shaking## Tree-shaking

One family per module, subpath exports (`@helix-io/web/card`) so consumers need
not import the barrel, and `sideEffects` declared honestly: `web` has them
because `@customElement` registers on import, `headless` does not. Getting it
wrong is silent both ways.
