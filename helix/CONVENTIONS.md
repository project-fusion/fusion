# Helix rules

## Tiers

```
styles     tokens, base layer. Pure CSS, zero dependencies
core       HelixElement, mixins, event classes
headless   structure, a11y, state, form participation. NO CSS
styled     the styled tier. Extends headless, references tokens
```

There is no `react` tier. The framework typings, `jsx.d.ts`, `vue.d.ts` and
`svelte.d.ts`, are written from the manifests of the two tiers above, and
[Framework typings](#framework-typings-and-the-names-they-carry) says what they
carry.

**`headless` must never depend on `styles`.** That constraint is what makes the
headless tier independently consumable. If styling leaks downward, we have
shipped one package in five files.

**It is a rule about the dependency, not about the character `{`.** `core`
already ships token-free rules into every shadow root through
`HelixElement.finalizeStyles`: `box-sizing`, `:host([hidden]) { display: none }`,
a scroll container's `overflow`, the mirror a chart's drawing and a caret take
on a right-to-left page, and the transition suppression that stops a component
animating its own arrival. `HIDDEN` is the clearest case, because the
notes below argue that `hidden` is base-tier *state* on the grounds that the
platform acts on it, and the way the headless tier makes the platform act is a CSS
rule shipped from here.

So the test for whether a rule may live in `core` is not "is it CSS" but "does
it name a token". A mechanism does not: `overflow: auto` is what creates a
scrollport, and without it `scrollTop` is permanently zero and every scroll API
on the element is inert. A decision does: a color, a spacing, a duration, a
height, an `overscroll-behavior`, a scrollbar treatment. Those stay in
`helix/styled`.

**A component marks a box whose scroll state it reads, with `data-scroller`, and
no other.** `ScrollArea`, `VirtualList`, `Carousel` and `ObjectInspector` do.
`Megamenu`'s panel also scrolls and is deliberately unmarked, because it scrolls
only from a `max-block-size` the styled tier chose and the headless tier never
asks it where it is scrolled to. That line was found by measurement rather than
by argument: marking it moved a heading four pixels, `overflow` establishing a
block formatting context and margins that had been collapsing stopping.

**`Chat` and `DataTable` are a departure and not a second exception.** Both read
`scrollTop` on the headless tier and both take the `overflow` that makes the
reading mean anything from their styled sheet, so the window each of them draws
is inert on a page that loads only `helix/headless`. Written down rather than
corrected in passing, because marking a box is the change `Megamenu` says to
measure first.

**A chart marks the drawing that runs along the line of text, with
`data-mirror`**, and on a right-to-left page `core` turns it about its vertical
axis, so a category or a time axis starts where the text does. The names and
ticks around a drawing are HTML in logical properties and turned on their own;
before the mark, the columns under them did not. Values keep their vertical
sense and numerals are text, so neither reverses. A whole ring stays unmarked,
clockwise from twelve being a clock's convention rather than a script's, and a
half ring is marked, being read across like a line.

**An axis that follows reading order mirrors, and a value axis does not.** Bar,
line, area and sparkline run along their categories or their time, which is the
order the text reads in. A horizontal bar's length is a value, and it still
grows out of its name at the inline start, the name being where the row is
read from. A scatter's across is a measure with no name to grow from, and more
is to the right in every script, as on a number line, so the chart holds its
plane left to right itself: a `plane` part carrying `dir="ltr"` around the plot,
both axes and their names, which keeps the y axis on the left with no sheet
asked to know. The names carry `dir="auto"` so one in Arabic reads its own way,
and the summary and the bubble keep the page's direction, being words.

**A glyph that points along the line takes the same mark**, from the component
that draws it and so knows what it means: a caret meaning next or previous, the
one between two crumbs, a shut disclosure. The headless tier then points it the
right way with no stylesheet, where each styled sheet used to turn its own and a
headless page had to know to. A glyph a sheet stands on its side is that
sheet's to turn, and a consumer's icon asks with `mirror`, the icon names being
physical. **An arrow key moves where it points** by the same reasoning:
`inlineStep` says which way along the line a horizontal key goes, and every
component moving on the horizontal pair asks it rather than reading
`ArrowRight` as forward. A media player's timeline is an exception, a tape
running one way whatever the script, and says so where it is drawn. Pin Input's
row of boxes is the other, a code being read like a phone number: the row
carries `dir="ltr"`, so the right arrow moves on and a paste fills rightward on
every page, while the label, hint and feedback keep the page's direction.

**A rule and not an inline `style`**, which was the first idea. An inline style
on a rendered part outranks every author rule short of `!important`, so a
consumer wanting `overflow: hidden` there would have to fight it, and that is
the exact failure the cascade notes below describe: it moves the fight onto
consumers. A shadow rule loses to a document rule, so `::part(viewport)` from a
consumer simply wins, which is the right way round and is verified in Chromium.

**The mechanism is not sufficient on its own, and that is correct.** A scroll
container also needs a bounded box, and how tall a scroll area is, is a design
decision: the headless examples supply it and each component documents it. What
changed is that a headless consumer now supplies a *size* rather than a size and
an `overflow` they had no way of knowing was missing.

- **Base extends, styled inherits transitively.** Styled must never extend a
  different root, or a form control's validity ends up in one branch and its
  presentation in another.
- **Base is headless, styled is presentational.** Base owns markup, ARIA, slots,
  events, form participation. No CSS, no tokens, and none of the styled visual
  axes. `tone` is the one that crosses, because it says what a thing means and
  meaning survives having no stylesheet.
- **The headless tier is `BaseCard`, not `CardBase`**, and namespaces as
  `BaseCard.Root` beside `Card.Root`. Both tiers register elements
  (`helix-headless-card`, `helix-card`): an unregistered element can only be
  subclassed, which is not "independently consumable".
- **Mixins add API, controllers add behavior.** If it introduces a property or
  method a consumer uses, it is a mixin. If it only reacts to lifecycle, it is a
  controller.
- **One folder per part**: `card/root/card-root.{ts,css,dom.spec.ts}`. The
  folder is what the composition plugin reads. **A helper the family owns and
  no one part does sits at family level**, beside `index.ts`, and is named for
  what it is rather than for the family: `color-picker/color.ts`,
  `code-block/patch.ts`, `filter-input/grammar.ts`, and in the styled tier
  `aura/shader.ts` and `orb/shapes.ts`. A part's folder holds the part, so a
  reader opening `root/` finds the element and its sheet and not the
  arithmetic behind them.
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

### State goes in markup, and the mirror is only a hook on top of it

**A base component has no stylesheet, so any state a stylesheet has to
interpret does not exist on that tier.** `hidden`, `inert`, `popover`, a real
`<dialog>`, `open` on `<details>`: these are the state, because the platform
already acts on them. `:state(open)` is a selector target the styled tier layers
on top, and it can never be the mechanism.

Twenty-four families already work this way and it was never written down, which
is how the accordion became the outlier nobody noticed. Its content region
carried `inert` and nothing else, so a closed section was out of the
accessibility tree and off the tab order with every pixel still on the screen,
under a trigger reporting `aria-expanded="false"`. The collapse was living in
the styled tier's `grid-template-rows: 0fr`, an animation that was doing the
hiding as a side effect.

**The tell is that the styled tier gets it right and the headless tier does not.**
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

### The headless tier publishes facts, and CSS is a fine channel for them

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
can. A color, a spacing, a duration, an easing: those are the styled tier's,
and a base component reaching for `--helix-*` to write one would be the
dependency the tier split exists to prevent.

**The underscore belongs where the package contains a reader.** A styled sheet
that writes `--_dialog-scrim` and reads it back three rules later has one: the
value never leaves, and the underscore says so, the same way it does on
`--_helix-*` primitives. Twenty-odd in `helix/styled` are exactly that.

**A package that ships no stylesheet cannot have one.** `headless` and `core`
have no CSS by definition, so every property they write is read by somebody
outside the package, always. There was no private case there to mark, and
marking them told the one consumer who has to read them that they may not. All
41 lost the sigil and gained an `@cssproperty`: 32 on the headless components
that write them, 9 on the two controllers in `core`.

**the `hooks` rule was what the underscore had been evading**, which is the part
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

`tag()` prefixes the name with the class's `tier`, which is `helix-headless-` on
`HelixElement` and `helix-` on every styled component. One template, and each
tier renders its own children. The styled subclass declares it in one line:

```ts
static override tier = 'helix-'
```

**The headless tier may not name a styled tag.** It is the dependency the tiers
exist to prevent: `helix/headless` composing `helix-select` renders an element it
does not ship, cannot test the composition (there is no `helix-select` on that
tier to test against), and leaves the headless tier broken for anyone who imports
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

**Registering a taken tag returns quietly and says so.** `customElement` in
`helix/core` declines rather than throwing, because Next.js evaluates a module in
both graphs and `customElements.define` throwing takes down the whole prerender.
Declining in silence is the other half, and it was missing: the registry keeps
the first constructor, so on a page carrying two copies of Helix every
`<helix-button>` is the first copy's class whatever the second exports.
`el instanceof HelixButton` then returns `false` against an element that is
visibly a button, and a version's fixes are absent from elements a consumer
believes are on that version. Nothing throws and nothing renders wrong, which is
the worst shape a library failure takes.

So it warns, once per tag, and **only in a browser**. Lit's SSR shim provides
`customElements` and `document` and leaves `window` undefined, measured against
`@lit-labs/ssr` rather than assumed, so `typeof window` separates a real page
from the render pass the guard was written for. A diagnostic that fires during a
build is one somebody turns off.

`helix component --only composed` enforces all three: no literal tag in a template with a
tier below it, `tier` overridden wherever a base template interpolates, and the
family imported by both tiers.

## Server rendering

Every component must render on a server with no DOM. The app no longer ships
declarative shadow DOM (see below), but Lit SSR still has to succeed: it is what
the `*.ssr.spec.ts` suite exercises, and a component that touches the DOM to
render is broken in any non-browser context.

Shadow styles now arrive with the definition rather than in the markup, so the
flash window is "before the element upgrades", covered by
`@fusion.dev/helix-styles/helix.css`. Within that, the risk is still **state, not
styling**.

1. **Never initialize state in `connectedCallback`.** SSR does not call it.
   Derive from properties, or seed in `willUpdate`, which SSR does call.
2. **SSR has no DOM.** The element shim carries attributes but not tree
   traversal: `querySelector` is undefined, `children` is undefined, and any
   parent-to-child coordination throws. Anything that inspects the tree is a
   client-side enhancement.
3. **Read the children before the render, except while hydrating.** A value
   read from the children after a render and written into state renders the
   component twice, and Lit's dev build warns about it. So read them in
   `willUpdate`, or in a getter the render calls, through `this.knownChildren`,
   which is every child where they can be known and none on a server or while
   hydrating what one sent; and call `this.finishHydration()` from
   `firstUpdated`. Lit hydrates declarative shadow DOM by assuming the markup
   already shows the first render, so that render has to be the server's: a value
   that differs is never written, and a template that differs throws. Not knowing
   is not "none": `this.childrenKnown` false means an empty state is not
   served. Measuring layout is the exception, since it can only follow a render.
   A `slotchange` is no substitute for the first read either: a declarative
   shadow root reports its slots as it is parsed, before any listener exists.
   A component that assigns its slots by hand hydrates a root that can only
   assign by name, so on one (`this.assignsByName`) it writes `slot` onto its
   children with `this.route()` instead, and nowhere else. A parent that writes
   state onto its children writes through `whenHydrated`, since a child's
   hydrating render has to be the server's too. The platform settles an image a
   server sent before anything listens, so a component asks it what happened
   when `this.serverRendered`, and relays the answer a task later. `bun run
   check:spec:dsd` hydrates every example in Chromium against a client's render.
   A family that fails it is fixed, not held in `KNOWN`, which is for a finding
   the fix is still on its way to.
4. **Semantics on the host, presentation in the shadow root.** IDREFs do not
   cross shadow boundaries, so `aria-labelledby` inside a shadow root can never
   resolve to a light-DOM id.
5. **Guard generated ids** with `if (!this.id)`. The server writes the id into
   the HTML; the client sees it present and skips generation, so both agree.
6. **A parent finds its children; they do not announce themselves.** There is no
   ready event, and reaching for one is the wrong instinct: a parent cannot poll
   for a child that has not upgraded, and what it needs from that child decides
   which of four mechanisms it takes. For what a consumer slotted,
   `assignedElements` on the slot, re-read on `slotchange`. For children that
   arrive, move or change outside a slot, a `MutationObserver` on the light DOM.
   For a child's *property*, `customElements.whenDefined`, which is the case
   Toolbar states best: a custom element has no properties at all before it
   upgrades, so a pass that ran first would find no `focusable`, take the
   `tabindex` fallback, and write the very attribute the property exists to
   avoid. And where the child is the one that knows, it reaches up by identity
   with `closestInstance` rather than announcing, which is what `Accordion.Item`
   and the video playlist's menu do.
7. **Every component needs a `*.ssr.spec.ts`** asserting the server output. A
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

Use the helpers in `helix/testing/src/ssr.ts`: `withoutStyles`, `rendered`,
`styles`, `hasPart`, `partTag`, `hostTag`, `hostAttributes`, `servedParts`.
Attribute bindings render across multiple lines, so match with
`/<a\s+part="button"/`, never `'<a part="button"'`.

**Stripping the sheet is enough for a negative and not for a positive**, and the
difference is the host's own opening tag, which `withoutStyles` leaves behind
and which is the consumer's markup echoed back. `<helix-date-input
value="2026-08-18">` renders `August 18, 2026` into its field by design, and the
spec claiming the date was already in the field passed for six weeks on the
`value` two characters away in the host tag. It would have passed had the field
rendered nothing at all. The plainest of the six found beside it is a tree
asserting `toContain('helix')` against a document opening
`<helix-headless-tree`: it passed with the whole render replaced by one empty
element. Twenty-five more shared one shape, a part's server spec asking whether
it renders at all by searching the document for its own tag name, which is the
host's opening tag and is there whatever the shadow root holds.

So a positive `toContain` or `toMatch` comes through `rendered`, which takes the
host tag off too, or through `partTag` for one part, or `servedParts` for the
frame whole. An assertion that is honestly about what the consumer wrote says so
with `hostTag` or `hostAttributes`. A negative one may still read
`withoutStyles`: nothing a consumer writes on a host can satisfy a claim about a
part or about a rendered role, so the wider subject only makes it stronger.

`rendered` leaves the host's *children*, being neither the component's render
nor the host's own tag. So it does not rescue an assertion whose literal is a
slotted node: what a component owes a server for content it did not write is the
slot that projects it, read off a render with no children.

**`helix component`'s `ssr` holds all of it.**

### A component that resolves a document serves the frame

**Some components genuinely cannot be served whole.** A chart or a legend takes
`for` and resolves it through `getRootNode()`, and a server render has no
document to look an id up in, so the marks it would draw do not exist yet. That
is one answer. `Sparkline` is the other: `values` is an attribute, needs no
document, and its line is drawn on the server and never appears on hydration.
The two are settled in `helix/headless/src/sparkline/root/sparkline-root.ssr.spec.ts`
and `helix/headless/src/legend/root/legend-root.ssr.spec.ts` respectively, and
every chart here is the legend's case.

What the document-resolved case owes is **the frame**, and that is a different
served output from nothing at all:

- **The plot's box, empty.** It carries `CHART_PLOT`, so the stylesheet's own
  `block-size` applies and the space the drawing will fill is reserved before
  the drawing exists. An empty chart of the right height does not move the page
  when it fills in; a component that rendered nothing until it had numbers
  does, every time.
- **Nothing drawn.** No bands, bars, slices, lines or points. The table they
  are read from is ordinary markup and is served whole, so what is missing
  before hydration is the picture and nothing a reader needs.
- **A host carrying only what the consumer wrote**, which is the general rule
  above and not this one.

**The words around the drawing are not promised, and cannot be.** A reading's
name and an axis' ticks are read off the table, so a server has no way to write
them and the rows that hold them collapse until it can. The box is the part
worth reserving and the part a stylesheet can reserve without knowing anything.

**Assert the frame whole**, with `servedParts`, rather than naming the marks
that should be absent. A spec that checks for the three marks it thought of goes
on passing when a fourth is added to the empty render, which is the failure this
promise exists to prevent.

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
  `data-labelled`, and every one of the thirty listeners in the library already <!-- dialect:quoted -->
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
color, and both came out 0x0, because the only rule sizing an icon was
`IconButton`'s `::slotted()` one. A correctly sized, correctly colored button
containing nothing.

This is the same class of failure as `:host(:has())` above and as a `[part=]`
selector for a part nothing renders: valid CSS, matches nothing, no error and no
warning. The fix is a rule in the component's own sheet using the same token the
slotted path resolves to, so an icon a consumer passes and one the component
draws come out identical.

**Reflect only what CSS selects on.** Reflection exists so a selector can reach a
value. `href`, `target`, and `rel` reflected on Button until they were told not
to, which wrote a destination onto a host that is not a link and put a bare
`target rel` pair into every button ever rendered. The visual axes reflect, and so do
`variant` and `disabled`; the rest do not.

**Read it the other way as well, which nothing did for months.** The sentence is
a biconditional and only one side of it was ever enforced: a property a
stylesheet *does* select on and that does *not* reflect is the same fault, and it
is the quieter one. The rule matches for whoever wrote the attribute in markup,
which is every example, and silently does nothing for anybody who sets the
property, which is every script and every React consumer by default. Four had
drifted: `avatar-group.max` folded nothing, `breadcrumb.href` lost 8px from every
crumb, `code-block.noCopy` dropped the button and kept the 40px it stood in, and
`breadcrumb.href`'s own docblock gave the reason as "nothing selects on it" while
`breadcrumb.css` selected on it.

`helix component`'s `reachable` holds it now, and the three checks on this one rule
are worth naming together because each sees a different half: `reachable` asks
whether a selected-on property reflects, `reflected` bans a default on one that
does, and `reflected-defaults` bans a default that writes an
attribute. All three are rules in `helix component`, which is why they are spelled
without a `check:` prefix. Three of the four above were found by `check:spec:visual-parity` rendering
a React twin, not by reading, which is the argument for all of them.

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

**And reflecting a payload leaks state into markup, which is its own fault.**
With `reflect: true` on the value mixin, measured:

```
AT REST:       <helix-input label="L" default-value="Ada" type="text" value="Ada">
AFTER TYPING:  <helix-input label="L" default-value="Ada" type="text" value="Grace">
PASTED:        started "Grace", typed "Hopper", still holds "Grace"
```

Serialize the host, re-parse it, and the new element opens holding whatever the
last reader typed rather than what the author wrote, and the author's seed is
gone with no way to tell the two apart. Lit SSR does emit reflected attributes
(verified with `disabled` set as a property), so this is not a client-only
concern.

The line that is drawn, and it is not "value is special":

- **Boolean states mirror to a custom state.** `:state(open)`,
  `:state(checked)`, `:state(invalid)`, `:state(has-label)` and `:state(read)`,
  set through `HelixElement.toggleState` and read by forty rules across
  twenty-four stylesheets. Never the property's own attribute, so nothing a
  component records can be re-read as a declaration.
- **Payload states do not.** `value` is a string, and so is `active`, which
  names which child is active. Option's `data-active` is a boolean its listbox
  writes, so it is the first rule rather than an exception to the second.

**A mirror must never be an attribute.** An attribute is in the DOM: an element
writes it on the first update, so `<helix-checkbox default-checked>` served by a
consumer's server grows `data-checked` the moment the definition lands, and
React reports a hydration mismatch it will not patch up. Measured on the landing
page's showcase, which listed a switch, a checkbox and an accordion item at once.

A different name, so a paste cannot be re-read as a declaration, is half of it.
The other half is that nothing a component knows about itself belongs anywhere a
framework reconciles.

**Which side the write falls on is what decides between the two answers.** A
fact that can be true on the first update mirrors to a custom state, because
that is the window hydration is in. A fact that becomes true only after somebody
acts may stay a `data-` attribute, the write being long past hydration:
`data-closed` on `Toast.Item`, `data-playing` on `Video`, `data-scrolled` on
`AppHeader`. Where the resting state is the loud one, inverting the name moves
the write to the safe side and is the cheaper fix; where the state is true
because a consumer asked for it, as `checked` and `open` are, inversion cannot
help and the fact has to leave the DOM.

`hydration.dom.spec.ts` is what holds it, and it mounts twice: bare, and again
with the `default-*` and `label` attributes a consumer would have typed. The
second mount is the one that catches this class, and adding it found a sixth
instance nobody had reported, `Notifications.Item` reflecting `read`.

If a payload ever needs a CSS hook, mirror the boolean fact (`data-filled`), not
the payload: a floating label cares whether there is text, not what it says. And
`helix-input` takes `type="password"`, which a `data-value` would carry straight
past every session-replay masker that knows to mask `.value` and `input[value]`.

**`value="Ada"` is the seed it looks like, exactly as native.** Control is an
action, not a mode: the element always owns its state and always applies it, a
cancelable `helix-before-*` lets a consumer take one decision, and a consumer
who wants full ownership refuses and assigns their own. That is how the platform
says the same thing on a form submit, a link click and `beforeinput`.

**Do not reintroduce a controlled mode.** `requestChange` is not a value-control
mechanism: `MixinControllerValue`, `MixinControllerChecked`,
`MixinControllerOpen` and `MixinControllerActive` all run on it, so a mode would
fork the event vocabulary across ninety-two families by prop presence. Which
event a consumer binds would depend on whether they passed a property, and an
HTML consumer would have no spelling for the controlled half at all, a prefixed
event having no inline handler attribute.

**Shared test scaffolding lives in `@fusion.dev/helix-testing`**, one module per
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

## Visual axes are a registry, and `appearance` is refused

**Fixed vocabularies, and a component takes a subset of one.** They are
declared in `helix/cli/src/component/axes.rs`, which is the registry:

| Axis | Values |
|---|---|
| `emphasis` | `ghost` `muted` `outlined` `solid` `subtle` |
| `material` | `frosted` `glass` `transparent` |
| `nesting` | `heading` `peer` `subordinate` |
| `orientation` | `auto` `horizontal` `vertical` |
| `separation` | `elevated` `filled` `outlined` `plain` |
| `shape` | `arc` `circle` `diamond` `dots` `pill` `pin` `ring` `rounded` `square` `text` |
| `size` | `sm` `md` `lg` `full` |
| `tone` | `accent` `danger` `info` `neutral` `primary` `success` `warning` |
| `width` | `auto` `full` |

**Weight is emphasis and meaning is tone**, and `Text` was the last to mix them:
`muted` and `subtle` were tones there, which made a quiet danger unsayable. On
text, `emphasis` picks the quiet ink, and a tone with an emphasis is that tone's
own quiet ink, the one step the readable range holds.

`variant` is the escape hatch and takes no registry, being component-specific by
definition: `segmented` against `underlined`, `list` against `wheels`, `grip`
against `line`. It lives on either tier, because a choice between two widgets is
structural wherever it is made. What it may not be is a place to put something
that *is* on an axis.

**A styled axis never appears on the headless tier**, which has nothing to paint
and no box to size. The exceptions are each principled: `tone` says what a thing
means, and meaning survives having no stylesheet; `shape` says what gets
rendered, a meter at `ring` emitting an arc rather than a bar, so the markup
differs before any rule is written; and `nesting` says what depth is, a row one
step in being the same kind of thing as the row above it (`peer`, a file
explorer), a subordinate kind (`subordinate`, a categorization or a facet
list), or a row whose parent is the name of the list holding it (`heading`, a
documentation sidebar, where the branch changes and the rows under it do not),
which is as true of a tree nobody has styled.

**`appearance` is not a property and must not be reintroduced.** `helix component`'s `axes`
fails outright on the word, and `visual-axes.mdx` is the page that explains why
it went.

**Where a check owns a vocabulary, quote the check and name it**, so the next
reader can go and see. A rule and its enforcement living in different files with
nothing holding them together is how a rule outlives its decision.

The test is *can two of these values be true at once?* If yes they are two axes,
whatever the count of combinations looks like. That is what split Button's old
`primary`/`secondary`/`tertiary`/`danger` into a rank and a meaning, and it is
what `megamenu-root.css` derived from the inside before there was a registry to
put the answer in: a panel can be glass *and* outlined.

**The resting state is the absence of every axis**, per the reflected-property
rule above: `outlined` on Button, `ghost` on IconButton, `neutral` everywhere.
Written out, those values select nothing and land on the base rule.

**Every emphasis names its own hover.** A generic
`:host(:not(:disabled)) [part="button"]:hover` is four class-equivalents and an
emphasis rule is three, so an emphasis without a hover of its own loses its fill
the moment a pointer touches it. Measured on the old `danger`, which had no hover
rule and turned neutral gray under the pointer in every build since it was
written. `button-root.css` carries the count beside the rules it explains.

## Size and density

**A control has no size. It takes its height from the region it is in.**

```html
<helix-flex data-density="lg">
  <helix-button emphasis="solid" tone="primary">See what is shipping</helix-button>
</helix-flex>
```

The reasoning, because the conclusion looks like a restriction and is not. Size
gets asked to do three jobs at once, and only one of them belongs to the
control:

- **Emphasis.** `emphasis` carries it, which is what the axis is named for. A
  filled button says "this one matters" far louder than eight more pixels.
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
- **`size` is the axis for pictures and regions**, never for controls, and the
  registry holds it so nobody has to remember who is in it. The test is the one
  above, whether two of these sitting together could legitimately differ in
  height, and a picture is not a control: an avatar at 24 in a list and 96 on a
  profile is a different graphic. Dialog argues the other half at its own
  property and the argument is the same test read from the other end: two
  dialogs never sit together, one being on screen at a time in the top layer, so
  it is the region rather than a control in one. A family taking `size` owes an
  argument of that shape, and anything that cannot make one takes its height
  from `data-density`. **The list of who carries it is not written down
  anywhere**, because the three sentences that once enumerated it were wrong
  about two families each and one of them shipped.

It works through custom properties (`--helix-size-control`,
`--helix-size-checkbox`, `--helix-size-tag`), which is why it costs no component
any API and crosses every shadow boundary on its own. The `-sm` / `-md` / `-lg`
tokens are the scale and never move; the unsuffixed ones are the current step.

**`-tight` and `-loose` are a step either side of the current one, and they are
derived at the root.** A custom property is substituted where it is declared, so
a scope that moves a base step has to move the steps derived from it in the same
block, as `[data-density]` does. Leave them out and everything under the scope
reads the root's `-tight` rather than its own. `helix component --only
derived-steps` holds every such scope to the layer's formulas. A reader that
means a fixed size writes the fixed step: the pair agreed with `-sm` and `-lg`
only where the root's step was the current one.

`data-link-size` stays. A text link has no control height: its size is
typography, and it follows the text around it.

**A `[part=]` selector for a part nothing renders fails silently.** It is valid
CSS that matches nothing, so there is no error, no warning, and no clue beyond
the feature quietly not happening. `helix component --only selectors` catches it, and it
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

`helix component --only tokens` enforces three rules: no raw values where a token exists,
no primitive access from outside `helix/styles`, and **no references to tokens
that do not exist**. The third earns its keep: a renamed token resolves to
nothing and the property silently falls back to a browser default, so the code
looks correct and the component is quietly unstyled.

Per-component hooks (`--card-padding`) are not Helix tokens and are exempt. They
should default to a semantic token.

**Every panel that floats over the page takes `--helix-radii-sm`, and
`helix component`'s `corners` holds it.** A radius is read against the corner
beside it rather than against the area behind it, so a menu at 4px next to a
dropdown at 8px reads as two design languages and a reader has no way to know
the second is a larger panel rather than a different kind of thing. Neither a
panel's size nor what it holds is a reason to round differently. `radii-none`
passes, being the vocabulary used to say "square" out loud; a different rung or
a raw length does not.

**A floating panel names itself**, so the rule keeps no list: it is any part
whose stylesheet reaches for `--helix-shadow-floating`, which is already the
separation policy for a surface over content, so the set is whatever reaches
for it and `helix component audit` prints how many that is.

**The check is keyed on the part rather than on the rule**, because a panel
routinely sets its corner in one rule and its lift in another: Drawer rounds
`[part="panel"]` and lifts `:host(:state(open)) [part="panel"]`, so a rule-local
reading checks neither half.

**Three had drifted when this was written, and the third is why prose was not
enough.** Select's panel took `md` from the commit that created the file,
against its own trigger's `sm`. Megamenu took `md` with a size argument
available and never written down. Tour's bubble took `md` under a comment
reading "which is `Popover`'s panel by another name and is deliberately the same
shape", and Popover is `sm`. The convention was recorded, in the right file,
directly above the declaration that broke it, and it held for exactly as long as
nobody had to act on it.

**`helix/styles` authors in `src` and ships `dist`, and the comment is the
difference.** The package exported `./src/*.css` until August 24, 2026, so every
consumer downloaded the reasoning: `tokens.css` is 71 percent comment,
`primitives.css` 82, `base.css` 75, and the set was 60,944 bytes gzipped against
8,219 of declarations. `turbo run styles-dist` strips comments into `dist` and
`exports` points there, so a consumer writing `@fusion.dev/helix-styles/tokens.css` is
unaffected and gets a quarter of the bytes.

**Comments only.** Squeezing whitespace on top saves a further 4,395 raw and 354
gzipped, four percent of what is left, which does not pay for a minifier or for
a transform that could change a value. `postcss` is in the tree because Next
brought it and is not ours to depend on.

**The eleven scripts that read these files keep reading `src`**, because what
they check is what somebody wrote. Only `exports` moved. `build-metrics.mjs` is
the exception and measures `dist`, that page's own rule being that what is
measured is what npm ships.

**The stripper is a scanner and its check is a second implementation.** A regex
is safe against today's content rather than by construction, since a comment
marker inside a string is legal CSS. The build extracts every declaration from
both sides and compares, and the first version of that check ran the scanner
over both sides, so it compared the output to itself: breaking the scanner on
purpose left the build green while it dropped 293 bytes of real CSS. A check
that shares an implementation with the thing it checks agrees with itself.
Reaching the two sides by two methods is what gives it teeth.

**A hook is named after the family that owns it, and owned by one family.**
`helix component`'s `hooks` holds both. A consumer predicts `--card-padding` from
`<helix-card>` and predicts nothing from a name that does not follow, and a
custom property naming no declaration is inert with no error: the same silence
as a `::part()` that resolves to nothing. Six were unguessable.
`<helix-pin-input>` published `--pin-gap`; the sandbox published
`--status-bar-color` and `--terminal-size`, which name no component at all; and
`<helix-breadcrumb>` published `--breadcrumb-hover-color` beside its own
`--breadcrumbs-separator-color`, so one component shipped both spellings and
neither reading was wrong from inside it.

**The family, not the element**, which took a measurement to settle. The obvious
rule is the tag and it is wrong in both tiers at once: the headless elements are
`helix-headless-slider` and publish `--slider-*` because the hook is shared with
the styled tier, and `<helix-tree-item>` publishes `--tree-*` because the hook is
Tree's rather than the row's. Fifty-odd correct names fail a tag rule and none of
them should change.

**And a public name cannot be shared**, which is the rule `--_color` was split
for, applied one level up. Two elements of one family documenting one hook is
inheritance and is fine. Two *families* is a collision: `--toolbar-gap` was
declared by `<helix-toolbar>` defaulting to `space-2xs` and by
`<helix-sandbox-toolbar>` defaulting to `space-sm`, so one declaration on a
container holding both set two different things and neither component could be
blamed. A vocabulary genuinely shared across families is registered in `SHARED`
instead, which `--chart-*` is: `chart/series.css` is imported by four families
and `MixinChartSource` writes `--chart-series-N` for all of them.

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

`helix component --only overruled` enforces it, per declaration. It was written against
the two failures above and fails on both when they are put back.

**Apps use components, not native elements.** The base layer styles `h1` to
`h6` and `:where(a)` only under `[data-prose]`, for the reason in the section
above: prose the design system never renders (markdown, a CMS) still has to look
right, and says so on its container. But an app written
against Helix reaches for `Text`, `Flex` and `Grid` rather than raw tags, so
dropping a component in works without the app knowing which token to apply.

**There is no `Heading` and no `Link`.** `Text` absorbed the first: `as="h2"`
picks the element while `variant` picks the ramp, which is the separation the
paragraph below describes under the other name. A link is the `[data-link]`
recipe in the base layer, which exists precisely because the *outer* tree styles
a slotted anchor and a component cannot.

**Behavior is what earns an element, not what decides an app should write one.**
`Flex` has no behavior and still removes every hand-rolled layout div.

`Text` keeps `as` and `variant` separate, which is the risk that killed the
first version of it. They default to matching, so a heading is correct by
writing `as="h2"` and nothing else, and `variant` is only ever a deliberate
exception: a section's second heading that has to look smaller without lying
about the outline, or a `<p>` that has to read as a caption. The pairing is
resolved in CSS rather than by computing an attribute, so the element writes
nothing onto its own host that a server's markup did not have.

Layout components are presentation with no structure or a11y of their own, so
they ship in `helix/styled` with **no headless tier**. The tier split exists to
keep behavior separate from styling, and there is no behavior to separate.

Styles are authored in sibling `.css` files. `turbo run styles` compiles each into
a generated `.css.ts` calling `createSheet`. Generated files are gitignored;
never edit one.

## Parts

**A component that renders another has to publish what it rendered.**
`::part()` reaches one shadow boundary and stops, so a composition hides its
child's entire part surface unless it forwards it. Measured before
`helix component`'s `exportparts` existed: thirty-seven sites across nineteen families
composed another element, eight forwarded anything at all, and 148 published
child parts were unreachable. `color-input` hid all sixteen of `color-picker`'s
and `date-input` all thirteen of `date-picker`'s, which are the components a
consumer reaches for first, so the composed half of the library was also the
least styleable half.

- **Forward everything the child publishes.** Withholding a part protects
  nothing, the child publishing it on its own element already; the only effect
  is that the composed component is less useful than its parts.
- **Prefix with the role**, which is the `part` the parent gave the child, or
  the name it chose for the child's contribution where it renders no part of its
  own. Bare forwarding collides and had: `command` forwarded the listbox's
  `search-field` under a name it also rendered itself, so
  `helix-command::part(search-field)` matched two elements.
- **A part already named for its role keeps the role alone.** A `dialog` inside
  the `dialog` role is `dialog`, not `dialog-dialog`. The two forwards that
  predate the rule were both written this way, which is the usual sign of the
  right one, and what keeps the collapse safe is that the parent may not then
  render the role itself.
- **A forwarded part still needs its `@csspart`**, and `helix component`'s `parts` is what
  asks: it counts an `exportparts` name as rendered, so a forward without a
  declaration fails there rather than in `helix component`'s `exportparts`. The two are one
  contract read from two ends.

**Every composed child forwards, however its tag is named.** The rule read only
`<${this.tag('x')}>`, so a tag bound first, `const pagination =
this.tag('pagination')` and then `<${pagination}>`, was no composition to it,
and that is the form `static-html` wants. Four families sat in the gap: Data
Table forwarded none of its pagination's eleven parts, Pagination Size three of
the select's eighteen and those unprefixed, and Filter Menu and a chat fed as
data gave their children no role at all. A name holding `this.tag()` is read now.
A tag handed to a shared helper as an argument is not: `drawTooltip` cannot know
which element it opens, and forwards by hand.

### A state drawn on a part is a part name too

**Nothing can follow `::part()` with an attribute.** A consumer reaches a
component through its parts, its host attributes and its host states, so a state
the styled tier draws as `[part="x"][data-current]` or `[aria-current]` on an
element inside the shadow root was the styled tier's alone. The headless
previews could not mark Carousel's current dot, Pagination's page, the
playlist's current entry, a chosen time or a chosen day, whatever they wrote.

**So the part takes a second name while the state holds**, and only then:
`part="page${current ? ' page-current' : ''}"`, forwarded under the parent's
prefix like any other part (`option-item-selected`). The attribute stays beside
it, because the name is for a stylesheet and the attribute for the
accessibility tree. The name goes on the box the state is drawn on, which is not
always the one carrying the attribute: Date Picker's selection is an attribute
on the cell and the mark is on the day, so the name is `day-selected`.

**Written as literals inside the interpolation**, because a part is read from
the source: every quoted word there is a name the element can carry, and nothing
else may be quoted in it, which is why Meter keys its bands through an object
literal rather than comparing strings. And a sheet or a lookup reaching for a
part that can carry one writes `[part~="x"]`: an exact match stops matching for
exactly as long as the state is the thing worth drawing.

**What stays an attribute is what no consumer draws from.** A gesture in flight
(dragging, dropping, a copy just made), a category rather than a state (a
series, an axis, a thumb), and what the platform already says after `::part()`
(`:disabled`, `:checked`, `:open`, `hidden`). A host attribute or a host state
needs nothing either, since `helix-select:state(open)::part(indicator)` already
reaches it, unless that host is itself inside another component's shadow root:
an option Time Picker draws is, so Option names its own row `item-selected`.

**The side a floating panel landed on was on that list, and an arrow took it
off.** `data-placement` on the panel is read by the panel's own entrance, which
is still all a menu or a select draws from it. A bubble with a point is drawn
from outside by side: every headless sheet pinned its tooltip's arrow to the
bottom edge, so a bubble that flipped below its trigger at the top of a page
pointed away from it, and a tooltip is usually two shadow roots deep, inside a
copy button or a chart, where no host state reaches. So the placing pass puts
the arrow on the edge facing the anchor itself, a tooltip names its bubble and
its arrow for the side, `tooltip-top` and `arrow-top` while it is above its
trigger, and records `:state(placed-top)` on its host, as Tour Stop does. The
names are the hosts' literals rather than the controller's: a controller adding
a part at runtime is one `parts` and `exportparts` cannot read, and a menu or a
select taking four more names would oblige every composition of one to forward
them, for a fact nobody outside draws from.

**Or the parent names it, where the child's state is a host attribute.** A turn
Chat draws from `turns` is a message in Chat's shadow root, so a document cannot
ask it for `[author="me"]`, and the message's own sheet is the only thing that
could. Chat forwards each part that changes a second time while the turn holds
the state, `body: message-body-mine` beside `body: message-body`, read from a
table of literal `inner: outer` lists so `helix component`'s `exportparts` can
hold every name to its prefix: a second name is the first and one word more,
never instead of it, and two parts under one name is refused.

### A custom state is documented

**`@cssstate` on the element that records it.** A custom state is in no
attribute, no property and no DOM a reader can inspect, so the manifest is the
only place a consumer learns one exists. Sixty-two were recorded and none was
written down: `Select` turned its caret on `:state(open)`, and the author of its
headless example read the docs and concluded it had no open state. The analyzer
reads the tag into `cssStates` and carries it to subclasses, so `settled` is
listed once, on `HelixElement`. A mixin's are listed on each element applying
it, for the reason its parts are. `helix component`'s `states` holds what is
recorded and what is listed together, and refuses a name computed at the call.

**A `::part()` written from outside is checked too, and nothing checked it
before.** `helix component`'s `selectors` reads `[part="x"]` inside a component's own sheet and
stops there, so a selector naming a part nothing publishes was unchecked in every
example sheet, doc page and app file in the repository. `helix component`'s `exportparts`
covers it, and it had eight. `INDICATOR` in `build-headless-examples.mjs` names
the box its indicator is positioned against, and three of its four families were
given a part they do not render, so the `position: relative` never landed and
every indicator in those examples measured against the wrong containing block:
measured after the fix, the toggle group's indicator now reports `track` as its
`offsetParent` and reported something else before. `splitter` was given `divider`
twice in a file whose own comment says splitter has a `separator` and no
`divider`, and `overriding-a-component.mdx`, the page that teaches parts, styled
`helix-dialog::part(panel)` on an element publishing `dialog`.

**A `[part=]` written in TypeScript is checked like one written in CSS**, and
only `selectors` reads stylesheets, so a rename verified against CSS alone
is verified against half the callers. A stale `querySelector('[part="x"]')`
returns `null`, so what breaks is behavior rather than appearance and an optional
chain swallows it. Ninety-seven lookups exist. Only a lookup on the component's
*own* root counts: `Command` walks into the listbox's `renderRoot` for
`search-field`, which is the listbox's part and is checked where the listbox is.
`helix/core` is out of it, a controller reading `[part="plot"]` out of whatever
host applies it and owning no parts of its own.

**And a `[part="x"]` inside a selector string is not a render.** Harvesting
`part="x"` without excluding the bracket let a lookup satisfy itself, so the very
selector under test counted as evidence the part exists. Live across 53 files and
five checks, including `helix component`'s `parts`, whose whole purpose it defeats. It was
holding one real failure green: `command` documented `search-field` after that
name stopped being forwarded, and a `querySelector('[part="search-field"]')` two
hundred lines away was the only thing making it look rendered. Same shape as this
file's older note about a JSDoc that quotes markup, and worth assuming of any new
check that reads a template.

**`helix component`'s `parts` resolves the whole render chain in both directions**, and read
the class's own markup in one of them until August 24, 2026. One direction inherited
and the other did not, which leaves exactly one gap and it is the expensive one:
a part rendered by a *base* that nobody in the chain documents is invisible to
both halves, the subclass never rendering it and the base documenting nothing to
be checked against. Sixty parts sat there. `MixinField` writes `label`, `hint`
and `feedback` on eighteen form controls and eight documented them; `MixinCollection`
writes `empty` and `loading` on five families, all five style both, and nine of
the ten pairs were published to nobody.

**A mixin's parts are documented on each component, and declaring them once on
the mixin does not work.** The analyzer reads `@csspart` off a custom element
class, so a class-level tag on a mixin reaches the manifest as nothing at all,
on the mixin's JSDoc and on its inner class alike. Measured both ways, and the
inner-class version is the dangerous one: `helix component`'s `parts` resolves docs through
`extends` itself, so it goes green while every API page stays exactly as wrong
as before. Members are the opposite and do inherit, which is what the note above
about the inner class is about, and the two cases look identical from the source.

**Publishing a part obliges every component that composes it.** These two checks
are one contract, so documenting the mixin parts made `helix component`'s `exportparts` fail on
fourteen compositions that had been forwarding a complete surface the day before.
That is the contract working rather than a regression, and it is the reason the
forwarding is generated rather than typed.

**Words that name a position draw from a registry; words that name a thing do
not.** `helix component`'s `vocabulary` holds the first set to one spelling each: `box`,
`container`, `content`, `panel`, `surface`, `viewport`. A `thumb`, a `terminus`,
a `swatch` is that component's own word and no registry should have an opinion
about it.

This is `helix component`'s `axes` one stage later. That check exists because `appearance` had
become one word for four questions; this one exists because the reverse happened
to parts, nine words meaning "the box in the middle" across 204 names. `drawer`
used both `panel` and `content`; `accordion` used both `content` and
`container`.

**Slot names draw from a registry of their own, on the same terms.** A slot is
where a consumer's content lands, and the words for a position drift there the
way part names did. `helix component`'s `vocabulary` holds these to one spelling
each: `actions`, `description`, `end`, `feedback`, `footer`, `header`, `heading`,
`hint`, `icon`, `label`, `start`, `toolbar`. A `poster`, a `composer` or a
`swatch` is the component's own. The quieter line under a label is
`description`, which List Item called `supporting` and Notification `caption`;
the Notifications group's `action` is `actions`, and Tag's `prefix` is `start`.
Each old spelling is refused, naming its replacement.

**`heading` and `header` are two things.** A `header` is a region, holding a
heading and whatever sits beside it: Card, Chat, Dialog, Drawer and
Notifications publish one, and Dialog's describes itself as "the title, and
anything beside it". A `heading` is the heading alone, which is all Callout and
Empty have. A component with a heading and nothing beside it takes `heading`,
and one that grows an action there grows a `header` instead. Callout published
`title` for the same thing Empty called `heading` until September 22, 2026; `title` is
refused now, being also the attribute every element has, whose tooltip a reader
of `slot="title"` could fairly expect.

**Two renames were the component telling on itself**, which is the kind worth
trusting. `Menu` published its floating panel as `menu` and described it in its
own JSDoc as "the floating panel the menu is drawn on", which is the sentence
five other families spell `surface`. `Megamenu` published `panel` while the
accessor reading it, one file over, is called `surface`. The third, `wrapper` to
`container`, was simply the library's only one.

**And one word looked like a synonym and was not.** `Steps` renders `body` and
`content` both, and they are different boxes: `content` is what the stage holds
while it is open, `body` is the step's name and its description together.
Renaming it would have merged two things. It sits in `UNRESOLVED` naming what it
turns out to be, the way `axes` names work rather than blocking on it.


## The manifest

`helix manifest build` writes it, in Rust, and `@fusion.dev/helix-cem` writes
the framework typings from it; `helix component`'s `conventions` rule holds what
it publishes to the contract below. A
package's `analyze` is `bun --bun helix-cem`, which reads its `cem.config.ts`
for the tier and whether to publish typings, and finds everything else.

- **The generator replaced `@custom-elements-manifest/analyzer` byte for
  byte**, across all four tiers and all nine typings files, so what the
  analyzer did is still the rule for what the manifest says. Where the two
  would differ, the analyzer's output is what `helix/cli/src/manifest/` was
  held to, and each rule beside the code says which measurement settled it.
- **A package's dependencies are found, not listed.** Every helix package
  reachable through `dependencies` that ships a manifest is one it is built
  against, which is what lets inheritance resolve across packages. Every package
  shipping extendable classes needs its own manifest, including `helix/core`,
  which ships mixins rather than components.
- **A named union is written out, so an attribute's values are in the
  manifest.** `format?: ColorFormat` published the word `ColorFormat` and no
  values, in seventeen attributes across ten names, and the reference page
  printed the name. The generator substitutes any alias these sources declare as
  a union of literals, found through the import that brought the name in: the
  same file, a file beside it, or the package named by the specifier, reached
  through `node_modules` the way the runtime reaches it. The name stays where it
  is not a union of quoted words, which is the platform's `ScrollBehavior` and
  the shapes whose name is the honest answer, and `helix component`'s `resolved`
  rule refuses exactly what is left. **Writing out half a union is worse than
  the name**, because a shorter list reads as the whole of it, so a union with a
  name in it is not substituted at all.
- **Document mixin members on the mixin's inner class**, not only on the
  exported `declare class`. The interface is what TypeScript reads; the inner
  class is what the manifest reads.
- **The manifest records paths, never URLs.** A family's source directory is
  derived from its module path, the way its group and part are derived from the
  same string, so it cannot disagree with where the file is and it survives a
  move. It is the repository's path whichever directory the build ran from.
  What it stores is
  `helix/styled/src/accordion`; the site composes
  `{repository}/tree/{ref}/{path}`.

  **The split is about versioning and is worth keeping even before it matters.**
  Documentation will be versioned and a reader will choose the version, so the
  ref belongs to whoever renders the link. A URL baked into the manifest makes
  every archived page point at today's source, which is the one thing a
  versioned reference must not do. What is durable is where a directory sits in
  the repository; what is not is which commit anyone wants to read.
  `fusion/site/utils/source/source.ts` is the only file a version selector has to touch.

- **The manifest's types are this repository's own**, structural and loose, in
  `helix/cem/src/types.ts`. They were written that way because the analyzer
  bundled its own copy of `custom-elements-manifest/schema`, and two copies
  produce types `exactOptionalPropertyTypes` will not unify; with the analyzer
  gone the reason is weaker and the types are no worse for it.

## JSDoc contract

Every component's class JSDoc carries `@summary`, `@description`, `@since`,
`@status`, `@category`, `@documentation`, plus `@aliases` where a component is
known by other names. `helix component`'s `conventions` rule **fails
`check:cli`**, and so `verify` and CI, without `@since`, `@status`,
`@documentation`, or a description, which `@summary` alone satisfies. It was
`helix-convention-lint`, which failed `analyze` instead; it is a rule over a
finished manifest, and it runs where the other rules do.

**`@description` is published prose.** It renders on the family's reference
page, so it is read by consumers rather than by contributors, and it takes the
comment rule in [AGENTS.md](../AGENTS.md) the same way a comment does: the
contested thing, not the settled one. A description restating `@summary` costs a
reader the same sentence twice.

**`@category` is asked of a family root and not of its parts**, which is the one
exception and is a rule about the question rather than about the tag. It answers
what a component is for, and `Tabs.Tab` has no answer to that separate from
`Tabs`: giving it one puts a part in the gallery beside its own root.

**The tag is `@aliases`.** `@alias` is not read by the metadata plugin, and
`@category` is required: omitting it fails the build.

Only `@summary` is native CEM; the rest reach the manifest through
`helix-metadata`. A `@status experimental` that lives only in a comment cannot
badge a docs page or warn a consumer.

**The tags come in one order, and the lists inside them sort by name.**

```
@summary  @description  @since  @status  @category  @groups  @aliases
@documentation  @slot  @event  @csspart  @cssproperty  @cssstate
```

One blank line between groups and none between the metadata tags, which is what
makes those six read as a block rather than six statements. `@slot`, `@event`,
`@csspart`, `@cssproperty` and `@cssstate` sort by name within their own group,
and the default slot, written with no name at all, sorts first: it is the slot a
component has before it has any other.

Most of that is the corpus stating a rule rather than a decision taken. Measured
across all 246 blocks on August 27, 2026, the metadata prefix was unanimous, `@slot`
preceded `@csspart` 115 times against 3, and `@cssproperty` came last 17 against
2. **`@event` against `@csspart` split 38 to 36, and was decided rather than
derived**: slots and events are what a consumer writes markup against, parts and
custom properties are what they write CSS against, and the two pairs are worth
not interleaving.

**Sorting is not tidiness, because the reference page is generated from this
order.** `turbo run reference` writes the tags out as it finds them, so an
unsorted block is a published API table with a part missing from where a reader
looks. `Video` declares 48 parts and had its `captions-menu-*` family in three
separate runs with the whole `overflow-*` set between them. No line of it was
wrong, and no reader who did not already know the answer could have found one.

`bun run fix:tag-order` rewrites, `fusion prose`'s `tag-order` judges, and `verify` runs it.
Only blocks carrying `@summary` are touched: a member's JSDoc uses `@internal`,
`@param` and `@reference`, whose order is the order of the thing they describe.

Events are declared, never inferred, and **names are `helix-{verb}`, lowercase
and prefixed**:

```ts
@event {HelixBeforeOpenEvent} helix-before-open - Fired before it opens, and cancelable.
```

*`helix component`'s `conventions` rule holds every declared event to
`/^helix-[a-z][a-z0-9-]*$/`, or to a native name being relayed, which is what
every shipped event answers to.*

**The prefix is what stops a collision with a native name.** An event dispatched
inside a shadow root is retargeted to look like it came from the host, so a bare
`input` from a `<helix-input>` is indistinguishable from the inner control's
own. Prefixed, it can be mistaken for neither. PascalCase was proposed as a
cheaper version of the same protection, on the grounds that every native name is
lowercase; it is not wrong, and it was given up for the reason below.

**A name may carry any number of hyphens.** Measured in Chrome against React
19.2.8: `ona-b-c-d` binds exactly as `onhelix-before-open` does, `react-dom`
slicing `on` off the prop and handing the remainder to `addEventListener`
without inspecting it.

**Do not read a binding failure as a fact about the name.** On a
server-rendered page React attaches no custom element listener at all, whatever
it is called, until it commits an update for some other reason, so which names
appear to bind depends on what else is on the page. A rule drawn through that
noise survives exactly as long as nobody re-runs the probe.

**A verb React has claimed is reachable anyway, because of the prefix.** Its
synthetic system owns `change`, `input`, `submit`, `copy`, `focus` and the rest,
and a prop matching one of those is wired to the native event. Nothing strips
our prefix, so `onhelix-before-change` matches none of them and arrives. A
notification is not prefixed for the same reason inverted: `onChange` is meant to
reach React's synthetic system, because the element sends the native `change`.

**The same probe is what ended the PascalCase scheme.** Its argument was that
React strips `on` from a prop and listens for the remainder verbatim, so
`OpenChange` would be `onOpenChange`. It does listen for the remainder
verbatim, and that is the problem: `onOpenChange` binds an event called
`OpenChange`, which nothing dispatches. The prop is not dropped, and it is not
assigned to the property of that name either, because React takes its `on`
branch before reaching the one that would assign it. The DOM event is the
universal channel, and it needs a name a plain listener can use.

The type in braces is what lets the React generator emit
`(event: HelixBeforeOpenEvent) => void` instead of `(detail: unknown)`. Each event is a
class in `helix/core/src/events/events.ts` that carries its own name and augments
`HTMLElementEventMap`. There is no generic `emit(name, detail)` helper: a
dispatch through one cannot be named by the analyzer.

**Every state change is announced twice, and the two are for different
people.**

The request is `helix-before-change`, or `helix-before-toggle` where the state
is a boolean, or `helix-before-open` and `helix-before-close` where it is an
overlay. Cancelable, carrying what is being proposed, fired before anything
moves. Refusing one is how a consumer takes the decision, which is the whole of
what "controlled" used to mean here.

The notification is the platform's own name and carries no detail, because by
then the state is on the element: `input` and `change` on a value control,
`toggle` with `newState` and `oldState` on anything that opens, `close` on a
dialog. `announcesInput` survives and means something narrower now, picking
which native event a control sends rather than what its request is called:
Input, Textarea, Number Input, Pin Input, Filter Input and Slider are
continuous, and the rest send `input` and `change` together the way a native
`<select>` does.

**The eleven families that sent a generic `helix-change` have verbs of their
own.** They are not form controls, so no native word applied, and one word was doing for them
what one word for four questions did for `appearance`. What they took: Chat
`helix-before-pin`, Outline, Steps, Tabs, Tour, Tree and Video Playlist
`helix-before-activate`, Splitter `helix-before-resize` and
`helix-before-collapse`, Sandbox `helix-before-split` and
`helix-before-panel-resize` for its two dividers and `helix-before-edit` for a
source pane. Pagination Size kept `helix-before-change`, being the one of the
eleven that really is a value control.

**`@controlled` is deleted, and so is everything that read it.** A declared
property is a seed and a correction, the
element always applies, and a consumer takes one decision by refusing the before
event. With no mode to be silently in there is nothing for a tag to declare,
nothing for the generated constraint to require, and nothing for a check to
hold. `helix-controlled`, `helix-controlled-props`, `check:controlled` and its
fixture were removed together. The longer version of the argument is under the
reflected-property rules above.

**What survives is the finding underneath it**, which was never about ownership:
which properties are stateful cannot be inferred from `inheritedFrom`. Eight are
implemented in the component and inherit from nothing: pagination's `page` and
its size `value`, toast's `open`, listbox's `filter`, splitter's `position` and
`collapsed`, carousel's `index`, date picker's `month`. Any future check that
tries to find stateful properties by walking the mixins will miss a third of
them and report success, which is what happened the first time.

Every `@property` gets a one-line description.

**A camelCase property needs an explicit `attribute`.** Lit lowercases a
property name to derive its attribute rather than dash-casing it, so
`removeLabel` is reachable only as `removelabel` unless it declares
`@property({ attribute: 'remove-label' })`. Nothing warns: the attribute a
consumer would guess simply does nothing.

## A refusable event has a reader

Everything above says what an event is called and what its description has to
admit. This says what has to be true behind the sentence, and it is one rule:
**a cancelable event is dispatched where the library reads the answer.**

**The good pattern is `requestChange` and it is already the library's**: build
the event carrying the state being *proposed*, dispatch it, and apply only if
nobody refused. The four controller mixins call it and so does any component
whose state is not one of theirs, which is what makes a refusal mean the same
thing in every family. A component that mutated itself and then announced it has
not published a decision seam, it has published a lie, and nothing about the type
says which of the two a consumer is holding.

**Refusing must stop something the library was about to do.** If nothing in the
library would have acted, there is nothing for `preventDefault()` to take, and
the honest event is a notification: not cancelable, dispatched after the state
has moved, carrying what happened. `helix-next` says this in its own class
comment, that an event whose `preventDefault` means nothing is an event that lies
about what it offers.

**"Already happened" is a reason to move the event, not to keep it and shrug.**
Two families argued that a reader had dragged something into place and a refusal
could not un-drag it. One of them is right, because the thing that moved is the
reader's own scroll of a native control and the component's state only follows;
that one announces, under a name that does not claim otherwise. The other was
Carousel, whose track is its own to scroll, so a refusal is honored by putting
the track back on the slide the index still holds. Ask which of the two it is
before writing the sentence.

**The decision is taken by whoever owns the default action, which is often one
file over.** A row announces that it was chosen and holds no state; the set it
sits in is what moves. So the row dispatches and the root listens and reads
`defaultPrevented` before it acts, and the root's own `requestActive` or
`requestValue` then offers the second refusal to a consumer listening on the
root. Two gates for one act is correct here and is not two answers to one
question: they are in different positions, the row's and the set's, and a
listener binds to the one it can reach.

**Where the reader binds decides how it reads the flag.** A root listening in
the bubble phase for an event from its own child is after every listener on that
child, so the flag is already set and reading it inline is right. A root
listening in capture runs *ahead* of a consumer's listener on the same host, and
reading the flag there reads it before anybody could set it: Menu and Speed Dial
both close the panel one microtask later for exactly this reason, and the
dispatch being synchronous is what makes a microtask late enough.

**A `before` event is the request and a plain one is the notification.**
`helix-before-*` carries the proposed state, fires before anything moves, and is
cancelable. What comes after is the platform's own word where there is one,
`input` and `change` on a value control, `toggle` on anything that opens, and it
carries no detail because by then the state is on the element. The full argument
is under [JSDoc contract](#jsdoc-contract).

**The rule is `helix component`'s `decided`.** It reads every dispatch of a class
whose constructor passes `cancelable: true`, and passes when the answer is used
at the dispatch, read off the event afterwards, or read by a file in the family
that dispatched it or in a family that composes that one.

### What a form-associated component owes

A component extending `HelixFormElement` has told the browser it takes part in a
form. Four things follow, and the ones a mixin does not do are the component's.

- **It reports.** `internals.setFormValue` on every change to what it holds, and
  on the value it was rendered with, or the form submits nothing under a name the
  consumer wrote and nothing anywhere says so. `null` and not `''` when it holds
  no answer: that is the difference between a control that submits nothing and
  one that submits a blank. **`MixinControllerValue` does not do this for you**,
  and says so: it owns the value and reporting stays with the component, because
  what goes in the entry list is not always the string (a file input submits
  `FormData`, a date picker submits what its calendar resolved).
- **It returns.** `formResetCallback` puts it back to what the markup declared,
  both halves, the consumer's and the control's. The value mixin has it; a
  component holding state of its own has to write it.
- **It restores.** `formStateRestoreCallback` for a browser bringing a form back,
  falling back to the declared value rather than to empty, a restore with no
  state being the same situation as a fresh form.
- **It renders what it took.** `MixinField` grafts `label`, `hint`, `feedback`
  and `required` onto a control and publishes all four on its reference page.
  Applying it and then calling none of `renderLabel`, `renderGroupLabel`,
  `renderHint` and `renderFeedback` leaves a required control computing a
  validation message with nowhere to put it, and four rows of documented API a
  consumer can set and never see. Take the mixin for what you render, and reach
  for `ElementInternals` directly for the rest.

  **Nobody is in debt here, measured September 17, 2026**: every family that applies
  the mixin renders at least one of its seams. Worth saying because this
  paragraph spent two edits naming families that were never in it. It read
  "three families are not there yet ... of the twenty-two that apply the mixin:
  Rating, Date Picker and Time Picker", then "two", and Rating was the only one
  of the three that had ever taken the mixin: the other two extend
  `MixinControllerValue(HelixFormElement)` and each carries eight lines saying
  why. A recount that moves one name out of a list is not a reading of the list.

  **A panel composed into a field does not take the mixin at all**, which is the
  other answer and not a lesser version of this one. Date Picker, Time Picker
  and Color Picker are each dropped into a field that already owns the label,
  the hint and the feedback, so applying it would give one control two of each.
  What they take instead is five lines: `required` written out, and
  `setValidity` with the anchor the browser points its bubble at. The rule above
  is about applying the mixin and then not rendering it, and a component that
  never applied it owes nothing under it.

  **Rating is the worked example of taking it.** It is the one control here
  whose control is genuinely inline, so the seams could not simply be stacked
  around it: what it does is keep the marks and the readout in a `field` row and
  make the host the column every other field already is, `inline-flex` so a
  rating still sits in a product card or a line of prose. The label is
  `renderGroupLabel` rather than `renderLabel`, a row of radio buttons having no
  single control for a `<label for>` to name, which is the same reading
  `Radio.Group` takes.

## Use the elements directly

**Write `<helix-card>` in JSX.** Plain custom elements, no wrapper, no patched
React, and no React package: there is not one.

**Bind Helix events with `onhelix-*`, and the element repairs the rest.**
**Do not reach for `addEventListener` instead.** The props alone do not survive
hydration: React records them, attaches no listener, and the handler never runs
until React commits an update for some other reason. Nothing is logged and the
element goes on doing its own job, which is why it passes every casual check.
What repairs it is the element itself, below.

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

The version this was measured against is not left to prose: `react-bridge` reads
the number out of this file and fails when the installed `react-dom` moves past
it, a probe being a claim about one release's internals.

**Object and function *properties* had the same bug and are fixed now.** React
skips everything it would have to apply imperatively while hydrating; strings,
numbers and booleans survive only because the server wrote them as attributes. An
object or a function survives by no route at all, and both halves of React agree
to drop it: the server renderer reaches `typeof value === 'object'` in its custom
element branch and writes nothing into the HTML, and the client's hydrate path
only diffs and warns. Two skips that match, so there is no mismatch to report and
no warning anywhere, which is the worst shape a framework failure takes.

`applyReactProperties` closes it, called from `firstUpdated` and again on the
following frame if React had not committed by then. It assigns any *declared*
reactive property whose value is an object or a function: only declared, or an
arbitrary JSX prop lands on the element; only object or function, because a
string already arrived as an attribute and re-applying it would reach into the
one channel that is not broken. `null` is skipped and is the single divergence
from a client mount, named at the call site. The server dropped it too, so the
class default is standing, and assigning it would reproduce only a crash.

**It was built when the first component needed one, which is exactly what the
note it replaces asked for.** `helix-data-table` declares `rows` and
`helix-table-column` declares `cell` and `compare`, so `rows={rows}` in JSX was a
correctly labeled, permanently empty grid. The other ten `attribute: false`
properties in the library are booleans and strings a parent writes at runtime,
and this never touches them.

**Binding at dispatch could not be repeated for a property**, which is why this
is a second mechanism rather than the first one widened. A listener only has to
exist by the time somebody interacts; a property has to be right before the first
paint. `connectedCallback` is the obvious early moment and is the wrong one,
measured: an element upgrades when its definition loads, which falls either side
of hydration depending on how the consumer imported it.

**A same-named attribute with a converter is the other half, and no repair in
`core` can reach it.** React prefers a property whenever the prop name matches
one, and it assigns the value *verbatim*, so Lit's converter never runs:
`value="42"` on a meter arrives as the string `"42"` and the bar draws 0%,
`split="35"` on a sandbox fails `Number.isFinite` and falls back to the default,
`modal="false"` on a drawer is the truthy string `"false"` and the scrim renders.
A hyphenated attribute is safe, `page-size` being no property name at all, so
this is exactly the single-word ones: **ninety attributes carry a converter and
share their name with their property.**

There is nothing to fix in the component. The value the consumer wrote is a
string and JSX is where it has to stop being one, so an example, a page or an
app writes `value={42}` and `modal={false}`. `check:spec:visual-parity` is what holds
it: it renders every example from its HTML and from its TSX and compares the two
pictures, which is the only way a converter that quietly did not run shows up.

**And a property a stylesheet selects on has to reflect, or setting it does
nothing at all.** That is the older rule below about reflection, met from this
direction: React writes the property and no attribute appears, so `:host([max])`,
`:host(:not([href]))` and `:host(:not([no-copy]))` match the wrong way round and
the component works while looking wrong. Four had drifted, three of them found by
rendering pictures rather than by reading. `helix component`'s `reachable` reads
every attribute selector on a host, or on an element a sheet slots, against
whether its property reflects, and it is the third check on that one rule:
`reflected` and `reflected-defaults` both ask about properties that already
reflect, and neither notices one that should and does not. A fifth had drifted
where it did not look: Data Table's `::slotted(helix-table-column[sortable])`
gave no pointer to a column React made sortable.

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
binds that one too.** React recognizes `onError` and `onLoad` as its own names
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
`onhelix-before-open` reaches `helix-before-open`; `onHelixOpen` binds an event called
`HelixOpen` that nobody dispatches, and never reaches the property of that name
either, because React takes the `on` branch before the one that would assign it.

That last part is why `onCheckedChange` and its siblings never worked from
JSX, and why they are gone. They were not dropped:
`addEventListener('CheckedChange', …)` was called, for an event nothing sends.

**There is one channel per fact, and it is the event.** The four callback
properties on the controller mixins were removed August 19, 2026. They duplicated
`helix-before-change`, were unreachable from the JSX every React consumer writes, and
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
import '@fusion.dev/helix/card'
export function HelixElements(): null {
  return null
}
```

Render it once in the layout. **Pages stay server components**, because an
unregistered tag is just an unknown element in the HTML that upgrades when the
definition lands. Consumers are on the App Router; asking them to mark every
page `'use client'` to use a button would not be a design system.

**`@fusion.dev/helix-styles/helix.css` carries it.** `elements.css` is generated
from the element sources by `fusion/scripts/build-elements-css.mjs` and hides
each tag with `:not(:defined)` until it upgrades, using `visibility` so the page
does not reflow. Without it a card arrives as a run of unstyled text and then
snaps into a card. CSS cannot select "any custom element", and a bare
`:not(:defined)` would also catch Next's own dev overlay, so the tags are
enumerated.

**`@fusion.dev/helix` re-exports no stylesheet, and this is settled rather than
pending.** Up to 0.0.9 it shipped its own `helix.css`, two `@import` lines
pulling `@fusion.dev/helix-styles/all.css` and a local `elements.css`. That
existed because the required order spanned two packages, three layers in
`helix/styles` and the elements layer in `helix/styled`, so no single import
could state it. Moving `elements.css` into `helix/styles` and renaming
`all.css` to `helix.css` left one import carrying all four, so the aggregator
has nothing to aggregate: re-adding it means a file whose body is one `@import`
of another package's, and a `css/` directory back in `helix/styled` to hold it.

So a consumer declares `@fusion.dev/helix-styles` alongside `@fusion.dev/helix`,
as both templates do. It is installed either way, `@fusion.dev/helix` depending
on it; the declaration is what makes the import name a dependency the consumer
took rather than reaching through a transitive one, which is the rule
[AGENTS.md](../AGENTS.md) states for every other package here.

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
- **`@lit-labs/nextjs` is unmaintained**, last published 0.2.4 in July 2025, so
  there is no fixed version to wait for. Its sibling `@lit-labs/ssr-react` is
  still moving; the Next.js integration, which this depended on, is not.

Marking pages `'use client'` did make it work, at 15.1 kB of route JavaScript.
That is not the trade: it surrenders RSC on every page using a component, to
keep an unmaintained patch to React.

**Verify in a browser, never by grepping the HTML.** A string check passes on
markup the browser then discards, which is exactly how the broken DSD survived
several commits. The assertion that means something is
`element.shadowRoot !== null` on a loaded page.

## Framework typings, and the names they carry

**There are no wrappers and there is no `helix/react`.** The typings are emitted
by cem plugins during `bun run analyze`: `jsx.d.ts` by `@wc-toolkit/jsx-types`
with `jsxReactRef` and `jsxImports` on top of it, and `vue.d.ts` and
`svelte.d.ts` beside them. Consumers write `<helix-card>` directly.

The naming, which was never about wrappers:

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
  highlighting is `@fusion.dev/helix-sandbox/highlight`, a Lezer parse and a tree walk
  with no editor mounted and no DOM required, so it runs during a build and a
  static page ships colored markup with no JavaScript spent on it. Those
  grammars are already in that package for the editor, so nothing new is
  installed; putting them in `helix/styled` would put CodeMirror in every
  consumer's `dependencies`, which is about 4 MB paid at install time whatever
  anyone imports. `CodeBlock` renders a `<slot>`, so highlighted markup drops
  straight in and the component stays free of it. A snippet on a reference page
  and the same snippet in the sandbox are then colored by one grammar rather
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

  A set of checkboxes and a set of radios are equally homogeneous and are not the
  same kind of thing, which is why "homogeneous" is not the test: that is a fact
  about the members rather than about the group.

  **That test decides the controls and says nothing about the rest**, which is
  six of the eight groups in this library, so there are two clauses before it.

  **A group that can only ever hold one family's members is a part of that
  family. A group that arranges several is nobody's part.** That is `Option`'s
  own argument for existing, a radio having one kind of owner where an option
  has many, asked of the group instead of the member. `Button Group` is the one
  that answers yes: every rule in its sheet is `::slotted(*)` and it works by
  writing `--button-radius-start` and `--button-radius-end` onto whatever is
  slotted, which is why `IconButton` documents its own radius as the one a group
  flattens through that pair. `Avatar.Group`, `Stat.Group`, `Option.Group` and
  `Notifications.Group` each hold one family's members and nothing else, so each
  is a part however much API it carries: `Notifications.Group` has a count and a
  collapsible state and is still a fact about a feed.

  A container holding mixed content is a family for the older reason as well:
  `Toolbar` holds buttons, dropdowns and inputs, and is about none of them.

  **What is not the test is how much there is to document.** A facepile is a
  named pattern with real API and other systems give it a page; it holds
  avatars, so it is a part, and Avatar's page is where somebody searching for
  one should land. Systems that page an arrangement helper page all of them,
  which is a fact about their index rather than about what a component is.
- **Two headless bodies that differ by a role string stay two bodies.**
  `Stat.Group` and `Timeline` are the pair: a `label` property, one `hostAria`
  call and a bare slot, alike to the line except that one says `group` and the
  other says `list`. The factoring that removes the duplication is a base class
  whose only variation point is that string, which buys four lines and costs
  every reader of either family a second file to open before they know what the
  element does. A handful of families render a slot and announce themselves, and
  that they resemble each other is what a tier with nothing to paint looks like
  rather than a seam waiting to be pulled.
- **`selected`, `current` and `active` are three states and not three spellings
  of one.** The platform already tells them apart, and every one of them lands
  on a different attribute, so a member reaching for the wrong word says
  something untrue to a screen reader while looking right in the markup.

  `selected` is chosen out of a set, where choosing is the interaction.
  `Tabs.Tab`, `Tree.Item` and `Radio` carry it and it is `aria-selected`, which
  is why it needs an owning role that admits selection.

  `current` is where the reader *is*, in a set that has an order or a place,
  which is true whether or not anybody chose it. `Steps.Step` and
  `VideoPlaylist.Item` carry it and it is `aria-current`, whose value is a token
  naming which kind of currency: a step writes `step`, a link in a navigation
  writes `page`. A tab is chosen and a step is arrived at, which is the whole of
  the difference.

  `active` on a member is neither. It is the row the keyboard is on, which is
  the platform's `aria-activedescendant` and a fact about focus rather than
  about the set: `Option` carries it as `data-active` and the listbox writes it.
  An option can be active and not selected on every keypress that moves through
  a list without choosing anything.

  `active` on a root is a fourth thing and a different part of speech.
  `Tabs.Root` and `Tree.Root` take a string naming which member is chosen, by
  value, where the three above are booleans on the member. The pair is the
  library's usual shape, a set's answer named on the set and mirrored onto the
  one that holds it.
- **`ref` is typed to the element class**, not `HTMLElement`, or a component's
  imperative methods are unreachable through it. That is the `jsxReactRef`
  plugin's whole job, and it is the one thing `@wc-toolkit/jsx-types` does not do
  on its own.
- **The generated props sit beside React's own**, so `onClick`, `className`,
  `style`, ARIA, `slot`, `part` and `data-*` typecheck on a Helix tag without
  being declared per component.
- **A numeric attribute takes the string that spells one.** `default-page="1"`
  reaches `setAttribute`, because React assigns a name the element has no
  property for as an attribute, and Lit's converter reads the number back out;
  the generator typed it `number` all the same. `jsxNumericAttributes` widens
  the attribute entry to `` number | `${number}` `` and leaves the property
  entry, `defaultPage`, and every same-named attribute alone: those reach the
  property verbatim, which is the `value={42}` rule above.

## Responsiveness

**A component cannot know the viewport and must not care.** A `@media` rule
inside a component gives the desktop branch to a 300px sidebar in a 1400px
window. Measured August 25, 2026: the library has exactly one viewport-width media
query, Dialog's, which is the defensible one because a modal's box really is the
viewport. Everything else in here is `@media print` or
`prefers-reduced-motion`, neither of which is responsiveness.

**Three categories, and the third is the one that gets got wrong.**

- **Its own width.** Anything depending on how much room a component was given
  belongs inside it, through `container-type: inline-size` and `@container`.
  Measured September 14, 2026: five families declare `container-type` (Code Block,
  Description List, Donut Chart, Notification, Scatter Chart) and four of them
  carry an `@container` rule, each folding a row into a stack below a width of
  its own. Built, then, where a family asked for it, and `data-density` is
  still the precedent to copy rather than a separate idea: the region tells
  its contents how tight to be and the component obeys.
- **The device or the page.** Belongs to the consumer's stylesheet. A component
  that reaches for it is claiming knowledge it does not have.
- **Orientation and behavior.** Not style at all. Turning a horizontal splitter
  vertical changes the drag axis, the arrow keys and `aria-orientation`
  together, so a CSS-only version looks vertical and behaves horizontal, with
  the keyboard moving the wrong way and the accessibility tree lying. State
  cannot come from a media query. It is a component decision driven by a
  `ResizeObserver`, and it is opted into rather than defaulted on: an
  `orientation="auto"` value keeps the resting state explicit, which is the rule
  the reflected properties already follow. Splitter carries it, and Carousel
  carries the same shape under its own name, `per-view="auto"` fitting as many
  slides as the track holds where a declared four was a bug on a narrow
  container rather than a style. **Button Group does not**, and its own block
  says why: turning a group of buttons is paint, so there is no state to resolve
  and nothing to observe, and what it needs is a consumer who knows the column
  is narrow being able to say so. An `auto` is earned by what turning *changes*,
  not by turning.

  **Carousel is also where the third category can be answered in CSS alone**,
  which is worth saying because the rest of this bullet is about why it usually
  cannot. Everything the fit takes is a length the sheet already has, so the
  panes go down at their final width on the first rule that runs, on a server's
  markup as on the client's, with no observer and no frame to wait for. The
  component still owns what follows from the count, the positions the track can
  stop at, and reads the laid-out pane back rather than the declaration.
- **The input device.** A fourth category, and the one exception to the rule at
  the top of this section. `@media (hover: none) and (pointer: coarse)` is
  honest inside a component because it describes the *pointer*, not the box: a
  touch device is a touch device whether the component sits in a 300px sidebar
  or fills the window, so nothing about the containing element can contradict
  it. Carousel uses it to drop its arrows where a swipe already does the job.
  This is the only media feature a component may read.

**What narrow looks like now, measured rather than asserted.** Every styled
family was rendered at 390 and at 320 on August 25, 2026. At 390 the library is
clean. At 320 exactly two families overflowed, Button Group by 26 pixels and
Pagination by 24, and both are fixed: Button Group gained `orientation` and the
per-corner Button hooks a stacked group needs to say what it means, and
Pagination needed no new API at all, because `siblings` and `boundaries` already
existed and the default simply asked for one slot more than a 272 pixel row
holds.

**The faults that sweep found were the site's, not the library's**, which is the
result worth keeping. Category one was unbuilt on that date, three families
declaring `container-type` and none writing an `@container` rule; by 14 Sep
2026 four had written one, as the list above says, so that measurement is
dated rather than current, and it was a measurement rather than a plan.

**`check:spec:visual` renders every family at two widths**, 640 and 390, on both
tiers, so a change to the narrow rendering is visible. That is the half of this
that stays fixed without anybody remembering to look. A baseline is what makes a
change visible, not a claim that what it pictures is good.

## Print

**Every family with a stylesheet says what it does on paper, and the answer is
one of five.** `@media print` does not cross a shadow boundary any more than a
reduced-motion rule does, so a consumer who wants a clean printout cannot write
one from the page: the rule has to be in the sheet the component adopts, and
`helix component`'s `print` holds every family to having one. What it says is
one of these, and the sheet carries the reason beside it:

| Answer | Spelling |
|---|---|
| Hides | `display: none`, for chrome: a printed page has no elsewhere to go |
| Flattens | A reset of a property the family draws, `box-shadow: none` on a surface that lifts |
| Unclips | `overflow: visible` on a box that scrolls, `white-space: pre-wrap` on a `<pre>` |
| Forces its fill | `print-color-adjust: exact`, where the fill is the information |
| Prints as it is | `print-color-adjust: economy` |

**The fifth is a spelling for "nothing to flatten", and it exists because the
alternative was a lie.** Fifty sheets carried `box-shadow: none` on paper and
named `box-shadow` nowhere else, measured September 14, 2026: a text run, a divider, a
list, each answering the question with a reset of a shadow it never drew, and
each reading as a family that had thought about paper. `economy` is the
browser's own answer restated, so it changes nothing on the page or on paper,
and it is a sentence: nothing here lifts, scrolls or carries its state in a fill.
It is the fourth spelling the focus-ring registry holds under `none`, for the
same reason.

**So a flatten or an unclip has to reset a property the family sets**, on any of
its sheets, as the longhand or the shorthand: `overflow-x: visible` answers for
`overflow: auto`, and `background-color: transparent` for a `background`. A
reset of a property nothing sets is reported. What a printer is told directly,
where a page may break and what a pseudo-element adds beside a link once there
is no hover to reveal it, answers for itself.


## The sandbox

`@fusion.dev/helix` ships the sandbox shell and `@fusion.dev/helix-sandbox` the editor and
the spec runner; `fusion/site` is the Next site that renders them. Both dev and
production work the same way as the marketing site, with element registration in
one client component.

- **The shell ships from `helix/styled`; the editor does not.** Subpath exports
  and honestly declared `sideEffects` are what make that safe: a consumer
  importing `@fusion.dev/helix/card` never sees a sandbox, so the weight is
  opt-in and the question is what the thing *is* rather than what it costs.

  `Sandbox` is a component, under `@category tooling`, single tier. It earns
  that by the same test as everything else: behavior, state and API. Pane-size
  memory across a content change, panel collapse, `hasPanel` so an omitted panel
  paints no band, and separator labels. Single tier because the headless and
  styled split exists so a consumer can bring their own presentation, and nobody
  reskins a dev tool.

  **The name is load-bearing.** `Sandbox.Preview` hardcodes
  `sandbox="allow-scripts allow-forms"` on its frame and never
  `allow-same-origin`: the component *is* the boundary. Move the isolation out
  and the name has to go with it.

- **`editor` and `specs` stayed in `@fusion.dev/helix-sandbox`.** The editor carries
  CodeMirror, about 4 MB installed against a design system of roughly the same
  size, and a `dependencies` entry is paid at install time by every consumer
  whether or not they import it. **That is the one cost a subpath export cannot
  solve**, and it is the whole reason the split falls where it does rather than
  at the package boundary. The spec runner imports and runs this repository's
  own spec files, so it is internal by definition rather than by weight.

  **And `@fusion.dev/helix-sandbox` is `private` while Helix is pre-release**, so today
  the cost is not opt-in, it is unavailable: a consumer gets the published shell
  from `@fusion.dev/helix` and brings their own source pane. The shell is slot-based
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
  `helix-before-edit` and the root hands the value to whatever preview is
  slotted into it, the same event-not-registration shape the accordion uses.
  *It was `helix-change` until 294 gave the eleven generic families verbs.*
- **The divider is a real `role="separator"`** with `aria-valuenow`, moved by
  arrow keys as well as by pointer. A divider only a mouse can move is unusable
  without one.

### The preview runs a different copy of Helix, and it is pinned

Two copies of the library are on that page and they are not the same build.

The sandbox's own chrome (the tabs, the tree, the toolbar) comes through Next's
module graph from `helix/styled/dist`, so `bun run watch` rebuilds it and HMR
shows it immediately. **The preview does not.** It runs `frame.js`, an 873 kB
classic-script IIFE built by `turbo run frame` and served from `public/`, which is
the only shape that can carry the library into a sandboxed document (see below).
It was 400 kB before the sandbox shell moved into `@fusion.dev/helix`, which the
frame imports whole: the shell now rides in every preview, which is what lets an
example render a `<helix-sandbox>` at all.

Both halves of that had to be fixed, and the second is the one that is easy to
miss: a bundle nothing rebuilds, and a bundle that, once rebuilt, still cannot
reach a tab that is already open.

- **`frame` is a turbo task**, `dependsOn: ["^build"]`, and `dev:watch` watches
  it rather than `build`. Because of that dependency, watching the frame
  rebuilds every library it carries as well, so the command does more and says
  less: `turbo watch frame --filter=@fusion.dev/site`. Turbo does not accept
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
`turbo run frame` and a page reload.** Not a hot reload, and not the chrome
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
  CORS-checked and does run, which is why `turbo run frame` emits one IIFE with
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
  example. **Do not split the API off from the examples.** Doing so produced two
  pages a reader had to hold in their head at once, the tables here and the
  pictures elsewhere, and no page that answered "what is this and how do I use
  it" without a navigation in the middle of the answer. Completeness was never
  the thing at risk; the manifest still decides what the tables say, and a
  picture beside them cannot make them less complete.
- **`/components/<family>/<example>` is the sandbox**, one example, editable.
  Still the place an example is *changed*. The reference page is where the
  headline one is *seen*.

**Which tier a reference page documents is a preference, not a route.**
`Base`/`Styled` lives in the preferences drawer beside color mode, keyed
`fusion-api-tier`, and styled is the default because it is the tier almost
everyone consumes and because it is a superset: styled extends base, so its
tables already contain every member base would show.

The page renders **both** tiers and a `data-api-tier` attribute on the document
hides one. That is not a shortcut. The preference is in `localStorage`, the
reference pages are static and server-rendered, and the server cannot read it,
so filtering in React would mean the server rendering one tier while the client
wants the other: a hydration mismatch on every component page. Marking both and
letting CSS choose costs a little HTML and cannot disagree with itself, which is
the same trade color mode already makes.

`display: none`, never a clip. The hidden tier has to leave the accessibility
tree as well as the page, or a reader being read the styled API gets the headless one
read out underneath it and the rail points at sections that are not shown.
Styled is expressed as the *absence* of the attribute, so the document's resting
state is the common answer.

Examples are `.examples/<slug>.html` and `.examples/<slug>.tsx` beside the
component, plus a `<slug>.css` where one is needed. `preview.html` is the
headline preview and reads as "Preview", the one example `helix component`'s
`examples-paired` holds to both layers; every other slug is a named variant.

**Each example carries its own stylesheet, even when it matches a sibling's.**
A reader takes an example away as one `index.html` and one `styles.css`, so a
sheet shared between slugs would be a file the copied example needs and does
not include. Thirteen of Aura's examples ship the same two-line `.stage` rule
for that reason, and it is the cost of every example standing alone rather
than duplication to remove. What is not the example's business goes to the
base layer instead: the `fieldset` reset ten form examples each carried is in
`base.css` now, because a page using the component would want it too.

**An example sheet carries no commentary.** A reader copies it as the CSS they
would write, so it holds rules and nothing else. The one exception is a single
line over a rule that would otherwise read as a mistake, such as a browser
workaround. The reasoning behind a sheet belongs in the commit that wrote it.

**Both syntaxes are authored, and neither is derived from the other.** The
**Do not derive one from the other.** A converted example is a function of its
twin rather than a thing anybody wrote, and conversion cannot be made to work:
an example carrying a `<script>` becomes a JSX fragment holding one, which is a
syntax error rather than a bad example, and `for` becomes `htmlFor`, which React
writes verbatim and the browser lowercases to something no component reads.

`jsxToHtml` survives for one job, converting a reader's live edit in the TSX
pane, which by definition has no authored twin.
`helix component`'s `examples-paired` holds the two files to each other and
`check:spec:visual-parity` holds the two pictures to each other.

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
declaration. **The site must not walk that folder itself**: it is a consumer, and
reading the library's source tree to find out what a component ships reaches past
the published interface. The markup stays on disk: it is the sandbox's payload,
it is large, and every consumer parses this manifest whether or not it renders
one.

A family with an `index.ts` and no `.examples` fails `helix component`'s `examples`. That is
what makes a directory a family, the same question the package's `exports` map
asks, which is why `field/` is exempt and why moving the sandbox into
`helix/styled` obliged it to ship an example.

There is no check for this. The line is between prose about the component and
prose that is merely content, which no word count can see, and the two examples
that legitimately carry the most text (`app-header`, which needs something to
scroll, and `outline`, which needs sections to point at) would be the ones a cap
caught first.

**Names drop the product.** `helix-app-header` displays as "App Header":
repeating "Helix" on every row inside the Helix site is noise. The tag keeps its
prefix, because that is a real identifier a consumer types.

## Tree-shaking

One family per module, subpath exports (`@fusion.dev/helix/card`) so consumers
need not import the barrel, and `sideEffects` declared honestly. Getting it
wrong is silent both ways.

**Both element tiers have side effects**, because both register: `styled`
declares `true` and `headless` declares `./dist/**/*.js`, which is the same
answer narrowed to what it ships. `core` declares `false` and means it, shipping
mixins and controllers that register nothing. This page said `headless` had none
until September 2, 2026, against 116 files calling `@customElement` and a manifest that
had always been right.
