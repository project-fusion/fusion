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

**It is a rule about the dependency, not about the character `{`.** `core`
already ships four token-free rules into every shadow root through
`HelixElement.finalizeStyles`: `box-sizing`, `:host([hidden]) { display: none }`,
a scroll container's `overflow`, and the transition suppression that stops a
component animating its own arrival. `HIDDEN` is the clearest case, because the
notes below argue that `hidden` is base-tier *state* on the grounds that the
platform acts on it, and the way the base tier makes the platform act is a CSS
rule shipped from here.

So the test for whether a rule may live in `core` is not "is it CSS" but "does
it name a token". A mechanism does not: `overflow: auto` is what creates a
scrollport, and without it `scrollTop` is permanently zero and every scroll API
on the element is inert. A decision does: a colour, a spacing, a duration, a
height, an `overscroll-behavior`, a scrollbar treatment. Those stay in
`helix/web`.

**A component marks a box whose scroll state it reads, with `data-scroller`, and
no other.** Three do: `ScrollArea`, `VirtualList` and `Carousel`. `Megamenu`'s
panel also scrolls and is deliberately unmarked, because it scrolls only from a
`max-block-size` the styled tier chose and the headless tier never asks it where
it is scrolled to. That line was found by measurement rather than by argument:
marking it moved a heading four pixels, `overflow` establishing a block
formatting context and margins that had been collapsing stopping.

**A rule and not an inline `style`**, which was the first idea. An inline style
on a rendered part outranks every author rule short of `!important`, so a
consumer wanting `overflow: hidden` there would have to fight it, and that is
the exact failure the cascade notes below describe: it moves the fight onto
consumers. A shadow rule loses to a document rule, so `::part(viewport)` from a
consumer simply wins, which is the right way round and is verified in Chromium.

**The mechanism is not sufficient on its own, and that is correct.** A scroll
container also needs a bounded box, and how tall a scroll area is, is a design
decision: the base examples supply it and each component documents it. What
changed is that a headless consumer now supplies a *size* rather than a size and
an `overflow` they had no way of knowing was missing.

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
  and the region stays hidden even when filled. Verified in Chrome 148:
  `:host`, `:host(*)`, and `:host([a])` report supported, `:host(:has(*))` does
  not, and the compound `:host:has(...)` reports supported and still does not
  work. JavaScript is not an option either: the server cannot inspect children.

  The consequence is that the inset moves to the container and slotted content
  is styled with `::slotted()`. Regions lose their `part`, which is the right
  trade: a header is whatever element the consumer slotted, not a wrapper we put
  around it. Keep a wrapper only where it carries something real, as `<nav>`
  does in AppHeader, being a landmark whether or not it is filled.

### State goes in markup, and `data-` is only a hook on top of it

**A base component has no stylesheet, so any state a stylesheet has to
interpret does not exist on that tier.** `hidden`, `inert`, `popover`, a real
`<dialog>`, `open` on `<details>`: these are the state, because the platform
already acts on them. `data-open` is a selector target the styled tier layers on
top, and it can never be the mechanism.

Twenty-four families already work this way and it was never written down, which
is how the accordion became the outlier nobody noticed. Its content region
carried `inert` and nothing else, so a closed section was out of the
accessibility tree and off the tab order with every pixel still on the screen,
under a trigger reporting `aria-expanded="false"`. The collapse was living in
the styled tier's `grid-template-rows: 0fr`, an animation that was doing the
hiding as a side effect.

**The tell is that the styled tier gets it right and the base tier does not.**
That is not a styling gap, which is the reading that hid this: it means the fact
was recorded in one tier's CSS rather than in the component. Ask of any
open/closed, shown/hidden, selected/not: *with every stylesheet deleted, is this
still true?*

**Adding the attribute usually costs the styled tier nothing**, because a styled
sheet that animates the region already sets `display` on it unconditionally, and
an author rule beats the UA sheet's `[hidden]`. Check that before reaching for
anything cleverer.

**`hidden="until-found"` is not a drop-in for `hidden`.** It hides through
`content-visibility`, which an author `display` does not override, so a region a
consumer styles would animate open to nothing. It also needs a `beforematch`
handler to set the open state, or find-in-page reveals content while the trigger
still reports collapsed.

### The base tier publishes facts, and CSS is a fine channel for them

**Setting a custom property is not styling, so the tier rule does not bar it.**
A base component knows things CSS cannot compute (where a thumb sits, how deep
a row is nested, a video's intrinsic ratio) and writing one into a
`style="--thing: 0.42"` hands it to whoever is drawing without reaching for a
single token. Forty-one properties do it, across sixteen families and the two
controllers in `core`: `--slider-fraction`, `--splitter-position`,
`--tree-level`, `--progress-fraction`, `--meter-sweep`, `--color-picker-hue`,
`--video-intrinsic-ratio`, `--indicator-x`, `--floating-arrow-x` and their
kind.

**The line is a fact against a decision.** A fraction, a position, an index, a
level, a measured ratio, a count: the component computed it and nothing else
can. A colour, a spacing, a duration, an easing: those are the styled tier's,
and a base component reaching for `--helix-*` to write one would be the
dependency the tier split exists to prevent.

**The underscore belongs where the package contains a reader.** A styled sheet
that writes `--_dialog-scrim` and reads it back three rules later has one: the
value never leaves, and the underscore says so, the same way it does on
`--_helix-*` primitives. Twenty-odd in `helix/web` are exactly that.

**A package that ships no stylesheet cannot have one.** `headless` and `core`
have no CSS by definition, so every property they write is read by somebody
outside the package, always. There was no private case there to mark, and
marking them told the one consumer who has to read them that they may not. All
41 lost the sigil and gained an `@cssproperty`: 32 on the headless components
that write them, 9 on the two controllers in `core`.

**`check:hooks` was what the underscore had been evading**, which is the part
worth remembering. It pairs an `@cssproperty` with a rule that reads one, in
both directions, and exempts `--_` names as a component talking to itself. Strip
the sigil and every undeclared one fails immediately. The convention was not
merely misleading, it was load-bearing.

**It failed the other way too, and that finding outlived the rename.**
`--floating-available-width` was written on every reposition of every floating
panel and no rule has ever read it. A declared hook nothing reads is a promise
on the API page with nothing behind it, so the write went rather than the check.

**Name it for the family, not for the sigil.** Five had been named assuming
privacy and could not simply be stripped: `--_hue` and `--_saturation` are
`--color-picker-*` now, and `--_color` was written by two families meaning the
same thing, so it split into `--color-input-swatch` and `--color-picker-swatch`.
A public name cannot be shared.

**Where the computed value and a consumer hook are a pair, keep both legible.**
`var(--date-picker-columns, var(--_calendar-columns, 1))` was a request falling
back to what the component chose, so the computed half is
`--date-picker-column-count` rather than something that reads like a second
opinion on the same setting.

### A component that renders another interpolates the tag and imports it

A custom element registers on import. A tag nobody imported is not an error and
not a warning: it is an inert unknown element, laying out as an empty inline
box. A panel built around one looks like a panel that failed to open.

So a template names **no tag at all**. It interpolates one:

```ts
protected renderPicker(): TemplateResult {
  const picker = this.tag('date-picker')
  return html`<${picker} part="picker"></${picker}>`
}
```

`tag()` prefixes the name with the class's `tier`, which is `helix-base-` on
`HelixElement` and `helix-` on every styled component. One template, and each
tier renders its own children. The styled subclass declares it in one line:

```ts
static override tier = 'helix-'
```

**The headless tier may not name a styled tag.** It is the dependency the tiers
exist to prevent: `helix/headless` composing `helix-select` renders an element it
does not ship, cannot test the composition (there is no `helix-select` on that
tier to test against), and leaves the base tier broken for anyone who imports
only it. Forty-two sites across sixteen families did this, on the argument that
each tier imports its own element under one name, which holds only while nobody
imports both, and the docs site imports both.

**Both tiers import, not just the one with the tag in it.** A styled component
extends the headless class and almost never overrides `render`, so it inherits
the template and the obligation with it, while having no tag of its own to
remind anyone. The import path is relative, so the same line in each tier
registers that tier's element. Date Input shipped without the styled import for
exactly that reason, and every example still looked right, because the sandbox
and the docs site import the whole barrel. That is the condition under which this
failure is invisible: it appears only for the consumer who imports one component.

`bun run check:composed` enforces all three: no literal tag in a template with a
tier below it, `tier` overridden wherever a base template interpolates, and the
family imported by both tiers.

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
`not.toContain('data-scrolled')` fails on a `:host([data-scrolled])` *rule*,
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

  **Bind it to the slot or to `renderRoot`, never to the host.** `slotchange`
  bubbles and is *not composed*, so it reaches the shadow root that owns the
  slot and stops there. Measured on `Stat`: one call on the slot, zero on the
  host, from the same assignment. A handler on the host simply never runs, and
  the attribute it was going to write stays absent, which is indistinguishable
  from the case it was meant to detect. That is what sank the first attempt at
  `data-labelled`, and every one of the thirty listeners in the library already
  does it the right way, `DisabledCascadeController` saying so in a comment.

  **And it does not fire when nothing is assigned**, which is a feature here:
  the resting state of a `data-` mirror is the attribute's absence, so an empty
  slot needs no event to stay correct. `Checkbox` carries the case where that is
  not enough.

`Avatar` had this before it was written down: its default slot falls back to
the initials derived from `name`. `Tooltip` follows it.

**`::slotted()` never matches fallback content, so a component styles its own.**
The selector matches *assigned* nodes, and fallback is not assigned: it belongs
to the shadow tree that wrote it. So a base class styling `::slotted(svg)` for
the icon a consumer passes reaches nothing when a subclass draws that icon
itself.

Measured on `CopyButton`, which extends `IconButton` and supplies a clipboard
and a check as slot fallbacks: both glyphs rendered, both inherited the right
colour, and both came out 0x0, because the only rule sizing an icon was
`IconButton`'s `::slotted()` one. A correctly sized, correctly coloured button
containing nothing.

This is the same class of failure as `:host(:has())` above and as a `[part=]`
selector for a part nothing renders: valid CSS, matches nothing, no error and no
warning. The fix is a rule in the component's own sheet using the same token the
slotted path resolves to, so an icon a consumer passes and one the component
draws come out identical.

**Reflect only what CSS selects on.** Reflection exists so a selector can reach a
value. `href`, `target`, and `rel` reflected on Button until they were told not
to, which wrote a destination onto a host that is not a link and put a bare
`target rel` pair into every button ever rendered. `appearance`, `size`,
`disabled`, and `orientation` reflect; the rest do not.

**And a reflected property takes no default.** The two together are what write
onto every host: `Tree.chevronPlacement` reflected and defaulted to `'start'`,
so the server's markup carried `chevron-placement="start"` for every tree
anybody rendered, including the ones nobody had configured. Declare it optional
and let the resting arrangement be the attribute's absence, which is what
`orientation` already does. The stylesheet then only asks about the departure:
`:host([chevron-placement="end"])` and nothing for the other case.

`tree-root.ssr.spec.ts` caught it, asserting that the host carries only what the
consumer wrote. That assertion is worth having on any component whose host takes
attributes, because it fails on a property added years after it was written.

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
six of our own examples. `requestControlledChange` therefore audits a
controlled element that asks and is not answered. Read the state **before**
dispatching, or a consumer answering synchronously looks identical to one that
was never there.

**It judges on the next request, not on a deadline.** It read the state back
after `setTimeout(0)` until 19 Aug 2026, which is true of React committing a
`setState` from a handler and false of anything slower: a consumer who answers
by navigating, as the documentation nav does by deriving a tree's `active` from
the route, cannot have moved the state inside one task and was accused of not
listening. Unmoved across two requests is unanswered whatever the timing, and a
control asked once and never again is never accused.

**Shared test scaffolding lives in `@helix-io/testing`**, one module per
environment: `dom` for happy-dom under bun, `browser` for Chromium, `ssr` for
Lit's server shim. `registerDom()` is idempotent because bun runs every DOM spec
in one process and `GlobalRegistrator.register()` throws on the second call. It
also shims `attachInternals`, which happy-dom does not implement. Lit's server
shim does, so the gap is the test double's alone and the fix belongs there. A
guard in `HelixFormElement` would make production code defensive about a
capability every browser has, and swallow a real failure.

**Import the code under test *after* `registerDom()`, in `beforeAll`.** A static
import runs first, so anything extending a DOM global captures bun's own rather
than happy-dom's, and the error never mentions the import. It has cost two
sessions: a class extending `Event` was refused by `dispatchEvent` as "parameter
1 is not of type 'Event'", and an element whose base class extended the wrong
`HTMLElement` crashed happy-dom's *parser* on `innerHTML` with
`attributes.getNamedItem` undefined. One `import { PALETTE }` was enough to drag
the module in: it is the module that matters, not what is taken from it.

**Anything a spec puts on a global, it puts back.** One process, so a shadowed
`document.activeElement` answers a stale value to every file that runs after it,
and a spec that passes alone fails only in the whole-suite run, which is the one
shape of failure a per-file run can never show. Restore in `afterEach` or a
`finally`.

**In the browser, module state is per family and prototypes are not.**
`build-specs.mjs` emits one bundle per family and the runner imports all of them
into one page, so a module-scoped map has the reach of one bundle while
`HTMLElement.prototype` has the reach of the page. Guarding on the second and
recording in the first is how every form-value assertion outside the first
family came to read `undefined`: 34 failures that each looked like a component
not reporting to its form, while happy-dom passed all of them. Shared state goes
on `globalThis`, next to the guard that decides whether to write it.

**A spec that reads layout has to check the double before trusting it.**
happy-dom has none, and its gaps are silent rather than loud: it answers
`0 0 0 0` to every `getBoundingClientRect`, `1` to `getClientRects().length` for
a `display: contents` element, the empty string for `overflowX` unless the
longhand was written, `false` to `delegatesFocus` however it was asked for, and
`undefined` for `TransitionEvent.propertyName` whatever was passed in. It
implements no ARIA element reflection at all, and
`insertAdjacentHTML('beforeend', '<tr>')` on a `<tbody>` inserts nothing while
still counting as a mutation. Supply the input the double cannot produce, and
say in the spec which half is being asserted. Two of those gaps produce a test
that passes against code doing nothing.

## Appearance is the treatment, tone is the meaning

**Two properties, never one.** `appearance` is how a thing is drawn (`solid`,
`outlined`, `subtle`, `ghost`; `elevated`, `plain`, `card` where those fit) and
`tone` is what it means (`neutral`, `primary`, `danger`, and the status set on
anything that reports a status).

`Tag` found this first and `Button` followed it 19 Aug 2026. Button held
`primary`, `secondary`, `tertiary` and `danger` on one property: the first three
are a rank and the fourth is a meaning, so an outlined Delete and a Delete in a
menu row could not be written at all, and neither could a filled neutral. The
same test applies to anything new: *can two of these values be true at once?* If
yes they are two axes, whatever the count of combinations looks like.

**The resting state is the absence of both**, per the reflected-property rule
above: `outlined` on Button, `ghost` on IconButton, and `neutral` everywhere.
Written out, those values select nothing and land on the base rule.

**Every appearance names its own hover.** A generic
`:host(:not(:disabled)) [part="button"]:hover` is four class-equivalents and an
appearance rule is three, so an appearance without a hover of its own loses its
fill the moment a pointer touches it. Measured on the old `danger`, which had no
hover rule and turned neutral grey under the pointer in every build since it was
written.

## Size and density

**A control has no size. It takes its height from the region it is in.**

```html
<helix-flex data-density="lg">
  <helix-button appearance="solid" tone="primary">See what is shipping</helix-button>
</helix-flex>
```

The reasoning, because the conclusion looks like a restriction and is not. Size
gets asked to do three jobs at once, and only one of them belongs to the
control:

- **Emphasis.** `appearance` carries it. A filled button says "this one matters"
  far louder than eight more pixels.
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

- **`helix/styles` holds helpers**, keyed on `data-`: `data-button`, `data-link`,
  `data-text`, `data-navigation-item`, `data-prose`. A recipe pairing a helper
  with the component (`[data-button], helix-button`) is one decision written for
  two surfaces and is fine.

  **A helper needs its base case, not only its variants.** `[data-link]` had
  none: `data-link="subtle"` and `"quiet"` were written as departures from the
  prose anchor rule, and that rule is scoped to `[data-prose]`, so a plain
  `data-link` outside prose selected nothing and the anchor fell through to the
  browser's default underlined blue. Every non-prose anchor on the site, and
  invisible for months precisely because the variants existed and worked. The
  bare attribute now joins `:where([data-prose] a)` in the same rule: the prose
  half stays at zero specificity so a consumer's class beats it, the attribute
  half is `0-1-0` so it beats the element reset, and the variants are the same
  weight and follow in source order, which is what lets them keep winning.
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
- **The manifest records paths, never URLs.** `helix-source` derives a family's
  source directory from its module path, the way `helix-composition` derives the
  group and the part from the same string, so it cannot disagree with where the
  file is and it survives a move. What it stores is
  `helix/web/src/accordion`; the site composes
  `{repository}/tree/{ref}/{path}`.

  **The split is about versioning and is worth keeping even before it matters.**
  Documentation will be versioned and a reader will choose the version, so the
  ref belongs to whoever renders the link. A URL baked into the manifest makes
  every archived page point at today's source, which is the one thing a
  versioned reference must not do. What is durable is where a directory sits in
  the repository; what is not is which commit anyone wants to read.
  `site/ui/lib/source.ts` is the only file a version selector has to touch.

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

**Hyphens are not limited, and the rule that said so was wrong.** *Deleted 19
Aug 2026.* `bindable-events` barred a second hyphen on the grounds that React
binds no event whose name carries two. It binds them fine. Measured in Chrome
against React 19.2.8, `ona-b-c-d` binds exactly as `onhelix-open` does, and
`react-dom` slices `on` off the prop and hands the remainder to
`addEventListener` without inspecting it. Web Awesome ships `wa-after-hide` and
`wa-column-resize` to production, which is the same finding from outside.

**What the original probe caught was hydration, read as a fact about names.** On
a server-rendered page React attaches no custom element listener at all,
whatever it is called, until it commits an update for some other reason, so
which names appeared to bind depended on what else was on the page. The earlier
reading in `docs/09` had already contradicted itself once and said so. A rule
drawn through noise survives exactly as long as nobody re-runs the probe, which
is the argument for re-running it.

**A verb React has claimed is reachable anyway, because of the prefix.** Its
synthetic system owns `change`, `input`, `submit`, `copy`, `focus` and the rest,
and a prop matching one of those is wired to the native event. Nothing strips
our prefix, so `onhelix-change` matches none of them and arrives.

**The same probe is what ended the PascalCase scheme.** Its argument was that
React strips `on` from a prop and listens for the remainder verbatim, so
`OpenChange` would be `onOpenChange`. It does listen for the remainder
verbatim, and that is the problem: `onOpenChange` binds an event called
`OpenChange`, which nothing dispatches. The prop is not dropped, and it is not
assigned to the property of that name either, because React takes its `on`
branch before reaching the one that would assign it. The DOM event is the
universal channel, and it needs a name a plain listener can use.

The type in braces is what lets the React generator emit
`(event: HelixOpenEvent) => void` instead of `(detail: unknown)`. Each event is a
class in `helix/core/src/events/events.ts` that carries its own name and augments
`HTMLElementEventMap`. There is no generic `emit(name, detail)` helper: a
dispatch through one cannot be named by the analyzer.

**A control the reader edits continuously announces `helix-input`; one that
changes in discrete steps announces `helix-change`.** That is the platform's own
pair, and we had only half of it: `helix-change` fired on every keystroke while
the native `change` we relay fired on commit, so an element carried two events
whose names said the opposite of their timings. A consumer reading "change" as
"the reader is done" wired a request to `onhelix-change` and sent one per
character. Web Awesome and Spectrum both use the native names, so anyone
arriving from either, or from HTML, read ours backwards.

Five controls are continuous: Input, Textarea, Number Input, Pin Input and
Slider. They set `announcesInput` on `MixinControllerValue`, which picks the
event; everything else changes one step at a time, and a step is a change.

The `@controlled` tag on `value` names both, and the plugin keeps whichever the
component declares, so one tag serves both shapes and a component cannot ask a
consumer for a handler it never fires.

**A controlled property declares itself with `@controlled`**, naming the events
that answer it:

```ts
/** Whether the control is checked. @controlled helix-change */
```

Declaring `value` on a Helix control is a claim of ownership, so the element
announces and applies nothing until it is told. Which properties work that way
was inferred from `inheritedFrom` for exactly one commit, on the reasoning that
they all come from a controller mixin. Eight do not: pagination's `page` and its
size `value`, toast's `open`, listbox's `filter`, splitter's `position` and
`collapsed`, carousel's `index`, date picker's `month` are implemented in the
component and inherit from nothing. A third of the surface went unguarded and
every check reported success.

Nothing in the source says it either, short of a guess: `requestControlledChange`
is called from a private method three hundred lines from the property it
settles. So the property says so, `check:controlled` holds the tag and the call
together in both directions, and the generated JSX types refuse the property
without a handler.

`@controlled` on the property, not the class, so it survives inheritance: a
component's `checked` is a copy of the mixin's member, and a list kept beside
the members would need merging by hand at every tier.

Every `@property` gets a one-line description.

**A camelCase property needs an explicit `attribute`.** Lit lowercases a
property name to derive its attribute rather than dash-casing it, so
`removeLabel` is reachable only as `removelabel` unless it declares
`@property({ attribute: 'remove-label' })`. Nothing warns: the attribute a
consumer would guess simply does nothing.

## Use the elements directly

**Write `<helix-card>` in JSX.** Plain custom elements, no wrapper, no patched
React, and no React package: there is not one.

**Bind Helix events with `onhelix-*`, and the element repairs the rest.**
*Reversed 19 Aug 2026, which is the day it was written.* This read "bind with
`addEventListener`, not a prop", because those props do not survive hydration:
React records them, attaches no listener, and the handler never runs until React
commits an update for some other reason. Nothing is logged and the element goes
on doing its own job, which is why it passes every casual check. Before it was
found, the sandbox's example tree and file tabs were dead on every fresh page
load.

The handler is on the node the whole time, under a key React stashes there, so
`HelixElement.dispatchEvent` reads it and binds it immediately before
announcing. It binds the **raw prop function**, which is what makes the handover
safe: React adding the same handler again is a no-op by specification, and React
removing it on its next commit matches ours exactly. Measured in Chrome against
19.2.8 on a real hydrated page, four events produced four calls across a commit.
See `bindReactHandler` for the whole argument.

The bug underneath is React's, [facebook/react#35446](https://github.com/facebook/react/issues/35446),
open since January 2026 with a proposed fix unmerged. When it lands this becomes
dead weight and should go.

*Re-checked 21 Aug 2026: still open, and PR #35474 is still the proposed fix and
still unmerged.* Which version this was measured against is not left to prose:
`check:react-bridge` reads the number out of this file and fails if the
installed `react-dom` has moved past it, because a probe is a claim about one
release's internals and nothing in `verify` reads a comment.

**Object and function *properties* have the same bug and are not fixed.** React
skips everything it would have to apply imperatively while hydrating; strings,
numbers and booleans survive only because the server wrote them as attributes.
Binding at dispatch cannot be repeated for a property, which has to be right
before the first paint rather than by the time somebody interacts. The design
that would work, and why it is deliberately unbuilt, is written out beside
`bindReactHandler`. It becomes real the first time a component declares an
object property, and not before.

`useHelixEvent` is deleted. It existed to bind from an effect because the prop
did not survive hydration, and all twenty-one of its call sites were binding to
an element the component itself rendered, so all twenty-one are props now.
Capture is a prop too: React slices a trailing `Capture` off the name and binds
with `capture: true`, measured for our hyphenated names as much as its own. What
is left for an effect is `once` and `passive`, which no prop expresses, and a
target the component does not render, and both are three lines of `useEffect` at
the point of need.

`useElementRef` stays, in `lib/use-element-ref.ts`, for the case that is not
about events at all: an effect or a memo that takes the element as a dependency,
which a `RefObject` cannot announce. The sandbox observes its splitter's width
and reads its tree's rows that way.

React's own events are unaffected **where they bubble**: `onClick` on a
`<helix-button>` goes through the synthetic system, which hydration does set up.

**A relayed native event that does not bubble reaches nothing, and the element
binds that one too.** React recognises `onError` and `onLoad` as its own names
and attaches nothing to a custom element for either: its delegated listener sits
at the root and sees only what bubbles, and the non-delegated list it wires for
`<video>`, `<audio>` and `<img>` is never wired for a custom element. Avatar
relays `load` and `error`, Video relays `ended`, `play` and `pause`, all five
declared public API and all five silent in React. An avatar fallback was a
shipped feature that did nothing.

The rule splits by bubbling, and getting it backwards would be worse than the
bug: React's listener for a bubbling relay is at the root rather than on the
element, so a second one bound here is not deduplicated and the handler runs
twice. `reactPropFor` carries the measurement.

**The prop form still decides event names**, because it is what a consumer
reaches for first and what has to keep working once React fixes this.
`onhelix-open` reaches `helix-open`; `onHelixOpen` binds an event called
`HelixOpen` that nobody dispatches, and never reaches the property of that name
either, because React takes the `on` branch before the one that would assign it.

That last part is why `onCheckedChange` and its siblings never worked from
JSX, and why they are gone. They were not dropped:
`addEventListener('CheckedChange', …)` was called, for an event nothing sends.

**There is one channel per fact, and it is the event.** The four callback
properties on the controller mixins were removed 19 Aug 2026. They duplicated
`helix-change`, were unreachable from the JSX every React consumer writes, and
were justified in their own comments by a generated wrapper that had already
been deleted. A consumer who wrote one now gets a warning naming it, because
removing a property is silent in a way removing an event is not.

**And no hyphenated JSX prop is type-checked, by anyone.** TypeScript exempts a
JSX attribute whose name is not a valid identifier from checking on an intrinsic
element, so `onhelix-opne`, `on:helix-open` and an invented `totally-made-up`
all compile clean against the generated types, which do reject a wrong *value*
on a normal attribute. Measured with `tsc`. `HelixElement` therefore reads the
props React is holding and warns, once per element, about an `on` prop attached
to nothing. That is the only place it can be caught.

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
  version to wait for. *Re-checked 21 Aug 2026 against the registry: still
  0.2.4, published 11 July 2025, thirteen months ago. `@lit-labs/ssr-react` did
  move, to 0.3.4 on 23 December 2025, which makes the point sharper rather than
  softer: the sibling is maintained and the Next.js integration is the one that
  is not, and it is the one this depended on.*

Marking pages `'use client'` did make it work, at 15.1 kB of route JavaScript.
That is not the trade: it surrenders RSC on every page using a component, to
keep an unmaintained patch to React.

**Verify in a browser, never by grepping the HTML.** A string check passes on
markup the browser then discards, which is exactly how the broken DSD survived
several commits. The assertion that means something is
`element.shadowRoot !== null` on a loaded page.

## Framework typings, and the names they carry

**There are no wrappers and there is no `helix/react`.** *Corrected 24 Aug 2026,
and the section this replaces described a package that does not exist.* It said
wrappers were generated by `bun run generate` in `helix/react`, and neither the
directory nor the script is in the repository: the typings are emitted by cem
plugins during `bun run analyze`, `jsx.d.ts` by `@wc-toolkit/jsx-types` with
`jsxReactRef` and `jsxImports` on top of it, and `vue.d.ts` and `svelte.d.ts`
beside them. Consumers write `<helix-card>` directly, which the section below on
using the elements has said the whole time.

The rule outlived the decision the same way the event-naming one did, and with
the same cost: `tiers.mdx` carried an `@helix-io/react` row in its package table
while `introduction.mdx` two pages earlier said there is no React package, and
`DisclosureRoot` was cited here as a naming example for a family that has never
existed. Found by reading the documentation end to end.

What survived is the naming, which was never about wrappers:

- **Namespaces mean composition, never variation.** `Tabs.Root` contains
  `Tabs.Tab`. An icon-only button is not a part of Button, so `IconButton` is
  top-level. Variants are props; alternatives are separate components.

  `Card.Root` and `Card.Header` were the example here, and this file says nine
  hundred lines above that Card's five elements became one and its header became
  a slot. An illustration the same document deletes teaches the reader to distrust
  both halves.

  `Code` and `CodeBlock` are the same call. One flows with a sentence and must
  never scroll; the other is a figure with its own box, its own overflow, a name
  and something to copy. `Code.Block` would say the second is part of the first,
  and it is not.

  **`CodeBlock` holds no parser, and that is the interesting half.** Syntax
  highlighting is `@helix-io/sandbox/highlight`, a Lezer parse and a tree walk
  with no editor mounted and no DOM required, so it runs during a build and a
  static page ships coloured markup with no JavaScript spent on it. Those
  grammars are already in that package for the editor, so nothing new is
  installed; putting them in `helix/web` would put CodeMirror in every
  consumer's `dependencies`, which is about 4 MB paid at install time whatever
  anyone imports. `CodeBlock` renders a `<slot>`, so highlighted markup drops
  straight in and the component stays free of it. A snippet on a reference page
  and the same snippet in the sandbox are then coloured by one grammar rather
  than two that agree by coincidence.
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
- **`ref` is typed to the element class**, not `HTMLElement`, or a component's
  imperative methods are unreachable through it. That is the `jsxReactRef`
  plugin's whole job, and it is the one thing `@wc-toolkit/jsx-types` does not do
  on its own.
- **The generated props sit beside React's own**, so `onClick`, `className`,
  `style`, ARIA, `slot`, `part` and `data-*` typecheck on a Helix tag without
  being declared per component.

## The sandbox

`@helix-io/web` ships the sandbox shell and `@helix-io/sandbox` the editor and
the spec runner; `site/ui` is the Next site that renders them. Both dev and
production work the same way as the marketing site, with element registration in
one client component.

- **The shell ships from `helix/web`; the editor does not.** *Reversed 19 Aug
  2026.* This read "a separate package, never the component library", against
  the previous Helix having exported ten sandbox classes from `helix/web`'s
  public barrel: 119 kB of 1.22 MB, a tenth of the library, shipped to every
  consumer as tooling for one internal site.

  **That measurement was taken when the barrel was the only way in.** Subpath
  exports and honestly declared `sideEffects` are what changed it: a consumer
  importing `@helix-io/web/card` never sees a sandbox. The cost the old rule was
  protecting against is now opt-in, and what is left is a question about what
  the thing *is* rather than what it weighs.

  So `Sandbox` is a component, under `@category tooling`, single tier. It earns
  that by the same test as everything else: behaviour, state and API. Pane-size
  memory across a content change, panel collapse, `hasPanel` so an omitted panel
  paints no band, and separator labels. Single tier because the headless and
  styled split exists so a consumer can bring their own presentation, and nobody
  reskins a dev tool.

  **And the name is honest, which was checked rather than assumed.**
  `Sandbox.Preview` hardcodes `sandbox="allow-scripts allow-forms"` on its frame
  and never `allow-same-origin`: the component *is* the boundary, not a layout
  that happens to sit near one. Had the isolation stayed behind, the name would
  have had to go with it.

- **`editor` and `specs` stayed in `@helix-io/sandbox`.** The editor carries
  CodeMirror, about 4 MB installed against a design system of roughly the same
  size, and a `dependencies` entry is paid at install time by every consumer
  whether or not they import it. **That is the one cost a subpath export cannot
  solve**, and it is the whole reason the split falls where it does rather than
  at the package boundary. The spec runner imports and runs this repository's
  own spec files, so it is internal by definition rather than by weight.

  **And `@helix-io/sandbox` is `private` while Helix is pre-release**, so today
  the cost is not opt-in, it is unavailable: a consumer gets the published shell
  from `@helix-io/web` and brings their own source pane. The shell is slot-based
  and the root hands its value to whatever is slotted in, so this degrades
  rather than breaks. The scope still says Helix, because the package is Helix;
  `private` is what says it does not ship, and flipping it is a one-line change
  when there is a consumer outside this repository to flip it for.

- **Which pane leads is a property, not a slot order.** `lead="preview"` puts the
  preview first. Two consumers legitimately disagree: a workbench is a place to
  write, so the source leads and the preview answers it; a reference page is a
  place to look, so the preview leads and the source is what a reader opens if
  they want to know how it was done. **The slot name travels with the pane**, so
  each keeps its own `data-pane` and the stylesheet needs to know nothing about
  the order. Relabelling the box while leaving `name="source"` in the first
  position would put the consumer's preview into the pane marked source, which is
  the bug the property exists to prevent. `split` follows the lead pane, so
  `split="30"` means the same thing in both directions.
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
shows it immediately. **The preview does not.** It runs `frame.js`, an 873 kB
classic-script IIFE built by `bun run frame` and served from `public/`, which is
the only shape that can carry the library into a sandboxed document (see below).
It was 400 kB before the sandbox shell moved into `@helix-io/web`, which the
frame imports whole: the shell now rides in every preview, which is what lets an
example render a `<helix-sandbox>` at all.

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

- **`/components/<family>` is the whole component**: what it is, how to import
  it, the headline example running, the API, and the list of every other
  example. *Reversed 19 Aug 2026.* This read "the API, read from the manifest
  and nothing else. No examples: a reference page that starts collecting
  pictures stops being complete." What the split actually produced was two
  pages a reader had to hold in their head at once, the tables here and the
  pictures elsewhere, and no page that answered "what is this and how do I use
  it" without a navigation in the middle of the answer. Completeness was never
  the thing at risk; the manifest still decides what the tables say, and a
  picture beside them cannot make them less complete.
- **`/components/<family>/<example>` is the sandbox**, one example, editable.
  Still the place an example is *changed*. The reference page is where the
  headline one is *seen*.

**Which tier a reference page documents is a preference, not a route.**
`Base`/`Styled` lives in the preferences drawer beside colour mode, keyed
`fusion-api-tier`, and styled is the default because it is the tier almost
everyone consumes and because it is a superset: styled extends base, so its
tables already contain every member base would show.

The page renders **both** tiers and a `data-api-tier` attribute on the document
hides one. That is not a shortcut. The preference is in `localStorage`, the
reference pages are static and server-rendered, and the server cannot read it,
so filtering in React would mean the server rendering one tier while the client
wants the other: a hydration mismatch on every component page. Marking both and
letting CSS choose costs a little HTML and cannot disagree with itself, which is
the same trade colour mode already makes.

`display: none`, never a clip. The hidden tier has to leave the accessibility
tree as well as the page, or a reader being read the styled API gets the base one
read out underneath it and the rail points at sections that are not shown.
Styled is expressed as the *absence* of the attribute, so the document's resting
state is the common answer.

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

**One more comment is allowed, and it is marked.** `<!-- @summary … -->` is the
example's one-line description, read by the `helix-examples` plugin into the
manifest and shown in the Examples table. It has to be marked rather than
positional precisely because of the paragraph above: a leading comment already
means "scaffolding", and read by position the Form example's description would
tell a reader it is about a swallowed submit. `@summary` rather than
`@description`, because that is already this codebase's word for a single line.

**Examples reach the manifest, not the site.** `helix-examples` walks
`src/<family>/.examples` and records slug and description on the family's root
declaration. The docs site used to walk that folder itself, which put the
knowledge in the wrong place: the site is a consumer, and it was reaching past
the published interface into the library's source tree to find out what a
component ships. The markup stays on disk: it is the sandbox's payload, it is
large, and every consumer parses this manifest whether or not it renders one.

A family with an `index.ts` and no `.examples` fails `check:examples`. That is
what makes a directory a family, the same question the package's `exports` map
asks, which is why `field/` is exempt and why moving the sandbox into
`helix/web` obliged it to ship an example.

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
