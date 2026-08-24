/**
 * Every page's MDX, inlined by `bun run docs`. Do not edit: the files in
 * `content/` are the source, and `bun run check:docs` fails when this module
 * and they disagree.
 */
export const docSources: Record<string, string> = {
  accessibility: `---
description: What the library guarantees, what it cannot, and where the line is.
section: Foundations
title: Accessibility
---

# Accessibility

Some of accessibility is structural, and a component can own it. Some of it is
about your content, and no component can. Knowing which is which is the
difference between a page that is accessible and a page built out of accessible
parts.

## What the library owns

**Roles, states and keyboard interaction.** Every component implements the
pattern its role implies: arrow keys move within a \`Tabs\`, a \`Listbox\` and a
\`Menu\`, \`Escape\` dismisses an overlay, \`Home\` and \`End\` go to the ends, typing
jumps to a match. None of that is yours to write.

**Focus, including trapping and restoring it.** A \`Dialog\` traps focus while
open and returns it to whatever opened it. So do \`Drawer\` and the modal path of
\`Popover\`.

**Contrast, by construction rather than by review.** The theme engine measures
every foreground against the ground it is really painted on and solves for the
target rather than checking afterwards. Every pairing is then re-measured on a
laid-out page, including the great majority of rules that set an ink or a ground
but not both, so a pairing nobody thought of is still checked. See [Surfaces and
separation](./surfaces-and-separation).

**Reduced motion, per component.** Fifty-nine stylesheets answer
\`prefers-reduced-motion\` individually, because they have to: the base layer's
global rule is \`*, *::before, *::after\` in the document, and \`*\` does not cross
a shadow boundary, so it reaches your prose and none of the components.
A component that animates without answering fails the build.

**Disabled without disappearing.** \`disabled\` is mirrored to \`aria-disabled\`
rather than removing the control from the accessibility tree, so a screen reader
can still announce that the control exists and is currently off.

## What you own

**Names.** A component can render a label; it cannot know what to call your
thing. Every control takes \`label\`, and an icon-only control has nothing else to
go on:

\`\`\`html
<helix-icon-button
  label="Close"
  name="x"
></helix-icon-button>
\`\`\`

**\`label\` means a label and \`aria-label\` means a name.** They are not synonyms
here. \`label\` renders visible text and names the control through it;
\`aria-label\` names the control with nothing on screen. Reach for the second only
when the page already makes the purpose plain, which is rarer than it feels.

**Heading order.** Components render the heading levels you give them, not
levels they guess. A \`Card\` does not emit an \`h2\` on your behalf, because it
cannot know what is above it.

**Language and direction.** Set \`lang\` and \`dir\` on the document. Components use
logical properties throughout, so a right-to-left document lays out correctly,
but nothing infers the direction for you.
See [Localization and RTL](./localization).

**Live regions for your own updates.** The components announce their own state
changes. A message from your application needs somewhere to be announced:

\`\`\`html
<helix-announcement tone="warning">Your trial ends on Friday.</helix-announcement>
\`\`\`

\`Announcement\` is always a polite live region, never assertive. \`role="alert"\`
interrupts whatever is being read, which is right for something that appears
mid-session and wrong for something that was in the served HTML: an assertive
announcement would cut across a screen-reader user on every page load, before
they had read anything. Politeness costs a moment and is never wrong.

Note the distinction from \`Callout\`, which is a passage that interrupts a
document and is read where it sits. Neither is a variant of the other.

## Two things the shadow boundary changes

**IDREFs do not cross it.** \`aria-labelledby\` and \`aria-describedby\` inside a
shadow root cannot resolve to an id in your document, and the reference is
dropped silently rather than erroring. This is why every control renders its own
label instead of being wrapped by one, and why wiring two components together by
id does not work. See [Forms and validation](./forms).

**\`<label for>\` cannot reach in either.** A \`<label>\` in your markup will not
name a Helix control. Use the control's own \`label\`.

Where a relationship genuinely has to cross the boundary, the components use
\`ElementInternals\` and element-reference properties rather than ids, which is
the only mechanism that works. If you need the same for your own composition,
that is the tool.

## Hiding things correctly

\`\`\`html
<span data-hidden-visually>Sorting by</span>
\`\`\`

The base layer's \`[data-hidden-visually]\` clips rather than using
\`display: none\` or \`visibility: hidden\`, both of which take the element out of
the accessibility tree entirely, which is the opposite of what visually-hidden
text is for.

## What is not covered

The library is tested in Chromium, by automated specs and by pixel baselines. It
is not run through a screen reader on every release, and the components'
patterns follow the ARIA authoring practices rather than being certified against
them. Where you find a real failure, it is a bug: report it.
`,
  angular: `---
description: The schema Angular needs before it will compile an unknown tag.
parent: installation
section: Getting started
title: Angular
---

# Angular

Angular refuses to compile a template containing a tag it does not recognize.
That is a good default and it is the one thing standing between you and working
Helix components.

\`\`\`ts
import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core'

@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
  template: \`<helix-button>Save</helix-button>\`,
})
export class SaveButton {}
\`\`\`

Declare it on the components that use Helix rather than globally if you can.
\`CUSTOM_ELEMENTS_SCHEMA\` switches off unknown-element checking for the whole
template it is on, so scoping it keeps the check for your own typos.

## Binding

\`\`\`html
<helix-input
  (helix-input)="name = $event.detail.value"
  [value]="name"
/>
\`\`\`

\`[prop]\` sets a property, which is what a non-string value needs, and \`(event)\`
binds with \`addEventListener\`, so the event name is its own.

**Do not use \`attr.\` for a controlled property.** \`[attr.value]="name"\` writes
the attribute, which Helix reads once as a claim of ownership and then ignores;
the property is the live channel.

## No typings ship for Angular

There is no \`angular.d.ts\` in the package. \`CUSTOM_ELEMENTS_SCHEMA\` turns off
the checking that typings would feed, so a generated file would describe types
Angular has already agreed not to enforce. The manifest is published as
\`@helix-io/web/custom-elements.json\` if you want to generate something for your
own codebase from it.

The practical consequence is that a misspelled property fails silently here
where it is a compile error in React, Vue and Svelte. Worth a note in review.

## The controlled-property rule still applies

A declared \`value\`, \`open\`, \`checked\` or \`active\` hands ownership to you: the
element announces the change and applies none of it. Use \`default-value\` and its
siblings for a control that owns its own state. See [State and
control](./state-and-control).
`,
  'browser-support': `---
description: The platform features this is built on, and what is actually tested.
order: 5
section: Getting started
title: Browser support
---

# Browser support

Helix is built on the platform rather than on a compatibility layer. There is no
polyfill story, no transpiled fallback, and no configuration that trades
features for reach: what the library needs is what your browser has to have.

## What is tested

**Chromium, through Playwright.** The DOM specs run in it, and 83 pixel
baselines are captured in it, on Linux, with the network blocked.

That is the honest extent of it. Everything below is a statement about which
platform features the library uses, not a claim that we run the suite in Firefox
and Safari. If you ship Helix to those and find something broken, that is a bug
report we want, and it is not one we would have caught.

## What the library uses

| Feature | Where |
|---|---|
| Custom elements and shadow DOM | Everything |
| \`ElementInternals\` | Form participation, and ARIA that has to cross a shadow boundary |
| Popover API | Every overlay: menu, tooltip, select, combobox, dialog |
| \`light-dark()\` | 761 declarations, 135 of them in the token layer |
| \`oklch()\` | Every color in the system |
| \`:has()\` | 11 rules, mostly relational styling of slotted content |
| \`@starting-style\` | Entry transitions on overlays |
| \`:state()\` | Custom states a consumer's CSS can select |
| \`CSS.highlights\` | Filter-match highlighting, in \`Command\` and \`Combobox\` |

Positioning is \`@floating-ui/dom\` rather than CSS anchor positioning, which is a
deliberate choice and the one place the library takes a dependency instead of
the platform: anchor positioning is not yet available everywhere the rest of
this list is.

## What decides your floor

**\`light-dark()\` and the Popover API.** Everything else on that list has been
available longer. If you need to know whether a browser can run Helix, those are
the two to check, because they are the newest things the library assumes and
they are load-bearing: the first is how every token expresses both color modes
in one declaration, and the second is how every overlay is drawn in the top
layer.

Neither degrades usefully. A browser without \`light-dark()\` gets no color at
all rather than one mode; a browser without popover gets overlays that render in
flow. This is why there is no support table with a fallback column: there is no
partial mode to be in.

## \`CSS.highlights\` is the one exception

\`Command\` and \`Combobox\` highlight the matched substring in their filtered
results using the CSS Custom Highlight API. It is the least widely available
thing here, and it is the only one that degrades gracefully: without it the
results still filter, sort and select correctly, and the match is simply not
highlighted.

Nothing else in the library reads it.

## No IE, no polyfills, no build flag

There is no \`browserslist\` and no transpilation target, which is a decision
rather than an oversight. A design system whose components are
custom elements cannot be shipped to a browser without custom elements, and
everything else on the list above arrived in the same generation of browsers
that shipped those.

If you need to support something older, the honest answer is the base layer:
\`@helix-io/styles\` is plain CSS with no JavaScript, and a page built from its
recipes works considerably further back than the components do.
See [Without a bundler](./without-a-bundler).
`,
  charting: `---
description: The data channel nobody expects, and why it is a real table.
section: Essentials
title: Charting
---

# Charting

Six chart families: \`Bar Chart\`, \`Line Chart\`, \`Donut Chart\`, \`Sparkline\`,
\`Trend\` and the shared \`Legend\`. Each has its own API page. Here is how the data
gets in, which is the same for all of them.

## The data is a table in the document

\`\`\`html
<table id="revenue">
  <caption>Revenue by quarter</caption>
  <thead>
    <tr><th>Quarter</th><th>Direct</th><th>Partner</th></tr>
  </thead>
  <tbody>
    <tr><th>Q1</th><td>120</td><td>80</td></tr>
    <tr><th>Q2</th><td>150</td><td>95</td></tr>
  </tbody>
</table>

<helix-bar-chart for="revenue"></helix-bar-chart>
\`\`\`

\`for\` points at a real \`<table>\` by id, and the chart reads its series from it.
That is unlike every other component in the library, and it is not a
convenience.

**A property cannot survive hydration.** A framework's server render emits
markup, and a property is not markup: an array assigned to \`items\` exists only
after JavaScript has run, so the server has nothing to send and the first paint
has nothing to draw. Text in the document is the one channel that both a server
and a client can see.

**And the table is not a workaround, it is the accessible version.** A chart is
a picture of numbers, and a screen reader cannot read a picture. The table is
the numbers, in the document, navigable, and the chart is the drawing of them.
Hide the table visually if it should not be seen, and the data is still there:

\`\`\`html
<table
  data-hidden-visually
  id="revenue"
>…</table>
\`\`\`

The caption becomes the chart's accessible name unless you set \`label\`, which is
usually the right words and is already written.

## Series colours

Twenty-four \`--helix-color-series-*\` tokens, in order. A chart with three series
uses the first three. They are ordered to stay distinguishable in that order
rather than to look good as a full set of twenty-four.

The palette wraps, and where it wraps is one number in one place. It used to be
four: four families held the same \`const PALETTE = 24\` and the legend held a
fifth, so when the palette went from eight to twenty-four one of them was missed
and drew every ninth series in the first color while the legend beside it named
the ninth correctly. A number two files have to agree on is a number that will
stop agreeing.

**A chart's mark carries its own series color as a custom property**, because a
chart knows which series a bar belongs to and CSS cannot count it. That is what
lets you restyle a series from outside without knowing the drawing order.

## Legends

\`\`\`html
<helix-legend for="revenue"></helix-legend>
<helix-bar-chart for="revenue"></helix-bar-chart>
\`\`\`

The legend reads the same table, so the names and the colours cannot disagree
with the chart's. Pointing them at two different tables is the only way to make
them disagree, and it is not something to do by accident.

## Reduced motion

Charts animate on entry and on data change, and every one of them answers
\`prefers-reduced-motion\`. See [Motion](./motion).

## What these are not

**Not a charting library.** There is no axis configuration language, no plugin
system, and no chart type you build by composing scales. Six drawings that read
a table, styled by the token system, with an accessible representation by
construction. When you need a grammar of graphics, use one.
`,
  'coding-agents': `---
description: Every surface here is readable by a machine, and where each one is.
order: 4
section: Getting started
title: Coding agents
---

# Coding agents

An agent writing Helix code should not have to read a rendered website. Three
surfaces give it the library as text, all generated from the sources this site
renders from.

## The manifest

\`\`\`
https://fusion.dev/helix/custom-elements.json
@helix-io/web/custom-elements.json
\`\`\`

A URL and a package path, the same file either way. **The URL exists because this
page's own argument required it**: an agent that found the library through
\`llms.txt\` has this site and no checkout, and a specifier is reachable from a
\`node_modules\` and from nowhere else. It was only the specifier until 24 Aug 2026,
and the specifier did not resolve either: \`exports\` carried a \`./*\` pattern
pointing at \`./dist/*/index.js\`, so the path two pages recommended was one
\`require.resolve\` refused.

Every element, every property with its literal type union, every event with its
class, every slot, every part, every custom property. It is what the framework
typings, the reference documentation and the site's component pages are all
generated from, so it cannot disagree with them.

**A generated manifest is what makes hallucinating a component impossible to
sustain.** The vocabulary is the file: a tag that is not in it does not exist,
and a prop value outside a declared union is a value the component will reject.

Literal unions rather than named types are enforced at analysis time for exactly
this reason: \`'ghost' | 'outlined' | 'solid' | 'subtle'\` tells a reader what to
write, where \`ButtonEmphasis\` tells them to go and look somewhere else.

## Markdown for every family

\`\`\`
/components/<family>.md
/components/<family>.json
\`\`\`

Static files. The \`.md\` carries the family's metadata, every element's
description and API tables, and **the examples**, which the HTML page
deliberately does not: that page answers what a component can do and the sandbox
beside it answers what it looks like, and a reference that started collecting
pictures would stop being the one place you can trust to be complete. An agent
has no sandbox to be sent to, and to it an example is text rather than a
picture.

The \`.json\` is the same family as structured data.

## What is enforced

These are the difference between code that looks right and code that passes:

| Rule | Check |
|---|---|
| A controlled property must be answered | \`check:controlled\`, a type error |
| A dispatched event must be declared | \`check:events\` |
| A documented part must be rendered | \`check:parts\` |
| A documented CSS hook must be read | \`check:hooks\` |
| A visual property draws from its axis | \`check:axes\` |
| A form control styles with \`:disabled\` | \`check:disabled\` |
| A component that animates answers reduced motion | \`check:motion\` |
| No component reads a primitive token | \`check:tokens\` |

If you are generating Helix code, the first two are the ones that produce
working-looking output that is wrong.

## The index

\`\`\`
/llms.txt
\`\`\`

Every page on the site, grouped, each one linked at its \`.md\` and annotated with
a sentence. Generated from the same route registry the sitemap comes from, so a
page cannot exist without appearing here and cannot appear here without
existing.

Start there rather than crawling: one request, and it names every page on the
site plus the two machine-readable surfaces above. No count here, because a
number typed into prose is a number that goes stale, which the read of these pages
on 24 Aug 2026 found five of.

## From a component's page

Every family page carries a menu beside its title with **View Markdown**, **Copy
Markdown**, and links that hand the document's URL to Claude or to Cursor. The
URL rather than the contents, because the URL stays current and a pasted copy
starts going stale the moment it is pasted.

## What is not here

**\`llms-full.txt\`, or any other whole-library download.** Concatenating every
page into one file is out of date the moment anything changes, where the links
in \`llms.txt\` are individually cacheable and individually current.

This page used to offer one anyway, a repository path to a generated document
holding every family at once, which contradicted the paragraph above it and was
not a thing a consumer could open: an agent reading the published package has
this site and no checkout. What it was for is covered better by the two surfaces
already here. \`llms.txt\` is the index, one request, and each family's \`.md\` is
the document. Fetch the families you are using.

**A search index.** The site has one for humans; there is nothing an agent can
query yet, and \`llms.txt\` plus the documents it names is a smaller thing to read
than most search APIs are to learn.
`,
  color: `---
description: The roles, the ramps, and why the palette is solved rather than picked.
section: Foundations
title: Color
---

# Color

Seventy-four of the library's 177 tokens are color, which is most of what a
theme is. They are roles rather than values: nothing in Helix is named after
what it looks like, because a name like \`--brand-blue-500\` stops being true the
moment anybody rethemes.

## The roles

**Grounds**, which things sit on. \`background\` is the page itself, and the
surfaces above it are a ladder rather than a set:

[//]: # (tokens:surface-ladder)

| Token | Value | For |
| --- | --- | --- |
| \`--helix-color-background\` | \`light-dark(oklch(1 0 0), oklch(0 0 0))\` | The page. Told apart by nothing, because it is the ground. |
| \`--helix-color-surface\` | \`light-dark(oklch(0.985 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)), oklch(0.21 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)))\` | A plane on the page: a card, or a panel you own. Told apart by a fill, an edge or a lift, whichever the policy leads with. |
| \`--helix-color-surface-raised\` | \`light-dark(oklch(0.97 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)), oklch(0.29 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)))\` | Lifted while still lying on the page: a selected tab, a hovered row. Told apart by its fill, which goes down the ramp rather than up. |
| \`--helix-color-surface-overlay\` | \`light-dark(oklch(1 0 0), oklch(0.29 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)))\` | Over the page rather than on it: a menu, a popover, a dialog. Told apart by its shadow and by what it covers. |
| \`--helix-color-surface-sunken\` | \`light-dark(oklch(0.96 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)), oklch(0.15 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)))\` | A well a value goes into: an input, a track, a groove. Told apart by its fill, inward. |

[//]: # (/tokens)

Which one to reach for is a question about the geometry rather than about the
shade, and it is the thing people most often get wrong. See [Surfaces and
separation](./surfaces-and-separation).

**Inks**, which go on grounds. \`foreground\`, then \`foreground-muted\` and
\`foreground-subtle\` for text that recedes, and \`foreground-on-accent\` for text
that sits on a filled accent rather than on a surface.

**Intent**, which says what something means. \`primary\` and \`accent\` for
emphasis, each with \`-hover\`, \`-active\` and \`-subtle\`; \`info\`, \`success\`,
\`warning\` and \`danger\` for status, each with a \`-surface\` and a \`-surface-hover\`
for the tinted box the message sits in.

**Series**, twenty-four of them, for charts. Ordered rather than arbitrary: a
chart with three lines uses the first three, and they are chosen to stay
distinguishable in that order rather than to look good as a full set.

**Syntax**, eight roles for code: \`callable\`, \`comment\`, \`constant\`, \`invalid\`,
\`keyword\`, \`name\`, \`string\`, \`tag\`. Deliberately fewer than a full editor theme,
because a code block in documentation is read rather than edited.

## OKLCH

Every color is authored in OKLCH. Equal numeric steps in sRGB are not equal
perceptual steps, which makes both ramp generation and contrast arithmetic
unreliable: a ramp that is even by the numbers looks uneven, and a contrast
solver working in the wrong space cannot converge on a target it can measure.

Concretely, this is what lets the theme engine take a brand color and *solve*
for a palette rather than have someone pick one. See [Deriving a
theme](./theming).

## Contrast is a guarantee

The engine measures every ink against the ground it will really be painted on
and searches for the lightness that meets the target, rather than proposing a
value and checking it afterwards. Every pairing it produces meets the target by
construction.

That guarantee is only as good as the list of pairs somebody thought of, so two
things are checked rather than one. The engine's declared surface model is held
against what components actually paint, and then every pairing is measured on a
laid-out page, which is the only way to see the ones no stylesheet states: just
eleven rules in the library set an ink and a ground together, where 165 set only
an ink and 112 only a ground, and a pairing the cascade assembled is still a
pairing a reader has to be able to read.

## Do not reach past the semantic layer

\`\`\`css
/* Yours to read. */
color: var(--helix-color-foreground-muted);

/* Not yours to read, and \`check:tokens\` fails the build on it. */
color: var(--_helix-neutral-500);
\`\`\`

The primitive layer underneath, \`--_helix-neutral-500\` and its kind, is
\`helix/styles\`'s own business. The underscore marks it private and the
indirection is the whole point: it is what lets a theme change what
\`--helix-color-primary\` resolves to without every component knowing which step
of which ramp it happened to be.
`,
  'color-modes': `---
description: One attribute, two modes, and no token restated to honor it.
section: Foundations
title: Color modes
---

# Color modes

Light and dark are one attribute and no duplicated tokens. There is no second
stylesheet, no \`.dark\` class to toggle, and nothing to remember to update twice.

## How it works

\`\`\`css
:root {
  color-scheme: light dark;
  --helix-color-background: light-dark(#fff, #0b0b0d);
}
\`\`\`

Every token is written once, with both halves in a \`light-dark()\`. Which half
resolves is decided by \`color-scheme\` and nothing else, so the mode is a single
inherited property and no token is restated to honor it. That is 761
declarations across the library, 135 of them in the token layer, expressing two
modes without a second copy of anything.

## Setting the mode

\`\`\`html
<html data-color-mode="dark">
\`\`\`

\`[data-color-mode="light"]\` and \`[data-color-mode="dark"]\` set \`color-scheme\`,
and \`color-scheme\` inherits, so the attribute works **on any element** rather
than only on the root:

\`\`\`html
<div data-color-mode="light">
  <!-- A light preview inside a dark page. One attribute. -->
</div>
\`\`\`

That is the whole mechanism, and it is why the theme builder can show you a
light and a dark rendering of the same component side by side without rendering
two documents.

## Following the system

Unset, \`:root\` declares \`color-scheme: light dark\`, which means the operating
system decides. That is the default and it is usually right.

A \`prefers-color-scheme\` media query still exists in the token layer for one
narrow case rather than being the mechanism: a value that has to be *derived*
from the mode, rather than chosen between two, cannot be expressed as
\`light-dark()\` and has to ask which mode is current.

## The one component that inverts

\`Toast\` renders in the opposite mode to the page it is on, which is why it is
the exception written into the base layer:

\`\`\`css
helix-toast:not([data-color-mode]) {
  color-scheme: var(--_helix-mode-inverted);
}
\`\`\`

A toast is chrome over the page rather than part of it, and inverting is how it
reads as separate without a border. Opt out by putting \`data-color-mode\` on it,
which then wins, because the rule only applies to a toast that has not been
told.

## What this means for your own CSS

Write \`light-dark()\` for your own colours and set nothing else:

\`\`\`css
.callout {
  background: light-dark(#eef, #223);
}
\`\`\`

It will follow the page, follow a subtree that was told otherwise, and follow
the system when nothing has said. Do not write a \`prefers-color-scheme\` query
for it, and do not key off the \`data-color-mode\` attribute: both stop working
the moment a subtree overrides the mode, which is the case this design exists to
make cheap.
`,
  composition: `---
description: Families, parts and groups, and which to reach for.
section: Essentials
title: Composition
---

# Composition

Helix has families, parts and groups, and they are not stylistic choices. Each
answers a different question, and knowing which you are looking at tells you
what to import and what to write.

## Namespaces mean composition

\`Tabs.Root\` contains \`Tabs.Tab\`. The namespace says *this goes inside that*.

It never says *this is a version of that*. An icon-only button is not a part of
\`Button\`, so \`IconButton\` is top-level. The rule falls out of one line:

> Variants are props. Alternatives are separate components.

A button that is filled instead of outlined is the same component with a
different \`emphasis\`. A button that holds only an icon has a different
accessible-name requirement and a different shape, so it is its own component.

## When a region becomes an element

When it has behavior, state or API. Otherwise it is a slot.

\`Card\`'s header, body and footer carried none of the three, so five elements
became one and a title became a real \`<h2>\` the consumer writes. \`Tabs.Tab\`,
\`Select.Option\` and \`Accordion.Item\` do carry state, so they stay elements.

**An empty region still costs layout.** A \`<slot>\` is \`display: contents\`, so an unassigned one generates no
box: no grid row, no flex item, no gap. A wrapper generates one either way.
Measured on Card with identical content: wrappers present but empty rendered
85px against an ideal of 53px. Bare slots rendered 53px with no hiding logic at
all.

## When a group is a part

The test is whether the group reports a form value.

**\`Radio.Group\` and \`Toggle.Group\` do.** They own the \`name\`, the \`value\` and
the validity, and a lone radio is not a control at all: it is an answer to one.
The group is what the family is *about*, so it is a part of it, and the member
has nowhere else to be.

**\`Checkbox Group\` and \`Button Group\` do not.** Neither calls \`setFormValue\`.
Each checkbox is form-associated and submits itself; the group adds
\`role="group"\`, a shared name, and one place to read the set. A button needs no
group at all. Both are their own families, because their members are complete
controls that the family does not need the group to explain.

A container holding mixed content is a family for the same reason. \`Toolbar\`
holds buttons, dropdowns and inputs, and is about none of them.

## A content property is its slot's fallback

Where a property carries content rather than configuration, it is the fallback
content of a slot of the same name, never a second thing rendered beside it.

\`\`\`html
<!-- The property -->
<helix-tooltip content="Save"></helix-tooltip>

<!-- The slot, which replaces it -->
<helix-tooltip>
  <strong>Save</strong>, or press <helix-kbd>⌘S</helix-kbd>
</helix-tooltip>
\`\`\`

Text stays an attribute, because that is what most tooltips and most avatars
hold. Anything richer replaces it by being slotted. Both can never show at once,
and no component has to detect which you did.

One trap: **a whitespace-only text node is assigned to the default slot and
defeats its fallback.** A newline between the tags is enough. That is
why some examples close on the same line they open.

## Width comes from the layout

There is no \`width\` or \`fill\` property on a button, for the same reason there is
no \`size\` one: how wide a control is says something about the region it is in.

A button already stretches in a column flex or a grid, because that is what a
stretch-aligned parent does to its children:

\`\`\`html
<helix-flex direction="column">
  <helix-button
    emphasis="solid"
    tone="primary"
  >Fills its column</helix-button>
</helix-flex>
\`\`\`

To make one hug its label instead, tell the layout:

\`\`\`css
.hug {
  align-self: start;
}
\`\`\`

\`\`\`html
<helix-button class="hug">Hugs its label</helix-button>
\`\`\`

The default surprises people: dropping a button into a column makes it full
width, and the instinct is to look for a property that turns that off.

**A fixed width is a different question, and it belongs to your site.** A
marketing page whose hero buttons are all the same width is a real and reusable
practice, but the number is a fact about that page's design, not about buttons.
Name it once where your other page constants live:

\`\`\`css
:root {
  --site-cta-inline-size: 13rem;
}

.heroActions helix-button {
  min-inline-size: var(--site-cta-inline-size);
}
\`\`\`

The same reasoning puts a hero's type size outside the component scale: a
marketing hero is not a component, so its measurements are the site's own.

## One property per intent

Every field control names itself the same way, and there are exactly two cases.

\`\`\`html
<helix-input label="Files"></helix-input>       <!-- a visible label -->
<helix-input aria-label="Files"></helix-input>  <!-- named, nothing drawn -->
<helix-input></helix-input>                     <!-- unnamed. avoid -->
\`\`\`

\`label\` means a label. \`aria-label\` means a name. Neither means a control a
screen reader announces as "edit text", which is almost never what you want.
If the page already makes the purpose plain, that is the \`aria-label\` case, not
the empty case.

**\`aria-label\` works here because the component forwards it**, which is not true
of custom elements in general. A custom element
cannot delegate a label to the control inside its shadow root: an \`aria-label\`
you write on the host sits on a wrapper and never reaches the \`<input>\` that
actually takes focus. Measured on this library before it was fixed, the inner
input came back with no label and no name at all.

So the field renders the label and clips it, and the name arrives through the
same \`<label for>\` a visible one does.

There used to be a \`hide-label\` boolean beside \`label\`. It is gone: one
attribute supplying a label and a second saying not to show it is the absence of
the first, spelled twice.

## Shared behavior becomes its own family

\`Option\`, \`Listbox\` and \`Select\` are three families rather than one because the
keyboard, the filtering, the multi-select rules and the active-item tracking
should be written once. \`Select\` renders a \`Listbox\` internally; a future
combobox will; a command palette would.

The same reasoning made \`DrilldownController\`: \`Menu\` had held a page stack and
derived its rows since it was written, and none of that was about menus. \`Menu\`
and \`Drilldown\` share it now.

If you are about to write the second copy of something, that is the signal.
`,
  'elevation-and-material': `---
description: Five layers, four shadows, and the glass the material tokens make possible.
section: Foundations
title: Elevation and material
---

# Elevation and material

## Layers

[//]: # (tokens:layer)

| Token | Value |
| --- | --- |
| \`--helix-layer-base\` | \`0\` |
| \`--helix-layer-raised\` | \`10\` |
| \`--helix-layer-sticky\` | \`100\` |
| \`--helix-layer-overlay\` | \`1000\` |
| \`--helix-layer-toast\` | \`1200\` |

[//]: # (/tokens)

Five, named after what lives at each rather than numbered. A numbered scale
invites \`z-index: 1001\`, and the number nobody can justify is how stacking
context bugs start.

| Layer | What is at it |
|---|---|
| \`base\` | The document |
| \`raised\` | Something lifted but still in the flow: a hovered row, a dragged card |
| \`sticky\` | A header or a column that stays while content scrolls under it |
| \`overlay\` | Menus, dialogs, popovers, tooltips |
| \`toast\` | Above everything, including a modal |

**Most overlays do not need these**, because they use the popover API and render
in the browser's top layer, which is above every z-index by construction. The
tokens are for the cases the top layer does not cover: your own sticky header,
your own dragged element, and anything that has to sit between two of ours.

## Shadows

[//]: # (tokens:shadow)

| Token | Value |
| --- | --- |
| \`--helix-shadow-none\` | \`none\` |
| \`--helix-shadow-sm\` | \`0 1px 2px var(--_helix-shadow-ink-sm)\` |
| \`--helix-shadow-md\` | \`0 4px 12px var(--_helix-shadow-ink-md)\` |
| \`--helix-shadow-lg\` | \`0 12px 32px var(--_helix-shadow-ink-lg)\` |
| \`--helix-shadow-surface\` | \`var(--helix-shadow-none)\` |
| \`--helix-shadow-floating\` | \`var(--helix-shadow-lg)\` |

[//]: # (/tokens)

The first four are the values. The last two are the *decision*, and they are
what a theme sets to make the system shadow-first or border-first. See [Surfaces
and separation](./surfaces-and-separation).

## Material

Eight tokens describing translucency rather than color:

[//]: # (tokens:material)

| Token | Value | For |
| --- | --- | --- |
| \`--helix-material-backdrop\` | \`blur(var(--helix-material-blur-md))\` | The wash behind a modal. |
| \`--helix-material-opacity\` | \`1\` | How opaque a translucent surface is. |
| \`--helix-material-blur-sm\` | \`8px\` | The lightest backdrop blur. |
| \`--helix-material-blur-md\` | \`16px\` | The backdrop blur a modal takes. |
| \`--helix-material-blur-lg\` | \`32px\` | The heaviest backdrop blur. |
| \`--helix-material-translucent\` | \`color-mix(in oklab, light-dark(oklch(1 0 0), oklch(0.21 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258))) 72%, transparent)\` | The translucent ground, for a surface that admits what is behind it. |
| \`--helix-material-translucent-strong\` | \`color-mix(in oklab, light-dark(oklch(1 0 0), oklch(0.21 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258))) 88%, transparent)\` | The heavier translucent ground, for one that admits less. |
| \`--helix-material-border\` | \`light-dark(color-mix(in oklab, oklch(0.15 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)) 14%, transparent), color-mix(in oklab, oklch(1 0 0) 12%, transparent))\` | The edge a translucent surface needs to have any at all. |

[//]: # (/tokens)

These are what the \`material\` axis renders: \`frosted\`, \`glass\` and \`transparent\`
are three points of one optical language, and they are an axis of their own
rather than values of \`emphasis\`, because a panel can be glass *and* outlined
and two things that can be true at once are two axes. See [Visual
axes](./visual-axes).

**Blur is expensive and is the one thing here worth being deliberate about.** A
\`backdrop-filter\` forces the compositor to re-read what is behind the element on
every frame it moves. A frosted header that is always on screen pays that
continuously. Reach for \`translucent\` without the blur when the effect is about
depth rather than about the texture.

**\`material-border\` is not decoration.** A translucent surface takes its color
from what is behind it, so on a busy background it has no edge at all. The
border token is what keeps it a shape.
`,
  events: `---
description: Twenty-one events, why every name is prefixed, and which ones bubble.
section: Essentials
title: Events
---

# Events

Every Helix event is a named class with a typed \`detail\`, dispatched under a
\`helix-\` prefixed name. Twenty-one of them.

\`\`\`ts
element.addEventListener('helix-change', (event) => {
  // \`event\` is a HelixChangeEvent. The detail is typed.
})
\`\`\`

The class exists rather than a bare \`CustomEvent\` for three reasons, all about
the type reaching you: the class name is in the manifest, which is what lets the
framework typings emit a typed callback instead of \`(detail: unknown)\`; the
package augments \`HTMLElementEventMap\`, which types \`addEventListener\` for
people writing plain HTML; and the name lives on the class, so a dispatch and a
listener cannot disagree about the string.

## Why events are prefixed

**Retargeting.** An event dispatched inside a shadow root is retargeted to look
like it came from the host, so a bare \`input\` from a \`<helix-input>\` is
indistinguishable from the inner control's own. Prefixed, it cannot be mistaken
for either.

**React's claimed verbs.** React's synthetic system owns \`change\`, \`input\`,
\`submit\`, \`copy\`, \`focus\` and the rest, and a prop matching one of those is
wired to the native event instead. \`onhelix-change\` matches none of them and
reaches us.

**The type map is global.** \`HTMLElementEventMap\` is shared with every element
in your application. Our classes extend \`Event\`, so an entry named \`select\`
would not fail to compile: it would silently retype
\`textarea.addEventListener('select', …)\` as carrying our detail, which at
runtime is \`undefined\`. Measured. An unprefixed name is not a collision we would
notice, it is one you would.

## Propagation follows the event's role

**Lifecycle does not bubble and is not composed.** \`helix-open\` and
\`helix-close\`. Overlays nest, and an inner one's lifecycle must never reach the
outer one that contains it: a menu closing inside a dialog is not the dialog
closing.

**Coordination bubbles and is composed.** \`helix-select\`, \`helix-dismiss\`,
\`helix-change\`. A parent, or a router, can intercept one across a shadow
boundary, which is what makes a \`Tree\` usable as navigation.

If you are listening on a container and hearing nothing, the event is probably a
lifecycle one and the listener belongs on the element itself.

## Canceling

The events that precede a state change are cancelable, and that is the only way
to refuse one:

\`\`\`ts
dialog.addEventListener('helix-close', (event) => {
  if (unsaved) {
    event.preventDefault()
  }
})
\`\`\`

Every dispatched event is held to a declaration and every declaration to a
dispatch, so an event you can listen for is an event that is documented.

## The set

| Event | Roughly |
|---|---|
| \`helix-open\`, \`helix-close\` | An element's open state, before it moves |
| \`helix-change\` | A committed value |
| \`helix-input\` | An edit in progress |
| \`helix-select\` | An item chosen from a set |
| \`helix-toggle\` | A two-state control flipped |
| \`helix-dismiss\` | The reader asked for something to go away |
| \`helix-next\`, \`helix-previous\` | Movement through a sequence |
| \`helix-filter\` | A query changed in a filtering control |
| \`helix-navigate\` | A component is about to navigate |
| \`helix-copy\` | Something was copied |
| \`helix-caret\` | The cursor moved in a text control |
| \`helix-load\`, \`helix-error\`, \`helix-complete\` | Media and async lifecycle |
| \`helix-create\` | A new item was made from a query |
| \`helix-console\` | The sandbox relaying a log |
| \`helix-tour-ask\`, \`helix-sample-start\`, \`helix-sample-end\` | Tour and color sampling |

Each component's page lists the events it actually dispatches, with the class
and the detail.

## In a framework

The prop is \`on\` and the event name, verbatim: \`onhelix-change\`. Nothing strips
the prefix and nothing camel-cases it. See [React](./react), [Vue](./vue) and
[Svelte](./svelte).
`,
  forms: `---
description: Real form participation, labels that resolve across a shadow root, and the disabled trap.
section: Essentials
title: Forms and validation
---

# Forms and validation

Twenty-two families are form-associated custom elements, so a \`<form>\` collects
them, resets them, restores them on back-navigation and validates them the way it
does a native control. Nothing about that is simulated.

\`\`\`html
<form>
  <helix-input
    label="Name"
    name="name"
    required
  ></helix-input>
  <helix-select
    label="Plan"
    name="plan"
  >
    <helix-option value="free">Free</helix-option>
    <helix-option value="pro">Pro</helix-option>
  </helix-select>
  <helix-button type="submit">Save</helix-button>
</form>
\`\`\`

\`new FormData(form)\` has \`name\` and \`plan\` in it. So does a server reading the
POST body.

## Every control carries its own label

\`\`\`html
<helix-input
  hint="We only use this to sign you in."
  label="Email"
  name="email"
  required
></helix-input>
\`\`\`

There is no wrapping \`Field\` component, and that is not a style preference. **A
wrapper cannot name what it wraps.** Its label would live in one shadow root and
the control in another, and measured in Chrome 148: an \`aria-labelledby\` IDREF
cannot see across a shadow boundary, and \`control.ariaLabelledByElements =
[labelInTheWrapper]\` reads back as zero elements, the reference silently
dropped. The same assignment with a label in the control's own tree is kept.

That pattern works in React component libraries because they have no shadow
boundary. Bringing it here brings the ergonomics and none of the conditions that
made it work.

So every control that wants a label has the same three properties and renders
its own nodes:

| Property | For |
|---|---|
| \`label\` | The accessible name, and the fallback for the \`label\` slot |
| \`hint\` | Help under the control, while there is nothing wrong |
| \`feedback\` | What is wrong, in your words rather than the browser's |

Each is a slot fallback, so anything richer than a string replaces it:

\`\`\`html
<helix-input name="email">
  <span slot="label">Email <helix-badge>required</helix-badge></span>
</helix-input>
\`\`\`

**A whitespace-only text node defeats a default slot's fallback**, which costs a
label and gives no warning. Measured in Chrome 148: a newline between the tags
is enough, so \`<helix-checkbox label="Accept">\` closed on the next line renders
no label at all. Named slots do not have this problem, because \`slot="label"\` is
an attribute and a text node has none. It is the platform's behavior rather
than ours, and it is true of every slot fallback in the library.

## Validation

The platform's own validation works, because these are real form participants:

\`\`\`html
<helix-input
  label="Email"
  name="email"
  required
  type="email"
></helix-input>
\`\`\`

Submitting an empty form blocks and points at the control. \`checkValidity()\`,
\`reportValidity()\` and \`:invalid\` behave.

**\`feedback\` overrides the message.** Left empty, the browser's own is shown,
which is localised and familiar; set, it says what you want in the words your
product uses:

\`\`\`html
<helix-input
  feedback="We need this to send your receipt."
  label="Email"
  name="email"
  required
></helix-input>
\`\`\`

**A group is the participant, not its members.** \`Radio.Group\` and
\`Toggle.Group\` own the \`name\`, the \`value\` and the validity: a lone radio is not
a control at all, it is an answer to one. \`Checkbox.Group\` is the exception in
the other direction, since each box in it submits itself already, so the group
deliberately reports no value of its own.

## The disabled trap

\`\`\`html
<fieldset disabled>
  <helix-input
    label="Name"
    name="name"
  ></helix-input>
</fieldset>
\`\`\`

That works, and it did not always. The platform tells a form-associated element
through \`formDisabledCallback\`, which nothing implemented, so a control inside a
disabled fieldset stayed fully typeable and announced itself as enabled.
Measured: a \`helix-input\` in one accepted text, reported \`disabled\` as false,
and carried no \`aria-disabled\`, while the form's entry list correctly left it
out. Interactive and unsubmittable is the worst of both.

**For your own CSS this means one rule.** Style disabled controls with
\`:disabled\`, never \`[disabled]\`:

\`\`\`css
/* Right: matches the attribute and the ancestor fieldset. */
helix-input:disabled { … }

/* Wrong: misses every control inside a disabled fieldset. */
helix-input[disabled] { … }
\`\`\`

The pseudo-class is true for a control carrying the attribute *and* for one
inside a disabled fieldset, which sets no attribute on anything. A component
styled with the attribute selector refuses interaction from the fieldset,
because the platform disables it either way, and paints itself as live. That
reads as a control that is simply broken, and it is invisible in every example
that does not happen to use a fieldset. The library holds itself to this, and
the same reasoning applies to yours.

\`disabled\` is mirrored to \`aria-disabled\` rather than removing the control from
the accessibility tree, so a screen reader can still announce that the control
exists and is currently off.

## Controlled and uncontrolled

Every form control follows the ownership rule: a declared \`value\` or \`checked\`
is a claim, and the element will announce and wait rather than apply. In a form
you usually want the uncontrolled shape and to read the values at submit:

\`\`\`html
<helix-input
  default-value="Ada"
  label="Name"
  name="name"
></helix-input>
\`\`\`

See [State and control](./state-and-control).
`,
  iconography: `---
description: 103 glyphs, one geometry, and how to draw one that is not in the set.
section: Foundations
title: Iconography
---

# Iconography

\`\`\`html
<helix-icon name="trash"></helix-icon>
\`\`\`

103 glyphs, from Phosphor, drawn on a 256 box at stroke-width 16. That is
Phosphor's own geometry and it is kept rather than rescaled: normalizing to a 24
box would change the optical weight of every glyph and stop the set matching
anything upstream.

## Size and color come from the context

An icon has no \`size\` and no \`color\` property. It is \`1em\` square and
\`currentColor\`, so it takes the size and color of the text it sits in:

\`\`\`html
<span data-tone="danger">
  <helix-icon name="warning"></helix-icon> Careful
</span>
\`\`\`

Inside a control, \`--helix-size-icon\` is what decides, and it follows the
region's density along with everything else. That is why an icon in a small
button is smaller without anybody saying so.

## Decorative or named

\`\`\`html
<!-- Decorative: the text beside it already says what this is. -->
<helix-button>
  <helix-icon name="trash"></helix-icon>
  Delete
</helix-button>

<!-- Named: there is no text, so the icon has to carry the name. -->
<helix-icon-button
  label="Delete"
  name="trash"
></helix-icon-button>
\`\`\`

An icon with no \`label\` is hidden from assistive technology, which is right when
the words are beside it and wrong when they are not. \`Icon.Button\` takes a
\`label\` because it never has words beside it.

## Importing a glyph directly

\`\`\`ts
import { trash } from '@helix-io/icons'
\`\`\`

Each glyph is an exported string, so you can put one in your own markup, in a
canvas, or anywhere an element is not what you want. Every \`name\` the library
uses is held to the set of glyphs that actually exist, so a typo is a build
failure rather than an empty box.

## Adding one

Drop the SVG into \`helix/icons/raw\` and run \`bun run icons\`. The set is
generated from those files, so adding a glyph is adding a file rather than
hand-transcribing a path into a TypeScript object.

Keep to the same geometry: 256 box, stroke-width 16, no fill. A glyph drawn at a
different weight is visible immediately when it sits beside one that was not.

## Icons this set does not have

Product marks. Helix and Cortex have marks and they live in the icon package,
but a mark is not an icon: it identifies a product and does not mean an action.
Three earlier attempts at product marks were removed for being pictograms of a
metaphor standing beside a parent that is a geometric monogram, and the rule
that replaced them is that **a mark is one rounded body with material removed**.
If you are reaching for the icon set to draw a logo, that is the wrong drawer.
`,
  installation: `---
description: What to install, the order the stylesheets go in, and how to check it worked.
order: 3
section: Getting started
title: Installation
---

# Installation

\`\`\`sh
bun add @helix-io/web @helix-io/styles
\`\`\`

\`@helix-io/styles\` is not optional and not a peer dependency by accident. The
components reference semantic tokens and paint nothing without them: a Helix
page with the elements installed and the tokens missing renders unstyled boxes
rather than an unthemed version of itself.

## The stylesheets go in this order

\`\`\`ts
import '@helix-io/styles/tokens.css'
import '@helix-io/styles/base.css'
import '@helix-io/web/elements.css'
\`\`\`

Three files, and each one needs what is above it.

- **\`tokens.css\`** declares the semantic layer, 177 custom properties in 15
  categories, plus \`color-scheme: light dark\` on \`:root\`. Everything below reads
  from it.
- **\`base.css\`** is the element reset, the type scale on bare \`h1\` through
  \`h6\`, and the recipes for markup this library does not render. It reads
  tokens.
- **\`elements.css\`** is the components' own layer. It is generated from the
  component stylesheets and is what lets a page render correct-looking Helix
  before any JavaScript arrives.

**The last one is the one people leave out**, because everything works without
it right up until the page is server-rendered: an element that has not upgraded
yet has no shadow root and no styles of its own, so the markup flashes unstyled
and then snaps into place. \`elements.css\` is what makes that interval look like
the finished page.

Put them in a stylesheet you control rather than deep inside a component, so the
order is visible in one place and stays that way.

## Register the elements

\`\`\`ts
import '@helix-io/web'
\`\`\`

A side-effect import. It calls \`customElements.define\` for every element, once,
and is safe to run more than once: the helper behind it checks the registry
first, because a second \`define\` for the same tag throws and takes the rest of
the module with it.

You can register a subset instead, from a subpath:

\`\`\`ts
import '@helix-io/web/button'
import '@helix-io/web/dialog'
\`\`\`

Worth doing when you use a handful of components. Not worth doing in the belief
that the full import ships everything to the browser: the package is
side-effectful by design, so a bundler keeps what you import either way, and the
subpaths are about being explicit rather than about size.

## Check it worked

Render one element and ask the browser whether it upgraded:

\`\`\`ts
await customElements.whenDefined('helix-button')
console.log(document.querySelector('helix-button')?.shadowRoot !== null)
\`\`\`

\`true\` means the definition arrived and the element built its shadow root.
\`false\`, or a promise that never settles, means the registration import did not
run: usually a \`'use client'\` boundary the import ended up outside of, or a
subpath import for a component you did not end up using.

**A styling problem looks nothing like that.** If the element upgraded and the
page still looks wrong, the stylesheets are the thing to check, in the order
above. The tell is which layer is missing: no color at all is \`tokens.css\`,
unstyled prose and bare headings is \`base.css\`, and components that look right
once JavaScript runs but flash unstyled before it is \`elements.css\`.

## Your framework

The elements are custom elements and every framework can render one. What
differs is how a framework passes a non-string value, how it binds an event, and
whether it needs telling that an unknown tag is deliberate.

| | |
|---|---|
| [React](./react) | A runtime bridge ships for it, plus \`jsx.d.ts\` |
| [Vue](./vue) | Ships \`vue.d.ts\`, needs \`compilerOptions.isCustomElement\` |
| [Svelte](./svelte) | Ships \`svelte.d.ts\`, and needs nothing else |
| [Angular](./angular) | Needs \`CUSTOM_ELEMENTS_SCHEMA\` |
| [Other frameworks](./other-frameworks) | Solid, Qwik, Lit, and the three rules they all reduce to |
| [Without a bundler](./without-a-bundler) | An import map, or the stylesheets alone |

A framework gets its own page when Helix ships typings for it, or when it
refuses to compile without configuration. Everything else works with no setup.
`,
  'intent-reference': `---
description: Every input the theme engine takes, and what each one decides.
section: Theming
title: Intent reference
---

# Intent reference

[Deriving a theme](./theming) is the argument. This is the surface: everything
\`ThemeIntent\` accepts, and what changes when you set it.

\`\`\`ts
import { derive } from '@helix-io/theme'

const theme = derive({ brand: '#2563eb' })
\`\`\`

**\`brand\` is the only required input.** Everything else has a default that is
derived from it or from the design language, and a theme that sets one field is
a valid theme.

## Color

| Field | Decides |
|---|---|
| \`brand\` | The one color most consumers care about. Required |
| \`accent\` | The second emphasis. Defaults to the complement, \`{ from: 'brand', rotate: 180 }\` |
| \`neutral\` | The gray ramp, which can be tinted toward the brand |
| \`status\` | \`info\`, \`success\`, \`warning\`, \`danger\`. A color pins one; an object nudges its hue within the meaning it already carries |
| \`chroma\` | How saturated the palette is, independent of hue |
| \`scheme\` | \`'light'\` or \`'dark'\`, for a theme that is only one |
| \`tokens\` | Literal overrides, by token name, for the cases nothing else reaches |

**\`accent\` may be a relation and \`status\` may not**, and the asymmetry is
deliberate: a \`danger\` that rotates with the brand is a warning a reader has to
re-learn per product.

**\`chroma\` is the axis a brand's feel lives on.** Monotone, muted, restrained
and vivid are all chroma statements and none of them is a hue. \`ceiling\` clamps,
so 0 is monotone and roughly 0.10 is muted; \`scale\` multiplies what the brand
supplies. Both apply to every derived color including the brand itself, because
a monotone theme is one where the brand is gray too. Never applied to a value
you pinned: a pinned color is a fact.

## The guarantee

| Field | Decides |
|---|---|
| \`contrastTarget\` | Target contrast for body text. 4.5 is WCAG AA, 7 is AAA |
| \`pairings\` | Extra foreground and background pairs to solve for, beyond the model's own |

4.5 is the default because the European Accessibility Act points at WCAG 2.1 AA,
so it is the figure with legal weight.

## Shape and space

| Field | Decides |
|---|---|
| \`radius\` | Corner rounding across the system |
| \`density\` | Scales spacing and control heights. 1 is default, 0.875 is compact |
| \`separation\` | Whether a surface is told apart by an edge or by a lift |

\`separation\` is the policy pair described in [Surfaces and
separation](./surfaces-and-separation).

## Type and motion

| Field | Decides |
|---|---|
| \`font\` | The families, and the half of the type system that is a scale |
| \`motion\` | \`character\` and \`scale\` |

**\`motion.character\` sets the curve every component reaches for and carries a
duration multiplier with it**, because the two are one decision: a spring over
120ms is a twitch, and a soft curve over 120ms is a fade. \`scale\` multiplies on
top for a theme that wants the character and not the pace.

\`instant\` is not scaled. It is 0 and means "do not animate", which is a
statement rather than a duration, and it emits no curves at all: three easings
for transitions of zero length is a contradiction.

\`precise\` is the one character that is not physical. The other three accelerate,
settle or overshoot; linear reads as moved by a mechanism, and it is the only
curve legible on a short travel, because constancy shows in the timing where an
overshoot shows in the distance.

## Material

| Field | Decides |
|---|---|
| \`material\` | \`blur\` in pixels and \`opacity\` from 0 to 1 |

**This is the one choice that can invalidate the contrast guarantee.** Contrast
is measured against a known ground, and a translucent surface does not have one,
so a pair over it comes back \`unverifiable\` rather than measured. That is
reported rather than hidden: a theme with heavy material is making a trade and
should be able to see it.

## Output

| Field | Decides |
|---|---|
| \`namespace\` | The token prefix. Defaults to \`helix\` |

\`namespace\` is for a product shipping its own token layer built on this engine.
Everything else in the library reads \`--helix-*\`, so changing it is a decision
about your own surface rather than about Helix's.
`,
  introduction: `---
description: What Helix is, and the five tiers it ships as.
order: 1
section: Getting started
title: Introduction
---

# Helix

A design system of web components: tokens, a headless component tier, a styled
tier, and the framework typings generated from both. It works in any framework,
or none, because the components are custom elements.

Two things make it different from a component library.

**Theming is derivation, not override.** You supply a handful of intent inputs
and the system computes a complete token set whose every foreground and
background pair meets its contrast target by construction. See
[Theming](./theming).

**AI is a first-class consumer.** Components are described by a custom elements
manifest with typed enums, documented parts, and generated React prop names. An
agent can write correct Helix code by reading types alone. That is why
conventions like inline literal unions and documented CSS parts are enforced at
analysis time rather than left to review.

## Install

\`\`\`sh
bun add @helix-io/web @helix-io/styles
\`\`\`

Three imports at your app root, in this order, then the elements are usable
anywhere:

\`\`\`ts
import '@helix-io/styles/tokens.css'
import '@helix-io/styles/base.css'
import '@helix-io/web/elements.css'
import '@helix-io/web'
\`\`\`

\`\`\`html
<helix-accordion separation="outlined">
  <helix-accordion-item default-open>
    <span slot="summary">What is Helix?</span>
    <p>A design system that derives its own accessible palette.</p>
  </helix-accordion-item>
</helix-accordion>
\`\`\`

[Installation](./installation) has the order those imports are in and why, and a
page for each framework.

## Packages

| Package | Use when |
| --- | --- |
| \`@helix-io/styles\` | Always. Tokens and the base layer |
| \`@helix-io/web\` | You want Helix components as-is |
| \`@helix-io/headless\` | You want the behavior and none of the styling |
| \`@helix-io/theme\` | You are generating or validating a theme |
| \`@helix-io/icons\` | You are drawing an icon outside a component |
| \`@helix-io/core\` | You are building a new Helix component |

**There is no React package.** The elements are custom elements and React
renders them directly; what ships for React is a \`jsx.d.ts\` that types every tag
and a runtime bridge in \`@helix-io/core\` that repairs React's hydration of
custom events. [React](./react) has both.

See [Tiers](./tiers) for how the packages relate and which one to reach for.
`,
  localization: `---
description: Locale-aware controls, translatable strings, and a layout that already flips.
section: Essentials
title: Localization and RTL
---

# Localization and RTL

## Right-to-left already works

Set \`dir\` and the layout flips:

\`\`\`html
<html
  dir="rtl"
  lang="ar"
>
\`\`\`

Every component is written in logical properties, \`inline-start\` rather than
\`left\`, \`margin-block\` rather than \`margin-top\`. Sixty-seven stylesheets name a
direction, and **not one of them names a physical side**: there is no
\`margin-left\`, no \`padding-right\` and no \`inset-top\` anywhere in the library.
Nothing infers the direction for you and nothing needs to: the document says it
and the components follow.

The same is true of anything you write on top. Use logical properties and your
layout flips with ours; use \`left\` and \`right\` and it will not.

## Locale-aware controls

Six families format numbers or dates and take a \`locale\`:

| | |
|---|---|
| \`Date Input\`, \`Date Picker\` | Date formats and first day of week |
| \`Time Input\`, \`Time Picker\` | 12 or 24 hour, and separators |
| \`Pagination\` | Grouped thousands in page numbers |
| \`File Input\` | File sizes |

\`\`\`html
<helix-pagination
  locale="de-DE"
  pages="1200"
></helix-pagination>
\`\`\`

Left unset, they use the browser's own locale, which is usually right. Set it
when your application's language is a choice the reader made rather than the one
their operating system is in.

Formatting goes through \`Intl\`, so there is no locale data bundled and nothing
to keep up to date.

## Translatable strings

Seventy properties across the headless tier are strings a reader sees, and every
one is a property rather than a hardcoded word. The ones that combine
values are format templates:

\`\`\`html
<helix-pagination-summary
  format="{from} bis {to} von {total}"
  locale="de-DE"
  page="2"
  page-size="10"
  total="1500"
></helix-pagination-summary>
\`\`\`

The placeholders are named rather than positional, so a translation can reorder
them, which some languages require and a positional format cannot express.

**Pass these from your own translation system.** Helix ships English defaults
and no translation machinery: a design system that owned the string catalog
would be a second one to keep in step with yours.

## What to check when adding a language

- **Long strings.** German and Finnish will find every control that assumed a
  short label. Controls take their width from the layout rather than carrying
  one, which helps, but a toolbar that fitted six buttons may now fit four.
- **The \`lang\` attribute, not just the strings.** Hyphenation, quotation marks
  and font fallback all key off it.
- **Numerals.** \`Intl\` handles the digits; a hardcoded \`%\` or a currency symbol
  in your own markup will not move to the right side.
- **Icons that point.** A chevron meaning "forward" is mirrored by the logical
  properties; one baked into an SVG path is not.

## What is not covered

There is no message catalog, no pluralization helper and no date-range
formatter beyond what the controls do for themselves. Those belong to your
application's i18n layer, and every one of these properties is designed to be
fed from it.
`,
  metrics: `---
description: What Helix costs a page, measured rather than claimed.
order: 7
section: Getting started
title: Metrics
---

# Metrics

*Generated by \`bun run metrics\` from the built packages. Do not edit: every
number here is measured, and an edited one is a number nothing produced.*

Bundle size only. Load and rendering are not measured yet, and when they are
they stay off any comparison with another library, because bytes are
falsifiable across systems and a render timing is a fact about a page.

## How these are measured

The method is on the page because a size table without one is a claim rather
than a measurement.

- **The published artifact, not the source.** Each row bundles \`dist\`, which is what npm ships, through Bun 1.1.43, minified, ESM, browser target, no source maps.
- **Everything is bundled in, Lit included.** A page with no other Lit library pays for Lit, so it is counted. Its own row is in the package table below, so it can be subtracted.
- **A package row re-exports the package; a component row imports it for effect.** That is how each is used: an element is imported to register itself, and a package is measured by its whole public API. Importing a \`sideEffects: false\` package for effect measures nothing, because a bundler is right to delete it.
- **Gzip is level 9 and brotli is quality 11**, which is what a CDN serving static assets does.
- **The bundler version is part of the number.** It is pinned in \`packageManager\` and in CI, so the same source measures the same in both places.

Two columns for every component, because there is no single honest number for
a component in a library with a shared runtime:

- **Alone** is a page that uses this component and nothing else. It includes the runtime the component cannot work without, so it counts that runtime again for every component after the first.
- **Added** is what this component costs a page that already has the runtime. It excludes what is shared, so it flatters the first component you install.

Neither is the real number. The pair brackets it.

## The floor

Lit and \`@helix-io/core\`, which is what every element needs and no element
owns. **Added** is measured against this.

**It is larger than most single components below, and that is not a mistake.**
The floor re-exports the whole of \`@helix-io/core\` so that it is the same size
under every family. A family that reaches only part of core shakes the rest
out and comes in smaller than the floor, which is the tree-shaking working:
nobody ever downloads this floor on its own.

| | Raw | Gzip | Brotli |
|---|---|---|---|
| Lit and \`@helix-io/core\` | 124,894 | 41,536 | 35,743 |

## Whole packages

Everything a package exports, retained. This is the ceiling rather than a
typical page: \`@helix-io/web\` and \`@helix-io/headless\` are side-effectful, so
a barrel import of either really does cost the whole row, and nothing in this
repository does that. The per-component tables are what a page pays.

| Package | Raw | Gzip | Brotli | |
|---|---|---|---|---|
| \`@helix-io/core\` | 124,448 | 41,103 | 35,561 | Element base class, mixins, decorators, floating positioning. |
| \`@helix-io/headless\` | 440,452 | 112,913 | 89,222 | Every headless family, which is what the barrel means. |
| \`@helix-io/icons\` | 45,442 | 14,544 | 12,328 | The whole glyph set. |
| \`@helix-io/theme\` | 3,274 | 1,567 | 1,349 | The derivation engine. Build time for most consumers, runtime for a theme switcher. |
| \`@helix-io/web\` | 1,494,067 | 426,078 | 299,814 | Every styled family. |
| \`lit\` | 15,394 | 6,118 | 5,460 | Not ours. Here so it can be subtracted from every row above it. |

## The stylesheets

Linked rather than bundled, so these are the files as shipped and a consumer
minifies them or does not. \`@helix-io/styles\` has no JavaScript at all, which
is why it is the whole cost of adopting the base layer on its own.

| File | Raw | Gzip | Brotli | |
|---|---|---|---|---|
| \`base.css\` | 76,605 | 23,845 | 20,570 | The base layer. Recipes for markup Helix does not render, usable with no JavaScript at all. |
| \`elements.css\` | 7,884 | 1,823 | 1,547 | The components' own layer, generated from every family's stylesheet. |
| \`primitives.css\` | 32,648 | 11,331 | 9,635 | The primitive layer. Private, shipped because \`tokens.css\` resolves into it. |
| \`tokens.css\` | 64,385 | 19,404 | 16,131 | The 177 semantic tokens. Nothing paints without this. |

## What the numbers say

**Most of a first component is the runtime under it.** The median styled family is 18,915 bytes gzipped alone and adds 6,169 to a page that already has Helix on it, so 67 percent of the first one is shared and 33 percent is the component. Ten typical components are one plus nine additions rather than ten of the first number, and the pair of columns below is what lets that be worked out rather than guessed.

Across the tier: the cheapest is \`quote\` at 8,705 gzipped alone, the dearest \`color-input\` at 63,228, over 88 components. Every family at once is 426,078.

**No family imports a barrel, and \`check:barrels\` is what keeps it that way.** \`@helix-io/headless\` is \`sideEffects\` over every module in \`dist\`, which is true of a file that calls \`customElements.define\` and which means a bundler may drop none of it: one \`import { HelixBaseButton } from '@helix-io/headless'\` costs 112,913 bytes gzipped whatever else the page does, which is 6 times the median family measured above. The styled tier imports the family it extends instead, all 88 of them, and the check refuses the shape rather than the package name, so the rule follows \`sideEffects\` wherever it goes.

The headless tier never had the problem, and it is the control: \`@helix-io/core\` is \`sideEffects: false\`, and a headless family is a median of 11,624 bytes gzipped alone.

## Against other systems

Four other libraries of custom elements, pinned and measured on 2026-08-23 by \`bun run metrics:peers\`, which installs them into \`.local\` and bundles them through the harness that produced everything above. **Helix's own rows are measured on every run of \`bun run metrics\`**, so the column that could go stale against this repository is the one that cannot.

**Every system here is built on Lit**, so the runtime under the comparison is the same library in every column and what is left is the components. A React component library is not in the table, because comparing a custom element with a React component measures the framework.

**There is no whole-library row**, deliberately. It would compare how many components each vendor decided to ship, and how each one counts a component, which is the number that looks most like a measurement and means least. Five components every one of these has is the comparison.

| Component | System | Raw | Gzip | Brotli |
|---|---|---|---|---|
| \`button\` | **Helix** | 41,802 | 14,193 | 12,409 |
| | Carbon | 133,058 | 20,959 | 17,685 |
| | Material Web | 47,060 | 14,173 | 12,591 |
| | Shoelace | 62,628 | 18,287 | 15,805 |
| | Spectrum | 98,792 | 22,045 | 18,674 |
| \`checkbox\` | **Helix** | 53,484 | 17,788 | 15,521 |
| | Carbon | 60,255 | 15,609 | 13,550 |
| | Material Web | 43,785 | 13,556 | 12,015 |
| | Shoelace | 47,614 | 15,177 | 13,301 |
| | Spectrum | 62,492 | 15,437 | 13,481 |
| \`dialog\` | **Helix** | 44,823 | 15,829 | 13,815 |
| | Carbon | 510,866 | 67,390 | 39,189 |
| | Material Web | 34,238 | 11,510 | 10,229 |
| | Shoelace | 52,754 | 17,698 | 15,554 |
| | Spectrum | 155,708 | 31,899 | 26,262 |
| \`tabs\` | **Helix** | 49,242 | 16,273 | 14,253 |
| | Carbon | 578,766 | 73,537 | 43,235 |
| | Material Web | 38,883 | 12,820 | 11,368 |
| | Shoelace | 54,573 | 17,140 | 15,068 |
| | Spectrum | 64,875 | 18,298 | 16,283 |
| \`tooltip\` | **Helix** | 63,518 | 22,618 | 19,957 |
| | Carbon | 189,382 | 30,354 | 22,273 |
| | Material Web | | not shipped | |
| | Shoelace | 57,412 | 20,220 | 17,933 |
| | Spectrum | 136,599 | 40,552 | 35,286 |

**Where Helix loses**, which is the half of a comparison table worth reading: \`button\`, \`checkbox\`, \`dialog\`, \`tabs\`, \`tooltip\`. The largest gap is dialog against Material Web, by 4,319 bytes gzipped. 8 of 20 peer measurements come in under ours.

- **Carbon** \`@carbon/web-components@2.61.0\`. Its dialog is called Modal.
- **Material Web** \`@material/web@2.5.0\`. Ships no tooltip. Its button is measured as the filled one, there being no single button element.
- **Shoelace** \`@shoelace-style/shoelace@2.20.1\`. Its tabs element is Tab Group.
- **Spectrum** \`@spectrum-web-components/button@1.12.2\`. One package per component, so there is no barrel to import by accident.

Every specifier measured is in [\`peers.json\`](https://github.com/former-org/former-repo/blob/main/helix/docs/peers.json), so a disagreement with these numbers is a thing that can be run rather than argued.

## Per component

Alphabetical, so this is a lookup table. Bytes, not kilobytes, because a
rounded number in a generated table is a number somebody has to un-round
before they can check it.

### Headless tier

Structure, accessibility, state and form participation. No presentation, and no stylesheet to load beside it.

| Family | Alone raw | Alone gzip | Alone brotli | Added raw | Added gzip | Added brotli |
|---|---|---|---|---|---|---|
| \`accordion\` | 72,391 | 24,753 | 20,515 | 2,994 | 1,270 | 671 |
| \`announcement\` | 69,815 | 23,860 | 19,854 | 1,370 | 741 | 268 |
| \`app-header\` | 23,746 | 8,420 | 7,498 | 1,212 | 643 | 226 |
| \`avatar\` | 25,212 | 8,916 | 7,940 | 2,633 | 1,177 | 689 |
| \`badge\` | 23,277 | 8,361 | 7,424 | 1,116 | 629 | 245 |
| \`bar-chart\` | 67,561 | 23,527 | 20,818 | 11,977 | 4,206 | 2,954 |
| \`blockquote\` | 23,197 | 8,343 | 7,420 | 913 | 548 | 174 |
| \`breadcrumbs\` | 69,423 | 23,467 | 19,721 | 1,939 | 780 | 419 |
| \`button\` | 25,894 | 9,094 | 8,070 | 1,813 | 874 | 386 |
| \`button-group\` | 23,135 | 8,273 | 7,367 | 601 | 407 | 107 |
| \`callout\` | 68,566 | 23,349 | 19,630 | 908 | 555 | 236 |
| \`card\` | 23,224 | 8,299 | 7,376 | 690 | 438 | 163 |
| \`carousel\` | 75,192 | 25,569 | 21,392 | 6,753 | 2,403 | 1,494 |
| \`checkbox\` | 30,787 | 10,223 | 9,058 | 2,130 | 1,074 | 461 |
| \`checkbox-group\` | 33,248 | 10,831 | 9,612 | 4,093 | 1,649 | 824 |
| \`code\` | 21,809 | 7,871 | 6,983 | 447 | 317 | 146 |
| \`code-block\` | 105,673 | 36,041 | 30,568 | 10,719 | 3,314 | 2,175 |
| \`color-input\` | 121,877 | 40,544 | 34,323 | 22,509 | 6,635 | 5,104 |
| \`color-picker\` | 92,945 | 30,825 | 25,587 | 17,128 | 5,398 | 4,076 |
| \`combobox\` | 119,323 | 39,297 | 33,152 | 18,883 | 5,399 | 3,921 |
| \`command\` | 93,157 | 30,204 | 24,961 | 15,585 | 4,581 | 3,255 |
| \`copy-button\` | 104,492 | 35,800 | 30,259 | 9,538 | 3,050 | 1,965 |
| \`date-input\` | 115,032 | 38,374 | 32,498 | 17,129 | 5,219 | 3,823 |
| \`date-picker\` | 79,545 | 26,889 | 22,362 | 8,727 | 3,121 | 2,071 |
| \`dialog\` | 26,927 | 9,431 | 8,361 | 1,959 | 965 | 438 |
| \`divider\` | 23,394 | 8,419 | 7,457 | 1,111 | 635 | 207 |
| \`donut-chart\` | 62,604 | 21,785 | 19,328 | 8,374 | 3,138 | 2,024 |
| \`drawer\` | 26,175 | 9,219 | 8,117 | 1,499 | 753 | 356 |
| \`drilldown\` | 74,972 | 25,517 | 21,022 | 5,006 | 1,896 | 1,051 |
| \`empty\` | 23,346 | 8,341 | 7,436 | 812 | 501 | 193 |
| \`file-input\` | 78,256 | 26,450 | 21,811 | 5,771 | 2,262 | 1,366 |
| \`icon\` | 67,972 | 23,072 | 19,317 | 846 | 509 | 145 |
| \`icon-button\` | 26,289 | 9,125 | 8,085 | 2,207 | 896 | 405 |
| \`image\` | 24,494 | 8,662 | 7,669 | 2,284 | 971 | 494 |
| \`input\` | 78,457 | 26,512 | 21,873 | 4,268 | 1,748 | 1,019 |
| \`kbd\` | 21,805 | 7,873 | 7,007 | 443 | 320 | 64 |
| \`legend\` | 25,453 | 9,147 | 8,098 | 1,093 | 649 | 285 |
| \`line-chart\` | 64,744 | 22,653 | 20,136 | 9,163 | 3,354 | 2,138 |
| \`list\` | 24,153 | 8,461 | 7,534 | 1,629 | 620 | 255 |
| \`listbox\` | 86,086 | 28,722 | 23,676 | 10,033 | 3,406 | 2,228 |
| \`loader\` | 23,430 | 8,405 | 7,467 | 896 | 532 | 192 |
| \`megamenu\` | 51,798 | 18,449 | 16,385 | 4,975 | 1,904 | 1,058 |
| \`menu\` | 104,005 | 35,586 | 30,293 | 7,944 | 2,489 | 1,654 |
| \`meter\` | 26,322 | 9,198 | 8,178 | 3,797 | 1,420 | 898 |
| \`navigation\` | 25,179 | 8,932 | 7,915 | 1,578 | 785 | 315 |
| \`number-input\` | 80,842 | 27,075 | 22,493 | 6,823 | 2,414 | 1,427 |
| \`option\` | 24,712 | 8,611 | 7,670 | 2,188 | 818 | 439 |
| \`outline\` | 28,202 | 9,937 | 8,816 | 4,552 | 1,951 | 1,120 |
| \`pagination\` | 125,034 | 40,457 | 34,106 | 25,302 | 6,625 | 4,901 |
| \`pin-input\` | 32,964 | 10,914 | 9,674 | 4,390 | 1,820 | 1,085 |
| \`popover\` | 48,940 | 17,704 | 15,755 | 1,871 | 897 | 402 |
| \`progress\` | 24,471 | 8,676 | 7,731 | 1,947 | 862 | 466 |
| \`qr-code\` | 34,945 | 12,666 | 11,251 | 12,804 | 5,076 | 4,091 |
| \`quote\` | 22,713 | 8,155 | 7,262 | 548 | 404 | 64 |
| \`radio\` | 33,068 | 10,876 | 9,638 | 2,944 | 1,203 | 599 |
| \`rating\` | 35,059 | 11,624 | 10,307 | 5,442 | 2,168 | 1,287 |
| \`scroll-area\` | 24,821 | 8,867 | 7,843 | 2,607 | 1,256 | 688 |
| \`select\` | 113,789 | 38,060 | 32,116 | 14,178 | 4,323 | 2,904 |
| \`skeleton\` | 21,902 | 7,904 | 7,017 | 540 | 376 | 53 |
| \`slider\` | 33,655 | 11,047 | 9,811 | 4,833 | 1,861 | 1,121 |
| \`sparkline\` | 27,911 | 10,175 | 9,012 | 2,527 | 1,199 | 665 |
| \`speed-dial\` | 96,844 | 33,616 | 28,606 | 3,894 | 1,453 | 850 |
| \`splitter\` | 32,955 | 10,847 | 9,591 | 9,621 | 2,805 | 1,938 |
| \`stat\` | 23,674 | 8,334 | 7,413 | 1,143 | 484 | 109 |
| \`steps\` | 76,458 | 25,812 | 21,392 | 4,860 | 1,628 | 1,011 |
| \`switch\` | 30,446 | 10,161 | 8,992 | 1,666 | 904 | 463 |
| \`table\` | 27,254 | 9,141 | 8,115 | 3,435 | 1,122 | 579 |
| \`tabs\` | 31,163 | 10,497 | 9,300 | 4,332 | 1,407 | 770 |
| \`tag\` | 68,850 | 23,462 | 19,523 | 893 | 524 | 162 |
| \`textarea\` | 31,981 | 10,567 | 9,353 | 2,921 | 1,275 | 638 |
| \`time-input\` | 124,708 | 40,934 | 34,736 | 24,276 | 6,989 | 5,283 |
| \`time-picker\` | 91,684 | 30,406 | 25,185 | 15,643 | 5,066 | 3,620 |
| \`timeline\` | 69,346 | 23,441 | 19,711 | 1,857 | 744 | 326 |
| \`toast\` | 73,614 | 24,998 | 20,800 | 4,228 | 1,431 | 788 |
| \`toggle\` | 35,290 | 11,532 | 10,252 | 3,735 | 1,410 | 756 |
| \`toolbar\` | 25,092 | 8,951 | 7,934 | 2,928 | 1,409 | 706 |
| \`tooltip\` | 52,821 | 18,766 | 16,714 | 5,685 | 2,178 | 1,290 |
| \`tour\` | 56,693 | 19,609 | 17,449 | 9,042 | 2,787 | 1,860 |
| \`tree\` | 79,836 | 26,909 | 22,238 | 7,057 | 2,505 | 1,560 |
| \`trend\` | 68,175 | 23,179 | 19,534 | 1,052 | 590 | 260 |
| \`video\` | 124,246 | 40,740 | 34,658 | 27,932 | 7,379 | 5,830 |
| \`video-playlist\` | 111,384 | 37,210 | 31,642 | 13,713 | 3,761 | 2,695 |
| \`virtual-list\` | 26,072 | 9,371 | 8,297 | 2,086 | 1,098 | 517 |

### Styled tier

The headless tier plus presentation. This is what \`bun add @helix-io/web\` gives you.

| Family | Alone raw | Alone gzip | Alone brotli | Added raw | Added gzip | Added brotli |
|---|---|---|---|---|---|---|
| \`accordion\` | 83,759 | 28,911 | 23,981 | 14,347 | 5,482 | 4,099 |
| \`announcement\` | 79,773 | 27,419 | 22,941 | 11,312 | 4,342 | 3,306 |
| \`app-header\` | 33,387 | 11,910 | 10,395 | 10,838 | 4,254 | 3,171 |
| \`aura\` | 89,746 | 31,958 | 27,660 | 66,419 | 23,551 | 20,214 |
| \`avatar\` | 32,666 | 11,402 | 9,984 | 10,077 | 3,743 | 2,737 |
| \`badge\` | 30,645 | 11,130 | 9,709 | 8,467 | 3,529 | 2,591 |
| \`bar-chart\` | 111,275 | 36,986 | 32,327 | 55,673 | 17,735 | 14,480 |
| \`blockquote\` | 26,828 | 9,785 | 8,610 | 4,528 | 2,138 | 1,376 |
| \`breadcrumbs\` | 79,158 | 27,123 | 22,749 | 11,659 | 4,488 | 3,460 |
| \`button\` | 41,802 | 14,193 | 12,409 | 17,702 | 6,087 | 4,772 |
| \`button-group\` | 26,306 | 9,530 | 8,390 | 3,755 | 1,814 | 1,179 |
| \`callout\` | 73,396 | 25,185 | 21,134 | 5,722 | 2,452 | 1,775 |
| \`card\` | 32,446 | 11,806 | 10,314 | 9,900 | 4,071 | 3,127 |
| \`carousel\` | 99,243 | 33,114 | 27,936 | 30,793 | 9,869 | 8,032 |
| \`checkbox\` | 53,484 | 17,788 | 15,521 | 24,811 | 8,689 | 7,005 |
| \`checkbox-group\` | 43,038 | 14,482 | 12,650 | 13,869 | 5,368 | 3,909 |
| \`code\` | 27,494 | 10,200 | 8,960 | 6,115 | 2,812 | 2,029 |
| \`code-block\` | 139,064 | 45,928 | 39,014 | 44,092 | 12,914 | 10,635 |
| \`color-input\` | 205,959 | 63,228 | 53,819 | 106,571 | 29,269 | 24,597 |
| \`color-picker\` | 165,842 | 51,271 | 42,946 | 90,010 | 25,571 | 21,437 |
| \`combobox\` | 160,835 | 51,901 | 44,140 | 60,378 | 17,803 | 14,852 |
| \`command\` | 131,429 | 42,435 | 35,728 | 53,842 | 16,582 | 13,841 |
| \`copy-button\` | 131,922 | 44,012 | 37,350 | 36,950 | 11,022 | 8,971 |
| \`date-input\` | 160,868 | 52,810 | 45,011 | 62,944 | 19,432 | 16,447 |
| \`date-picker\` | 94,122 | 31,861 | 26,544 | 23,286 | 7,983 | 6,337 |
| \`dialog\` | 44,823 | 15,829 | 13,815 | 19,840 | 7,458 | 6,032 |
| \`divider\` | 28,731 | 10,412 | 9,109 | 6,431 | 2,782 | 1,926 |
| \`donut-chart\` | 98,481 | 33,048 | 29,008 | 44,233 | 14,473 | 11,736 |
| \`drawer\` | 42,964 | 15,296 | 13,319 | 18,271 | 6,948 | 5,587 |
| \`drilldown\` | 83,982 | 28,548 | 23,713 | 14,003 | 4,940 | 3,620 |
| \`empty\` | 25,738 | 9,252 | 8,176 | 3,188 | 1,514 | 918 |
| \`file-input\` | 115,204 | 38,491 | 32,373 | 42,714 | 14,129 | 11,757 |
| \`flex\` | 26,056 | 9,442 | 8,271 | 3,882 | 1,798 | 1,127 |
| \`grid\` | 28,439 | 10,417 | 9,146 | 6,262 | 2,887 | 1,986 |
| \`icon\` | 69,047 | 23,489 | 19,656 | 1,904 | 935 | 444 |
| \`icon-button\` | 39,930 | 13,312 | 11,609 | 15,834 | 5,189 | 3,959 |
| \`image\` | 29,559 | 10,563 | 9,257 | 7,331 | 3,017 | 2,126 |
| \`input\` | 98,339 | 33,023 | 27,511 | 24,143 | 8,216 | 6,579 |
| \`kbd\` | 26,487 | 9,783 | 8,602 | 5,108 | 2,338 | 1,665 |
| \`legend\` | 35,782 | 12,528 | 10,917 | 11,415 | 4,190 | 3,164 |
| \`line-chart\` | 95,162 | 31,992 | 28,041 | 39,561 | 12,781 | 10,118 |
| \`list\` | 33,308 | 11,867 | 10,424 | 10,769 | 4,123 | 3,186 |
| \`listbox\` | 100,225 | 33,592 | 27,767 | 24,156 | 8,119 | 6,265 |
| \`loader\` | 33,654 | 12,095 | 10,592 | 11,105 | 4,332 | 3,373 |
| \`megamenu\` | 72,684 | 25,787 | 22,825 | 25,846 | 9,272 | 7,475 |
| \`menu\` | 123,506 | 42,155 | 35,671 | 27,425 | 8,835 | 7,144 |
| \`meter\` | 41,123 | 14,126 | 12,343 | 18,580 | 6,429 | 5,163 |
| \`navigation\` | 27,422 | 9,734 | 8,576 | 3,805 | 1,640 | 993 |
| \`number-input\` | 97,384 | 32,834 | 27,270 | 23,351 | 8,095 | 6,442 |
| \`option\` | 33,839 | 12,098 | 10,567 | 11,299 | 4,386 | 3,236 |
| \`outline\` | 39,658 | 13,771 | 12,060 | 15,991 | 5,809 | 4,362 |
| \`pagination\` | 175,691 | 55,059 | 46,888 | 75,939 | 21,134 | 17,669 |
| \`pin-input\` | 44,773 | 15,175 | 13,260 | 16,180 | 6,147 | 4,799 |
| \`popover\` | 58,655 | 21,224 | 18,733 | 11,568 | 4,600 | 3,507 |
| \`progress\` | 41,891 | 14,814 | 12,941 | 19,349 | 7,071 | 5,770 |
| \`qr-code\` | 39,580 | 14,463 | 12,674 | 17,422 | 6,831 | 5,561 |
| \`quote\` | 24,133 | 8,705 | 7,710 | 1,952 | 1,025 | 556 |
| \`radio\` | 57,332 | 18,660 | 16,278 | 27,201 | 9,038 | 7,369 |
| \`rating\` | 42,852 | 14,602 | 12,854 | 13,217 | 5,165 | 3,936 |
| \`sandbox\` | 78,365 | 24,014 | 20,911 | 54,986 | 15,972 | 13,295 |
| \`scroll-area\` | 30,387 | 10,571 | 9,246 | 8,156 | 3,082 | 2,132 |
| \`select\` | 151,663 | 49,486 | 41,936 | 52,032 | 15,469 | 12,830 |
| \`skeleton\` | 26,413 | 9,559 | 8,432 | 4,231 | 1,912 | 1,291 |
| \`slider\` | 67,635 | 21,245 | 18,436 | 38,796 | 12,040 | 9,758 |
| \`sparkline\` | 44,568 | 16,300 | 14,269 | 19,172 | 7,329 | 6,030 |
| \`speed-dial\` | 112,369 | 38,517 | 32,605 | 19,397 | 6,191 | 4,769 |
| \`splitter\` | 51,659 | 16,693 | 14,668 | 28,307 | 8,639 | 7,120 |
| \`stat\` | 31,428 | 11,207 | 9,856 | 8,884 | 3,505 | 2,663 |
| \`steps\` | 108,871 | 35,338 | 29,619 | 37,258 | 11,123 | 9,144 |
| \`switch\` | 45,752 | 15,359 | 13,454 | 16,957 | 6,212 | 4,899 |
| \`table\` | 36,058 | 12,000 | 10,504 | 12,229 | 4,077 | 2,949 |
| \`tabs\` | 49,242 | 16,273 | 14,253 | 22,398 | 7,246 | 5,768 |
| \`tag\` | 81,482 | 28,391 | 23,613 | 13,510 | 5,499 | 4,270 |
| \`text\` | 28,678 | 9,978 | 8,756 | 6,505 | 2,376 | 1,609 |
| \`textarea\` | 43,851 | 14,670 | 12,796 | 14,772 | 5,483 | 4,171 |
| \`time-input\` | 188,266 | 59,517 | 50,811 | 87,810 | 25,621 | 21,668 |
| \`time-picker\` | 131,209 | 42,619 | 35,752 | 55,158 | 17,092 | 14,200 |
| \`timeline\` | 78,226 | 26,604 | 22,314 | 10,723 | 3,948 | 3,023 |
| \`toast\` | 99,010 | 33,454 | 27,993 | 29,608 | 9,861 | 8,046 |
| \`toggle\` | 57,053 | 19,169 | 16,728 | 25,490 | 9,075 | 7,356 |
| \`toolbar\` | 27,049 | 9,729 | 8,569 | 4,868 | 2,285 | 1,337 |
| \`tooltip\` | 63,518 | 22,618 | 19,957 | 16,364 | 5,989 | 4,575 |
| \`tour\` | 80,214 | 26,483 | 23,369 | 32,551 | 9,674 | 7,729 |
| \`tree\` | 99,772 | 33,853 | 28,240 | 26,979 | 9,353 | 7,603 |
| \`trend\` | 74,832 | 25,513 | 21,417 | 7,700 | 2,966 | 2,069 |
| \`video\` | 176,586 | 56,323 | 48,242 | 80,251 | 22,932 | 19,498 |
| \`video-playlist\` | 145,039 | 47,456 | 40,353 | 47,349 | 13,686 | 11,305 |
| \`virtual-list\` | 28,777 | 10,508 | 9,203 | 4,774 | 2,342 | 1,537 |

## What lands in \`node_modules\`

A different question from what reaches a browser, and the one an install
budget is written against. Unpacked bytes of exactly what each package
publishes, which is its \`files\` field. Source maps are counted separately
because they ship and no page downloads them.

| Package | Unpacked | Files | Of which source maps | Runtime dependencies |
|---|---|---|---|---|
| \`@helix-io/core\` | 916,630 | 205 | 139,228 | \`@floating-ui/dom\`, \`@helix-io/icons\` |
| \`@helix-io/headless\` | 7,843,263 | 776 | 613,969 | \`@helix-io/core\`, \`@helix-io/icons\`, \`uqr\` |
| \`@helix-io/icons\` | 84,047 | 17 | 19,847 | none |
| \`@helix-io/styles\` | 268,379 | 5 | 0 | none |
| \`@helix-io/theme\` | 612,715 | 28 | 47,856 | none |
| \`@helix-io/web\` | 8,247,442 | 1,345 | 272,406 | \`@helix-io/core\`, \`@helix-io/headless\`, \`@helix-io/styles\` |

## Not measured yet

Named rather than left out, because a metrics page is read for what it does
not say as much as for what it does.

- **No whole-library comparison, and no fifth component.** The comparison above is five components against four systems. Widening it means naming the equivalent element in each system by hand, which is where a comparison table starts arguing, so each addition is a deliberate one rather than a sweep.
- **The peer numbers are pinned, so they age.** They are dated in the section above and refreshed by running \`bun run metrics:peers\`. Nothing fails when they are old, because nothing in this repository changes when somebody else releases, and a check that fired on the calendar would be noise.
- **No load or rendering timings.** First paint, time to upgrade, and the cost of hydrating a server-rendered tree. These need a browser harness rather than a bundler, and they never join a cross-system table.
- **No per-component stylesheet bytes.** There are none to report: a family's CSS is compiled into its JavaScript, so it is already inside every number above. \`elements.css\` is the light-DOM layer and is in the stylesheet table.
`,
  motion: `---
description: Four durations, five curves, and the rule every animating component has to answer.
section: Foundations
title: Motion
---

# Motion

## The tokens

[//]: # (tokens:duration)

| Token | Value |
| --- | --- |
| \`--helix-duration-instant\` | \`0ms\` |
| \`--helix-duration-fast\` | \`120ms\` |
| \`--helix-duration-normal\` | \`200ms\` |
| \`--helix-duration-slow\` | \`320ms\` |

[//]: # (/tokens)

[//]: # (tokens:easing)

| Token | Value |
| --- | --- |
| \`--helix-easing-standard\` | \`cubic-bezier(0.2, 0, 0, 1)\` |
| \`--helix-easing-emphasized\` | \`cubic-bezier(0.3, 0, 0, 1.2)\` |
| \`--helix-easing-decelerate\` | \`cubic-bezier(0, 0, 0, 1)\` |
| \`--helix-easing-accelerate\` | \`cubic-bezier(0.3, 0, 1, 1)\` |
| \`--helix-easing-spring\` | \`linear(0, 0.006, 0.025, 0.101, 0.539, 0.826, 0.976, 1.037, 1.043, 1.026, 1.006, 0.997, 1)\` |

[//]: # (/tokens)

Four durations and five curves. \`standard\` for most things, \`decelerate\` for
something arriving, \`accelerate\` for something leaving, \`emphasized\` for a
movement the reader is meant to follow, and \`spring\` for the few places
overshoot reads as responsive rather than as a bug.

The theme engine takes a \`motion\` intent input, so a product can be uniformly
quicker or slower without every component being retuned.

## Reduced motion is per component

The base layer has a global rule capping animation and transition duration for a
reader who asked not to be moved. **It does not reach a single component.**

\`\`\`css
*, *::before, *::after { … }
\`\`\`

\`*\` does not cross a shadow boundary. So that rule reaches your prose, your
layout and the base layer's own recipes, and none of the ninety-odd components
that draw inside a shadow root. Each one answers \`prefers-reduced-motion\` in its
own stylesheet, fifty-nine of them do because fifty-nine of them animate, and a
component that animates without one fails the build.

**The same is true of yours.** If you write a component with a shadow root, the
global rule will not cover it either. That is not a Helix behavior, it is how
\`*\` works, and it is the single easiest accessibility regression to ship without
noticing.

\`\`\`css
@media (prefers-reduced-motion: reduce) {
  :host {
    animation: none;
    transition: none;
  }
}
\`\`\`

## What reduced motion means here

Not "no movement". A transition that communicates a relationship, like a panel
sliding out of the control that opened it, is doing work; a decorative float is
not. The library's own policy is to remove the second and shorten the first to
the point where it is instant but not jarring.

The one place this is absolute is anything that moves continuously without
input: the aura shader, marquees, and looping loaders all stop rather than speed
up.

## Two things that are not motion tokens

**\`@starting-style\`** is how overlays animate in, and it needs no duration token
of its own: it is a starting value, and the transition that runs from it uses
the tokens above.

**View transitions** are not used anywhere in the library. A component cannot
own a view transition, because the transition is between two states of the
document rather than of the component, so if you want them that is yours to
drive.
`,
  'other-frameworks': `---
description: The three rules every framework reduces to, and what they look like in each.
parent: installation
section: Getting started
title: Other frameworks
trailing: true
---

# Other frameworks

Solid, Qwik, Lit, Ember, Alpine, htmx, and anything else that puts elements in a
document. All of them need the same three rules, and nothing beyond them.

## The three rules

**Strings go through attributes. Everything else goes through properties.** An
attribute is a string, so an array, an object or a function has to be assigned
to the element rather than written in the markup. Most frameworks do this for
you when the element has a matching property.

\`\`\`js
element.items = tabs
\`\`\`

**Events bind with \`addEventListener\`, and the name is the event's own.** Helix
events are \`helix-open\`, \`helix-change\`, \`helix-input\` and so on: lowercase,
hyphenated, no camel-case variant. Whatever your framework's \`on*\` syntax is, it
should end up passing that string through.

\`\`\`js
element.addEventListener('helix-change', (event) => console.log(event.detail))
\`\`\`

**A declared \`value\`, \`open\`, \`checked\` or \`active\` is a claim of ownership.**
The element announces the change and applies none of it, and waits to be told.
Use \`default-value\`, \`default-open\` and their siblings for a control that owns
its own state. This is the rule most likely to look like a bug, and
[State and control](./state-and-control) is the page about it.

## What each one needs

| Framework | Notes |
|---|---|
| Solid | Sets properties on custom elements by default. Use \`prop:\` to force one and \`attr:\` to force the other. \`on:helix-change\` binds the literal name |
| Qwik | Works as JSX. Bind with \`document:on…\` or a ref, since a plain \`on*\` prop is normalized |
| Lit | \`.prop=\`, \`?bool=\` and \`@helix-change=\` are already the right three channels |
| Ember | Angle-bracket invocation passes attributes only, so set properties from a modifier |
| Alpine, htmx | Markup and attributes only, which reaches every uncontrolled component. A controlled one needs script |

Nothing here is tested by us, which is the honest reason it is one page. If your
framework needs something the three rules above do not cover, that is worth
telling us: it is either a gap in this page or a gap in the library.

## Typings

\`@helix-io/web/jsx\` is the base for anything JSX-shaped, and Svelte's own
typings are built from it. If your framework needs a different shape, the
manifest ships as \`@helix-io/web/custom-elements.json\` and describes every tag,
prop, event and part, which is what all of ours are generated from.

## Registration

\`\`\`ts
import '@helix-io/web'
\`\`\`

Once, anywhere that runs in the browser. See [Installation](./installation) for
the stylesheets, which are the same in every framework and are the thing most
often left out.
`,
  overlays: `---
description: The top layer, what dismisses what, and where focus goes.
section: Essentials
title: Overlays and layering
---

# Overlays and layering

\`Dialog\`, \`Drawer\`, \`Popover\`, \`Menu\`, \`Select\`, \`Combobox\`, \`Tooltip\`,
\`Megamenu\`, \`Speed Dial\`, \`Command\` and \`Tour\` are all overlays, and they all
work the same way underneath. Knowing that way saves you from most of the
problems overlays cause.

## They render in the top layer

Every one uses the popover API, so the browser draws it in the top layer: above
everything, regardless of \`z-index\`, \`overflow: hidden\`, \`transform\` or a
stacking context somewhere up the tree.

**This is the fix for the oldest bug in the category.** A menu inside a
scrolling panel does not get clipped. A tooltip inside a \`transform\`ed card does
not get trapped in its stacking context. There is no portal to configure and no
\`appendTo\` to pass, because the platform is doing it.

The consequence for your CSS: **do not try to raise an overlay with \`z-index\`.**
It has no effect on a top-layer element, and reaching for it means something
else is wrong.

## Positioning is JavaScript

Placement uses \`@floating-ui/dom\` rather than CSS anchor positioning: flip when
there is no room below, shift to stay on screen, size to the available space.
Anchor positioning would be the platform answer and is not yet available
everywhere the rest of the library's requirements are. See [Browser
support](./browser-support).

That means an overlay's position is recomputed while it is open, on scroll and
resize, and stops when it closes.

## Dismissal

Light dismiss is the platform's: click outside, or press \`Escape\`. What Helix
adds is making that correct across shadow boundaries.

**\`document.activeElement\` stops at the outermost host.** Focus inside a shadow
tree is reported as the element containing that tree, so a naive "is focus still
inside me" check never matches and closes the overlay the moment anything inside
it is focused. Every dismissal path here walks through the roots instead.

**Nesting works because lifecycle events do not bubble.** \`helix-open\` and
\`helix-close\` are neither bubbling nor composed, so a menu closing inside a
dialog is not the dialog closing. \`Escape\` closes the innermost overlay and
leaves the rest.

## Focus

A modal overlay traps \`Tab\` inside itself while open and returns focus to
whatever opened it. \`Dialog\` and \`Drawer\` do this; \`Popover\` does it in its
modal mode and not otherwise.

**A tooltip never takes focus**, which is the one to remember: it is
described-by rather than interactive, so it cannot contain a button. If you want
something with a button in it, that is a \`Popover\`.

## Refusing to close

The close is announced before it happens:

\`\`\`ts
dialog.addEventListener('helix-close', (event) => {
  if (unsaved) {
    event.preventDefault()
  }
})
\`\`\`

That covers \`Escape\`, the backdrop click and the close button together, because
all three go through the same request. See [State and
control](./state-and-control).

## Entry and exit animation

Overlays animate in with \`@starting-style\` and out with a transition on the
\`overlay\` and \`display\` properties, which is what allows an exit animation on an
element the browser is about to remove from the top layer. Every one answers
\`prefers-reduced-motion\`.

## Which one to reach for

| | |
|---|---|
| \`Dialog\` | A task that blocks the page |
| \`Drawer\` | The same, from an edge, usually larger |
| \`Popover\` | A surface anchored to a control, possibly interactive |
| \`Tooltip\` | A description of a control. Never interactive |
| \`Menu\` | A list of commands |
| \`Select\`, \`Combobox\` | A value chosen from a list, in a form |
| \`Command\` | A palette over the whole application |
| \`Megamenu\` | Navigation, anchored to a header |

A \`Dialog\` used for a tooltip's job traps focus for no reason. A \`Tooltip\` used
for a popover's job silently drops the button you put in it.
`,
  'overriding-a-component': `---
description: The three ways in past a shadow root, and which one to reach for.
section: Theming
title: Overriding a component
---

# Overriding a component

Every Helix component draws inside a shadow root, so your stylesheet cannot
reach in. That is the point: a rule you write can never accidentally break a
component's internals, and a component can be rewritten without breaking your
page.

Three doors are open, and they are in the order you should try them.

## 1. Tokens

\`\`\`css
:root {
  --helix-radii-md: 2px;
}
\`\`\`

If every card, dialog and button should be squarer, that is a token change and
you are done. Tokens cross shadow boundaries on their own, because custom
properties inherit, so one declaration reaches every component at once.

Reach for this first. Most requests that arrive as "can I restyle the button"
are really "our brand has less rounding than yours", and the token is both the
smaller change and the one that stays consistent.

See [Tokens](./tokens) and [Deriving a theme](./theming).

## 2. Per-component hooks

\`\`\`css
helix-card {
  --card-padding: var(--helix-space-lg);
}

helix-accordion {
  --accordion-border-color: var(--helix-color-border);
}
\`\`\`

A hook is a custom property a component publishes and reads. It defaults to a
semantic token, so leaving it alone gets you the themed value, and setting it
changes that component and nothing else.

**They are API, not tokens**, and the distinction is enforced. A hook is named
after the component (\`--card-padding\`, \`--drawer-radii\`) and a token is named
\`--helix-*\`. Every documented hook is held to a rule that actually reads it, in
both directions: declared and never read is a promise with nothing behind it,
and read and never declared is a working feature nobody is told about. Three of
\`Button\`'s four hooks were inert for a refactor's worth of time while the
reference went on listing them, which is how that check came
to exist.

Each component's page lists its hooks under Custom properties.

## 3. Parts

\`\`\`css
helix-select::part(trigger) {
  font-variant-numeric: tabular-nums;
}

helix-dialog::part(panel) {
  max-inline-size: 40rem;
}
\`\`\`

\`::part()\` reaches a named element inside the shadow root and lets you write any
declaration you like on it. It is the most powerful door and the one to try
last, because it is the one that couples your stylesheet to a component's
internal structure.

**A published part is a promise**, held both ways:
a documented part that nothing renders, and a rendered part nobody was told
about. The second is the worse of the two, because a \`::part()\` that resolves to
nothing is valid CSS that matches nothing and reports nothing. \`Breadcrumbs\`
published a \`nav\` part the family does not render; \`Checkbox\` renders the
\`field\` part the whole styled appearance is built on and never declared it.

Each component's page lists its parts.

### Parts do not nest by default

\`::part()\` reaches one level. A part inside a part inside a component is not
addressable from outside unless the component forwards it, which it does with
\`exportparts\`. If you find yourself wanting a part that is not published, that
is worth reporting rather than working around: the missing part is the bug.

## What not to do

**Do not raise specificity to fight a component.** \`helix-button.thing.thing\` is
still outside the shadow root, so it wins nothing it was not already winning.
Selector weight is not what is stopping you.

**Do not restyle through \`!important\` on the host.** Some properties inherit
into a shadow root and most do not, so this works for \`color\` and \`font-family\`
and fails silently for everything else, which is a worse outcome than failing
loudly.

**Do not fork the component to change a color.** The headless tier exists for
the case where you want none of our styling, and it is a different decision from
overriding one value. See [Tiers](./tiers).

## When you want all of it

\`\`\`ts
import '@helix-io/headless'
\`\`\`

The headless tier is structure, accessibility, state and form participation with
no CSS at all. You write the entire appearance. That is the honest answer when
the design is genuinely not ours, and it is a supported tier rather than an
escape hatch: \`helix-base-select\` is a registered element, not an abstract
class.
`,
  react: `---
description: The typings, the hydration bridge, and the controlled-property constraint.
parent: installation
section: Getting started
title: React
---

# React

There is no React package. The elements are custom elements and React renders
them directly. What ships for React is a \`jsx.d.ts\` that types every tag and a
runtime bridge in \`@helix-io/core\` that repairs one React behavior.

\`\`\`ts
import '@helix-io/web/jsx'
\`\`\`

A types-only import, once, anywhere TypeScript will see it. After that
\`<helix-button>\` is a typed element with its real props, and a value the
component does not accept is a compile error rather than a runtime shrug.

## Bind events with \`onhelix-*\`

\`\`\`tsx
<helix-accordion-item onhelix-open={(event) => track(event.detail.open)} />
\`\`\`

The prop is \`on\` and the event name, verbatim. Not \`onHelixOpen\`, not \`onOpen\`.
React 19 forwards an unknown \`on*\` prop to \`addEventListener\` using the name as
written, so the casing is the event's own.

## The bridge

React has a hydration bug with custom events: handlers attached during hydration
are stashed on the DOM node but never bound, so an event fired before the next
render finds nothing listening. \`HelixElement\` repairs it by reading React's own
stash off the node and calling what it finds, so a handler works from the first
paint rather than from the first re-render.

That is runtime code you already have, in \`@helix-io/core\`, and nothing to
configure. One thing to know about it: it reads a React
internal, the per-page key React stores props under. If a React release renames
that key the bridge stops repairing and your handlers go back to needing a
commit before they fire. Helix pins the React version it was measured against
and fails its own build when React moves past it, so this cannot go unnoticed.

## A declared property is a claim of ownership

This is the one thing about Helix that surprises people coming from React, and
it is a compile error rather than a surprise at runtime:

\`\`\`tsx
// Does not compile.
<helix-input label="Name" value="Ada" />
\`\`\`

In React, \`value\` on a native \`<input>\` without \`onChange\` is a warning. In
Helix it is a type error, and for the same underlying reason stated more
strictly: **writing a controlled property hands ownership to you.** From then on
the element announces changes and applies none of them. A consumer who meant to
seed a value gets a control that ignores every keystroke, with nothing logged
and nothing visibly wrong.

Two ways to write it, depending on which you meant:

\`\`\`tsx
// Controlled: you own it, so you answer it.
<helix-input label="Name" onhelix-input={(event) => setName(event.detail.value)} value={name} />

// Uncontrolled: the element owns it, and you say where it starts.
<helix-input default-value="Ada" label="Name" />
\`\`\`

The constraint is generated from the manifest and covers every controlled
property in the library. It is regression tested in both directions, so an error
here is real and an absent one means you answered.

See [State and control](./state-and-control) for what the two modes actually do.

## Register in a client component

\`\`\`tsx
'use client'
import '@helix-io/web'

export const HelixElements = () => null
\`\`\`

Render it once in your layout. **Your pages stay server components.** An
unregistered tag is an unknown element in the HTML that upgrades when the
definition lands, so nothing about a server component needs to change.

## There is no declarative shadow DOM

A server component's output is replayed from the flight payload through DOM APIs
rather than parsed as HTML, and declarative shadow DOM cannot activate for
script-inserted nodes. This is why \`elements.css\` exists: it styles the
un-upgraded markup so the interval before hydration looks like the finished page
rather than like unstyled boxes.

[Server rendering](./server-rendering) has the whole contract, and
[Using the elements](./using-the-elements) has the rest of the binding rules.
`,
  recipes: `---
description: Helix styling for markup this library does not render, with no JavaScript.
section: Foundations
title: Recipes
---

# Recipes

\`@helix-io/styles\` carries recipes for markup the components do not render: your
own anchors, your own buttons, a card you built yourself, prose out of a CMS.
They are \`data-\` attributes, they need no JavaScript, and they read the same
tokens the components do.

This is what lets a page look like Helix without a single custom element on it.

## Buttons

\`\`\`html
<button
  data-button="solid"
  data-button-tone="primary"
>Save</button>
<a
  data-button="ghost"
  href="/settings"
>Settings</a>
\`\`\`

Two axes: \`data-button\` is how much ink it claims (\`solid\`, \`outlined\`, \`ghost\`,
\`subtle\`) and \`data-button-tone\` is what it means (\`primary\`, \`accent\`,
\`neutral\`, \`danger\`). \`data-button-width\` takes \`auto\`, \`standard\` or \`full\`.

**This exists for elements this library does not render**, which is the case an
\`<a>\` styled as a button falls into. When you want a button, use \`helix-button\`:
the recipe has no loading state, no pressed state and no \`type="submit"\`
handling.

## Links

\`\`\`html
<a
  data-link
  href="/pricing"
>Pricing</a>
<a
  data-link
  data-link-underline="quiet"
  href="/docs"
>Docs</a>
\`\`\`

\`data-link-size\` and \`data-link-underline\` are the modifiers. \`quiet\` is for
navigation, where a line under every row would be noise. A link that opens a new
context says so on its own, rather than surprising the reader.

## Surfaces and layout

\`\`\`html
<div data-card>…</div>
<li data-list-item>…</li>
<div data-dock="bottom-end">…</div>
\`\`\`

\`data-dock\` pins something to a corner, which is a fact about the page rather
than about the control: \`data-dock-within\` scopes it to the nearest positioned
ancestor instead of the window.

## Prose

\`\`\`html
<article data-prose>
  <h2>From a CMS</h2>
  <p>Styled without being rewritten.</p>
</article>
\`\`\`

Headings take the type scale, paragraphs take the measure and leading, lists and
links and inline code all follow. See [Typography](./typography).

## Region axes

These two are API rather than styling, and they are the reason the base layer is
worth importing even in an app that uses only components:

\`\`\`html
<div data-density="sm">…</div>
<div data-color-mode="dark">…</div>
\`\`\`

\`data-density\` sets how big the controls in a region are, and it works through
custom properties so it crosses every shadow boundary on its own.
\`data-color-mode\` sets the color mode for a subtree. See [Size and
density](./size-and-density) and [Color modes](./color-modes).

## Utilities

\`\`\`html
<span data-hidden-visually>Sorting by</span>
\`\`\`

Clipped rather than \`display: none\`, so it stays in the accessibility tree. See
[Accessibility](./accessibility).

## When a recipe is the wrong tool

A recipe has appearance and no behavior. It cannot manage state, cannot
participate in a form, cannot trap focus and has no keyboard handling. If you
find yourself adding script to a recipe, the component is what you wanted.
`,
  routing: `---
description: Why a component renders its own anchor, and how to keep a router.
section: Essentials
title: Routing and navigation
---

# Routing and navigation

Some components navigate. A tree used as a sidebar, a button that goes
somewhere, a tab that is really a page. Those all want to be links, and a link
inside a shadow root is where web components and framework routers disagree.

## A component that navigates renders its own anchor

\`Tree.Item\` and \`Button\` both take an \`href\`, and when they have one the thing
you press *is* an \`<a>\`:

\`\`\`html
<helix-tree-item
  href="/design/components/button"
  value="button"
>
  Button
</helix-tree-item>
\`\`\`

That is not a detail of the implementation. What it buys is a list of things no
amount of JavaScript reproduces:

- the whole row is the target, not just the words
- Enter works, because a focused anchor is a thing Enter activates
- middle-click and Command-click open a tab
- the destination appears in the status bar on hover
- right-click offers Copy Link Address
- a crawler follows it

Before \`href\` existed, the docs sidebar put a \`<Link>\` inside each row. The
anchor was 57px of a 240px row, so five sixths of every row did nothing, and
Enter did nothing at all: the tree announced a selection and no anchor heard it.

## \`href\` and a framework's \`<Link>\`

You cannot give a component's internal anchor to \`next/link\`. \`<Link>\` renders
*its own* \`<a>\` and attaches its own handlers to it, and there is no way to hand
that to an element that renders one inside a shadow root.

So it is one or the other.

## Wrapping the component in a \`<Link>\` is not the third option

It looks like it should work, and it half does:

\`\`\`tsx
{/* Don't. */}
<Link href="/design/components/button">
  <helix-tree-item value="button">Button</helix-tree-item>
</Link>
\`\`\`

The tree still finds its items, because it collects them with a descendant
query rather than by looking at its children. What it costs:

- **Two focus stops per row.** The anchor is focusable and so is the treeitem
  inside it. A tree owns a single roving tab stop, and this adds a second one it
  does not control.
- **A \`treeitem\` nested inside a \`link\`.** Anything reading the semantics meets
  both, in that order, for one thing.
- **Nothing at all for a branch.** A branch contains its children, so wrapping
  one puts every descendant anchor inside an ancestor anchor. That is invalid,
  and browsers rearrange it.

## Some roles cannot contain a link

\`treeitem\` and \`tab\` are the two in this library. You cannot nest an anchor in
either, and the answer is not to give up the anchor.

For a tree, the role moves *onto* the anchor and the group becomes its sibling:

\`\`\`html
<!-- What Tree.Item renders when it has an href -->
<div
  part="item"
  role="none"
>
  <a
    aria-expanded="true"
    href="/x"
    part="row"
    role="treeitem"
  >Name</a>
  <div
    part="group"
    role="group"
  >…</div>
</div>
\`\`\`

That is the navigation flavor of the tree pattern, and it is why \`href\` changes
the shape of the markup rather than only adding an attribute. Without an \`href\`
nothing moves: the wrapper stays the \`treeitem\` and holds its group, which is
what an \`<li>\` holding a \`<ul>\` is.

Tabs have no equivalent published pattern. Web Awesome hit the same wall and
answered it the other way, telling consumers to drop the anchor and navigate in
JavaScript. That works, and it costs every item in the list above.

## Getting client-side routing back

Real anchors do a full page load, because a framework only intercepts anchors it
rendered itself. If you want its router, put it back on top rather than giving
up the anchors:

\`\`\`tsx
'use client'
const router = useRouter()

const navigate = (event) => {
  // A modified or middle press is exactly the gesture that wants the browser's
  // own behavior. Taking it back is taking back the reason for real anchors.
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return
  }
  // The anchor is inside a shadow root, so by the time the event gets here it
  // has retargeted to the host: \`event.target\` is the custom element.
  const link = event.nativeEvent
    .composedPath()
    .find((node) => node instanceof HTMLAnchorElement)
  if (!link || link.target !== '' || new URL(link.href).origin !== location.origin) {
    return
  }
  event.preventDefault()
  router.push(new URL(link.href).pathname)
}

return <nav onClick={navigate} onPointerOver={warm}>{/* … */}</nav>
\`\`\`

One listener on the container covers every row, and nothing has to be rebound as
rows come and go.

### Prefetch on approach, not on sight

\`<Link>\` prefetches when a link enters the viewport. For a sidebar of seventy
that is seventy requests for one navigation. Prefetching on \`pointerover\` and
\`focus\` instead costs one, and a reader points at a row well before they press
it:

\`\`\`tsx
const warmed = useRef(new Set())
const warm = (event) => {
  const path = pathOf(event)
  if (path && !warmed.current.has(path)) {
    warmed.current.add(path)
    router.prefetch(path)
  }
}
\`\`\`

Prefetching is production-only in Next, so this does nothing in development. It
is not broken.

## Which components take an \`href\` today

| Component | Notes |
|---|---|
| \`Button\` | Renders an \`<a>\` styled as a button. |
| \`Tree.Item\` | Changes the ARIA shape, as above. A linked branch navigates from its row and opens from its chevron. |
| \`Menu.Item\` | The row becomes the anchor and carries \`menuitem\`. Takes \`target\`, \`rel\` and \`download\`. |

Anything else that should navigate is a gap. Slot a link into it, and press the
row rather than the words: \`Tree.Item\` follows a slotted anchor from anywhere in
the row and from the keyboard, which covers the case without an \`href\`.

## \`Option\` cannot take one

The obvious place to want a link in a list is a command palette, whose entries
are usually half commands and half destinations. It is the one place this
library cannot offer an \`href\`.

**A listbox cannot move focus to its options.** A combobox keeps focus in its
text field while the arrows walk the list, so the pattern it is obliged to use
is \`aria-activedescendant\`: focus stays put and an attribute says which option
is current. A menu is the opposite, and that is what makes \`Menu.Item\` easy:
focus really moves to the row, so the row can be an anchor with \`menuitem\` on
it.

**That reference reaches the option's host and nothing inside it.** IDREFs do
not cross shadow boundaries at all, so \`Listbox\` uses the element-reference
form. Measured in Chromium: assigning \`ariaActiveDescendantElement\` an element
inside a *sibling* shadow root reads back \`null\`, while assigning the option's
host reads back the host. So \`role="option"\` is pinned to the host, since the
host is the only element the listbox can point at.

**And a \`role="option"\` with an anchor inside it is broken.** Measured in the
same browser, the accessibility tree for \`<div role="option"><a href>Open
settings</a></div>\` inside a listbox is an option with *no accessible name*, and
the link exposed as a child of it. The sibling option with plain text is named
correctly. So the manoeuvre that works for \`treeitem\` and \`menuitem\`, moving the
role onto the anchor, is exactly the one thing that cannot be done here.

Two constraints pointing opposite ways, and no arrangement satisfies both.

**So a palette routes through its event.** Listen for \`helix-select\` on
\`helix-command\` and call the router. That is what a palette is for, entries
being commands and "go to Settings" being a command that navigates, and it is
what every palette a reader has used already does. What it costs is the gestures
only a real anchor has: middle-click, a modified click, and the destination in
the status bar.
`,
  sandbox: `---
description: The editor beside the preview, and how to build one of your own.
section: Tooling
title: Sandbox
---

# Sandbox

[Open the sandbox](/helix/sandbox).

Every example on a component's page is editable. Change the markup and the
preview redraws; change the stylesheet beside it and the preview restyles.

The same elements are what you would reach for to build a playground of your
own, and the isolation below is what makes running someone else's markup safe.

## The frame is sandboxed

The preview runs in a sandboxed iframe with an opaque origin, and the script
that drives it is served as a static classic script rather than rendered by a
route.

**What that buys:** markup typed into the sandbox runs in the frame, and an
\`<img onerror>\` in it cannot read the surrounding page's cookies, its
\`localStorage\`, or the editor's contents. Before the frame was isolated, it
could. Measured.

The classic script is the part that looks like packaging and is not: from an
opaque origin, a module import or a \`fetch\` back to the site's origin is
cross-origin and fails without CORS headers. A classic \`<script src>\` is not
CORS-checked, so it is the one shape that can carry the component library into a
document the page cannot reach into and which cannot reach back out.

## Coordination is by event

A source pane dispatches \`helix-change\`, which bubbles, and the sandbox hands
the value to whatever preview is slotted into it. Neither child knows the other
exists, so either can be replaced or used alone.

The event carries the pane's \`name\`, which is what lets one sandbox hold several
panes without the root identifying senders by reference: \`html\` is the preview's
markup and \`css\` is its stylesheet. A pane named anything else is showing
something rather than driving it, and is ignored.

\`\`\`html
<helix-sandbox>
  <helix-sandbox-source
    name="html"
    slot="source"
  >…</helix-sandbox-source>
  <helix-sandbox-source
    name="css"
    slot="source"
  >…</helix-sandbox-source>
  <helix-sandbox-preview slot="preview"></helix-sandbox-preview>
</helix-sandbox>
\`\`\`

## The console is patched in the frame

Logs from the example reach the page's console panel; logs from the page around
it do not. That is deliberate and is the point of doing the patching in the
frame rather than in the sandbox: it catches what the example itself logs and
nothing else.

## The package is private

\`@helix-io/sandbox\` does not publish. It is the editor and spec runner for this
repository, and it is Helix tooling rather than a Helix product: the elements
assume the frame, the frame assumes the build, and the build assumes this
repository's layout.

If you want an editable example in your own documentation, the honest answer
today is that you would build it, and the manifest and the \`.examples\` files are
what you would build it from. That is a gap rather than a policy, and worth
telling us about.
`,
  'server-rendering': `---
description: What renders without a DOM, and what has to wait for one.
section: Essentials
title: Server rendering
---

# Server rendering

Every component renders on a server with no DOM. If you are only consuming
Helix, the practical consequence is small: components work in your server
components and there is nothing to configure. If you are extending one, the
rules below are the whole contract.

## There is no DOM

Lit's element shim carries attributes. It does not carry a tree. \`querySelector\`
is undefined, \`this.children\` is undefined, and anything that walks the DOM
throws while rendering.

Two real examples from this library, both found the first time their component
was given a server spec:

\`\`\`ts
// Select. \`display\` is read during render and reached the render root.
private get listbox() {
  return this.renderRoot?.querySelector('[part="listbox"]') ?? null
}

// Menu item. \`hasSubmenu\` is read during render and spread its children.
get hasSubmenu(): boolean {
  return [...(this.children ?? [])].some((child) => child.slot === 'submenu')
}
\`\`\`

Before those two guards, neither component could be server-rendered at all. Both
looked correct in every browser, because the client always has a root and always
has a tree.

**Anything that inspects the tree runs in \`firstUpdated\` or later**, and is
therefore a client-side enhancement by definition.

## Never initialise state in \`connectedCallback\`

SSR does not call it. Derive from properties, or seed in \`willUpdate\`, which SSR
does call.

## Guard generated ids

\`\`\`ts
if (!this.id) {
  this.id = \`helix-\${crypto.randomUUID()}\`
}
\`\`\`

The server writes the id into the HTML; the client sees it present and skips
generating a new one, so both agree. Without the guard they disagree and the
association breaks on hydration.

## Semantics on the host, presentation in the shadow root

IDREFs do not cross shadow boundaries, so \`aria-labelledby\` inside a shadow root
can never resolve to a light-DOM id. Use \`ElementInternals\`, which writes no
attribute at all, so the host stays exactly as you wrote it and hydration has
nothing to disagree about.

**Labels are the case that catches people.** \`<label for>\` cannot reach into a
shadow root either, which is why a field's label is rendered *inside* the
control rather than by anything wrapping it, and why a wrapping "form field"
component cannot own the label without handing it down as a property. It is also
why \`aria-label\` on a host has to be forwarded rather than left where it was
written. See [Composition](./composition).

Where an id genuinely cannot reach, **element references can**, and they resolve
outward: an element in a shadow root may point at one in the light DOM.
\`Listbox\` uses that for \`aria-activedescendant\`, because its options are your
elements and the element that takes focus is in its shadow root. Feature-test
them: assigning to a property an engine does not implement is a no-op rather
than an error.

## A child announces itself to its parent

A parent cannot poll for a child that has not upgraded yet. The child dispatches
a bubbling ready event and the parent listens.

## Writing a server spec

Every component has a \`*.ssr.spec.ts\`, and there is one rule about them worth
repeating, because it has produced a false pass twice:

**Never assert structure against the raw SSR string.** Declarative shadow DOM
inlines the component's stylesheet into the very markup being asserted, and that
stylesheet names every part, host attribute and token the component uses. So
\`toContain('part="media"')\` passes on a *selector*, and
\`not.toContain('data-scrolled')\` fails on a \`:host([data-scrolled])\` *rule*,
both saying nothing about what rendered.

Use the helpers: \`withoutStyles\`, \`hasPart\`, \`partTag\`, \`hostTag\`. And match
attribute bindings with a pattern, since they render across several lines:

\`\`\`ts
expect(markup).toMatch(/<a\\s+part="button"/) // ✅
expect(markup).toContain('<a part="button"') // ❌ never matches
\`\`\`
`,
  'shape-and-borders': `---
description: Five radii, two widths, and the two tokens that are a policy rather than a value.
section: Foundations
title: Shape and borders
---

# Shape and borders

## Radii

[//]: # (tokens:radii)

| Token | Value |
| --- | --- |
| \`--helix-radii-none\` | \`0\` |
| \`--helix-radii-sm\` | \`calc(var(--helix-seed-radii, 0.5rem) * 0.5)\` |
| \`--helix-radii-md\` | \`var(--helix-seed-radii, 0.5rem)\` |
| \`--helix-radii-lg\` | \`calc(var(--helix-seed-radii, 0.5rem) * 1.5)\` |
| \`--helix-radii-full\` | \`9999px\` |

[//]: # (/tokens)

\`full\` is \`9999px\` rather than \`50%\`, which matters for anything that is not
square: a percentage radius on a wide element gives an ellipse, and a pill is
what you wanted.

Rounding is the fastest single change to how a system feels, and it is one
token:

\`\`\`css
:root {
  --helix-radii-md: 2px;
}
\`\`\`

That makes every card, dialog, input and button squarer at once. The theme
engine takes a \`radius\` intent input for exactly this reason. See [Deriving a
theme](./theming).

**A shape that is round rather than softened does not use these.** An avatar, a
loader and a radio are circles because of what they are, so they say \`50%\`
directly and are unaffected by a theme that squares everything else off.

## Border widths

[//]: # (tokens:border)

| Token | Value |
| --- | --- |
| \`--helix-border-thin\` | \`1px\` |
| \`--helix-border-thick\` | \`2px\` |
| \`--helix-border-surface\` | \`var(--helix-border-thin)\` |
| \`--helix-border-floating\` | \`0\` |

[//]: # (/tokens)

The first two are values you pick. **The second two are a decision**, and they
belong to [Surfaces and separation](./surfaces-and-separation): they are what a
theme sets to zero to go shadow-first, or to a width to go border-first.

This distinction is why a component's border width sits behind a per-component
hook rather than being written inline. Of 68 border declarations reaching for
\`--helix-color-border\` before this was fixed, eight put the *color* behind a
hook and none put the width behind one, so a border could be recoloured and
never removed, and the floating surfaces wrote \`border: none\` outright so one
could never be added either.

## Corner radius on a group

Adjacent controls in a group flatten the corners between them, so a button group
reads as one shape rather than three:

\`\`\`css
[data-button]:not(:first-child) { border-start-start-radius: 0; }
\`\`\`

The base layer does this for the recipes, and the components do it for
themselves. If you build your own group: it is the inner corners that go flat,
not the outer ones, and it is \`border-start-start-radius\` rather than
\`border-top-left-radius\` so it follows the writing direction.
`,
  'size-and-density': `---
description: Why no control has a size, and what to write instead.
section: Theming
title: Size and density
---

# Size and density

**A control has no size. It takes its height from the region it is in.**

\`\`\`html
<helix-flex data-density="lg">
  <helix-button
    emphasis="solid"
    tone="primary"
  >See what is shipping</helix-button>
</helix-flex>
\`\`\`

There is no \`size\` prop on a button, an input, a select or a checkbox. That
looks like a restriction and is not one.

## Size does three jobs

**Emphasis.** The \`emphasis\` axis carries it. A filled primary button says "this one
matters" far louder than eight more pixels ever will.

**Fit.** This is a fact about the region rather than about the control. A
toolbar is tight, a hero is spacious, a table row is tighter still. The control
does not know which it is in; the region does.

**Optical role.** Real, and only for things that are not controls. An avatar at
24 in a list and 96 on a profile is a different graphic, not a taller control.
That is why \`size\` survives on \`Avatar\` and \`Spinner\` and nowhere else: those
are pictures.

## The test that settles it

*Can two controls sitting together legitimately differ in height?*

Save and Cancel. An icon button beside a text button. An input and its submit.
The two halves of a split button. In every case the answer is no.

So a per-instance size is only ever used to say something about the **region**,
one element at a time, which is exactly how a row ends up with one member the
wrong height. Said once on the region, a ragged row is not discouraged. It is
unwritable.

That is also what makes this safe for anything generating code, whether that is
a person or a model: there is no size to get wrong, and one question to ask per
region instead of one per element.

## How to use it

Put \`data-density\` on any container. \`sm\`, \`md\` or \`lg\`. \`md\` is the default and
is never written.

\`\`\`html
<helix-toolbar>
  <!-- Nothing here needs a size. The toolbar is already dense. -->
  <helix-button>Run</helix-button>
  <helix-select label="Target"><!-- … --></helix-select>
</helix-toolbar>
\`\`\`

**Containers that are dense by nature declare it themselves.** The app header,
the toolbar and the announcement all do, so a control put in one is already the
right height without anybody deciding.

It works through custom properties (\`--helix-size-control\`,
\`--helix-size-checkbox\`, \`--helix-size-switch\`, \`--helix-size-tag\`), which is
why it costs no component any API and crosses every shadow boundary on its own.

The \`-sm\` / \`-md\` / \`-lg\` tokens are the scale and never move. The unsuffixed
ones are the current step, and \`data-density\` is what moves them.

## What this is not

**\`data-link-size\` stays.** A text link has no control height: its size is
typography, and it follows the text around it.

**A control may still declare its own scale.** \`--helix-size-switch\` is one step
above \`--helix-size-checkbox\` at every density, because a switch is a track with
a thumb inside it and a checkbox is a box with a mark in it. That is the
component choosing where it sits on the scale, once, for everyone. It is not the
same thing as a consumer setting a height per instance.
`,
  'space-and-size': `---
description: One spacing scale, and why a control's height is not on it.
section: Foundations
title: Space and size
---

# Space and size

Two scales that look similar and answer different questions. Space is the gaps
between things. Size is how big a control is. Mixing them is how a layout ends
up with a button that is one step of padding taller than the input beside it.

## Space

[//]: # (tokens:space)

| Token | Value |
| --- | --- |
| \`--helix-space-none\` | \`0rem\` |
| \`--helix-space-2xs\` | \`calc(0.25rem * var(--helix-seed-density, 1))\` |
| \`--helix-space-xs\` | \`calc(0.5rem * var(--helix-seed-density, 1))\` |
| \`--helix-space-sm\` | \`calc(0.75rem * var(--helix-seed-density, 1))\` |
| \`--helix-space-md\` | \`calc(1rem * var(--helix-seed-density, 1))\` |
| \`--helix-space-lg\` | \`calc(1.5rem * var(--helix-seed-density, 1))\` |
| \`--helix-space-xl\` | \`calc(2rem * var(--helix-seed-density, 1))\` |
| \`--helix-space-2xl\` | \`calc(3rem * var(--helix-seed-density, 1))\` |
| \`--helix-space-3xl\` | \`calc(4rem * var(--helix-seed-density, 1))\` |
| \`--helix-space-control\` | \`var(--helix-space-md)\` |

[//]: # (/tokens)

Nine steps, t-shirt named rather than numbered. A numbered scale invites
arithmetic (\`space-4\` is twice \`space-2\`) which stops being true the moment the
scale is tuned, and invites a \`space-4.5\` the first time something does not fit.

\`--helix-space-control\` is the tenth and is different in kind: it is the inset a
control uses, and it follows the region's density rather than sitting on the
scale. See [Size and density](./size-and-density).

Use them for gap, padding and margin:

\`\`\`css
.toolbar {
  display: flex;
  gap: var(--helix-space-sm);
  padding: var(--helix-space-md);
}
\`\`\`

## Size

Thirty-four tokens, and almost all of them name a specific thing:
\`--helix-size-control\`, \`--helix-size-checkbox\`, \`--helix-size-switch\`,
\`--helix-size-avatar\`, \`--helix-size-icon\`, \`--helix-size-tag\`,
\`--helix-size-header\`, \`--helix-size-progress\`, \`--helix-size-meter\`.

Most come in a \`-sm\`, \`-md\` and \`-lg\` set beside the unsuffixed one. **The
unsuffixed token is the live one** and the suffixed ones are the values the
density axis picks between. The loader is the exception: it has \`-sm\`, \`-md\`
and \`-lg\` and no unsuffixed token above them, because nothing reads a loader's
size off the density. So a component reads \`--helix-size-control\` and the
region's \`[data-density]\` decides which of \`-sm\`, \`-md\` or \`-lg\` that resolves
to.

That is why a component has no \`size\` property: the answer is the region's, and
saying it once there means a ragged row is not merely discouraged, it is
unwritable.

## The focus ring is three tokens

\`\`\`
--helix-size-focus-ring     the ring's own thickness
--helix-size-focus-offset   the gap between the control and the ring
--helix-size-focus-reach    ring plus offset, for reserving room
\`\`\`

The third exists because a ring drawn outside a control needs room, and every
component that draws one otherwise recomputes the sum. Reserve with \`reach\`,
draw with the other two.

## What not to do

**Do not use a size token for a gap.** \`--helix-size-control\` is a height, and a
layout that uses it as a gap changes meaning the day a density changes under it.

**Do not use a raw value because the scale has no step for it.** If a gap is
genuinely between \`sm\` and \`md\`, say so rather than writing \`11px\`: it is
usually a sign the two things being separated belong at different levels of the
layout.
`,
  'state-and-control': `---
description: Why writing a property hands the element to you, and what to write instead.
section: Essentials
title: State and control
---

# State and control

**A declared property is a claim of ownership.** Write \`value\`, \`open\`,
\`checked\` or \`active\` on a Helix element and the element stops applying its own
changes: from then on it announces what happened and waits to be told what to
do.

That is one rule, it covers thirty-odd families, and it is the single thing
about this library most likely to look like a bug.

\`\`\`text
<!-- Ignores every keystroke. Nothing is logged. Nothing looks wrong. -->
<helix-input label="Name" value="Ada"></helix-input>
\`\`\`

Do not paste it. It is plain text rather than a live example because a reader
copies what is in front of them, and this is the one page that has to show the
mistake in order to name it.

## The two modes

Every controlled property comes in a pair.

| Uncontrolled | Controlled |
|---|---|
| \`default-value\`, \`default-open\`, \`default-checked\`, \`default-active\` | \`value\`, \`open\`, \`checked\`, \`active\` |
| The element owns the state and moves it | You own the state and move it |
| The element announces, and applies | The element announces, and waits |

**Which mode an element is in is read once, at its first update**, from whether
anything had set the controlled property by then. Markup, a hydrating server's
attributes and a framework's initial properties have all arrived by that point
and nothing else has happened yet, so the reading is stable. Set, and you own
it. Unset, and the element does, and the \`default-\` property says where it
starts.

Reading is the same in both modes. \`dialog.open\` answers the question anyone
asking it meant, whichever mode the dialog is in, which is why there is one
property rather than an \`isOpen\` beside it: there is no such second word for a
value or an active item, so all four of these have the same shape instead of
four shapes.

## Controlled, written correctly

\`\`\`tsx
<helix-input
  label="Name"
  onhelix-input={(event) => setName(event.detail.value)}
  value={name}
/>
\`\`\`

\`\`\`tsx
<helix-dialog
  label="Confirm"
  onhelix-close={() => setOpen(false)}
  open={open}
/>
\`\`\`

The event is what carries the request. Answer it by moving your own state, and
the element renders what you hand back.

## Uncontrolled

\`\`\`html
<helix-input
  default-value="Ada"
  label="Name"
></helix-input>
<helix-accordion-item default-open>…</helix-accordion-item>
\`\`\`

Nothing to wire. Read the value off the element or off the form when you need
it, and let it manage itself in between.

**Reach for controlled when something outside the element decides the state**:
two controls that have to agree, a value that comes from a route, a dialog whose
open state is in a store. Not by default, and not because it feels more
explicit.

## State is on the host as \`data-\`

\`\`\`css
helix-accordion-item[data-open] { … }
\`\`\`

\`open\` is not reflected, and that is required rather than tidy. Reflection would
write the resolved state back as an attribute, and writing the attribute is how
a consumer claims ownership: an uncontrolled element that opened itself would
put \`open\` on its own host and, to anything that read it next, be
indistinguishable from one you control. Cloned, serialised for hydration, or
diffed by a framework, it would come back controlled and stop responding.

So \`data-open\` carries the resolved state for stylesheets, in both modes, and
the plain attribute stays yours to write.

## Refusing a change

Every controlled change announces before it acts, and the announcement is
cancelable:

\`\`\`ts
item.addEventListener('helix-open', (event) => {
  if (unsaved) {
    event.preventDefault()
  }
})
\`\`\`

\`preventDefault()\` refuses the change and nothing moves. This is the only way to
refuse one. Which events are cancelable is on each component's page, and every
one that is says so.

The imperative form reports the same thing:

\`\`\`ts
const applied = item.requestOpen(true)
\`\`\`

\`false\` means something refused it, or that you own the state and nothing has
answered yet.

## What catches the mistake

**In TypeScript, the constraint is a compile error.** The types intersect every
controlled tag with a union that requires an answering handler, so \`<helix-input
value="Ada" />\` does not compile. The constraint is generated, and regression
tested in both directions, so an error here is real and an absent one means you
answered.

**At runtime, the control says so on the console.** A controlled element that
asks for something and gets no answer warns once, naming itself and the
property. It is judged on the second unanswered request rather than on a timer,
which matters: an earlier version waited one task, on the reasoning that React
commits a \`setState\` from a handler before the next one. True of React, false of
anything slower, and a consumer answering by navigating was accused of not
listening. A warning that is sometimes wrong is one people learn to ignore, and
this one has to be believed the day it is right.

So there is no deadline: if the state has not moved between two requests, nothing
answered either of them, whatever the timing. A control asked once and never again
is never accused, which is the right trade, because the symptom this exists for is
a control that ignores everything.
`,
  'surfaces-and-separation': `---
description: The four ways a surface is told apart, and the ground a component is not.
section: Foundations
title: Surfaces and separation
---

# Surfaces and separation

**A surface is told apart from what is behind it by exactly one of four things:
a fill, an edge, a lift, or space.** A design language leads with one of them.
Helix leads with the edge on the page and with the lift above it: a card takes a
hairline and no shadow, a menu takes a shadow and no hairline. The ladder below
decides what a surface sits on.

## The four mechanisms

| | |
|---|---|
| **Fill** | A different ground color to what is behind it |
| **Edge** | A border |
| **Lift** | A shadow |
| **Space** | Nothing at all, and the gap does the work |

Most systems use two or three without deciding, which is how you end up with a
card that has a border, a shadow *and* a tint, each added by someone solving the
same problem again.

Helix expresses the choice in two pairs of policy tokens:

[//]: # (tokens:separation-policy)

| Token | Value | For |
| --- | --- | --- |
| \`--helix-border-surface\` | \`var(--helix-border-thin)\` | The edge a surface in the flow takes. Zero to go shadow-first. |
| \`--helix-shadow-surface\` | \`var(--helix-shadow-none)\` | The lift a surface in the flow takes. None to go border-first. |
| \`--helix-border-floating\` | \`0\` | The edge a surface over content takes. |
| \`--helix-shadow-floating\` | \`var(--helix-shadow-lg)\` | The lift a surface over content takes. |

[//]: # (/tokens)

Set the border pair to zero and the shadow pair to something, and the whole
library goes shadow-first. Reverse them and it goes border-first. Every surface
in the library is themeable in both directions, and checked, because a
half-converted one reads as done: hook the shadow and hardcode \`border: none\`
and it themes perfectly in one direction and cannot be moved in the other.

## The ladder

A surface's ground says where it is, not what shade it is:

[//]: # (tokens:surface-ladder)

| Token | Value | For |
| --- | --- | --- |
| \`--helix-color-background\` | \`light-dark(oklch(1 0 0), oklch(0 0 0))\` | The page. Told apart by nothing, because it is the ground. |
| \`--helix-color-surface\` | \`light-dark(oklch(0.985 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)), oklch(0.21 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)))\` | A plane on the page: a card, or a panel you own. Told apart by a fill, an edge or a lift, whichever the policy leads with. |
| \`--helix-color-surface-raised\` | \`light-dark(oklch(0.97 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)), oklch(0.29 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)))\` | Lifted while still lying on the page: a selected tab, a hovered row. Told apart by its fill, which goes down the ramp rather than up. |
| \`--helix-color-surface-overlay\` | \`light-dark(oklch(1 0 0), oklch(0.29 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)))\` | Over the page rather than on it: a menu, a popover, a dialog. Told apart by its shadow and by what it covers. |
| \`--helix-color-surface-sunken\` | \`light-dark(oklch(0.96 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)), oklch(0.15 var(--helix-seed-neutral-chroma, 0) var(--helix-seed-neutral-hue, 258)))\` | A well a value goes into: an input, a track, a groove. Told apart by its fill, inward. |

[//]: # (/tokens)

**\`raised\` goes down the ramp, not up**, which is the counterintuitive one. A
selected tab's pill, a hovered row and an option under the pointer all have the
page on every side, so they are told apart by their fill, and on a white page a
fill has to be a step *darker* to be seen. \`overlay\` is the opposite: it is told
apart by its shadow and by covering something, so on white it is white.

## The common mistake

**\`--helix-color-background\` is the page, and your component is not the page.**

\`\`\`css
/* Wrong. Claims the component is sitting on the page. */
.marker { background: var(--helix-color-background); }
\`\`\`

Every use of the page's color inside a component is a claim about what that
component is sitting on, and the claim is right exactly as often as the
component is put on the page and no other ground. \`Timeline\`'s marker made it,
painting itself the page color to knock the rail out behind it, and came out
darker than any surface that was not the page: on a card it showed as a black
disc. The sparkline's ring terminus made the same mistake and looked identical.

The trap is that both of those *worked*, for months, because the page is what
anybody building a component puts it on. It fails on a card, a drawer, a toast,
a panel or a photograph, and none of those is where a component gets built.

**What to do instead:** put the color behind a hook that defaults to the page,
so a consumer whose component is not on the page can correct it. That is what
the library requires of itself, and the same reasoning applies to anything you
build on top.

## Contrast

The theme engine measures an ink against the ground it is *really* painted on,
which is why the ladder is a model rather than a naming convention: the engine
has to know that \`foreground\` on \`surface-overlay\` is a real pair and
\`foreground-on-accent\` on \`surface\` is not. See [Color](./color).
`,
  svelte: `---
description: Typed tags, and the framework that needs the least said about it.
parent: installation
section: Getting started
title: Svelte
---

# Svelte

\`\`\`ts
import '@helix-io/web/svelte'
\`\`\`

A types-only import, once. It augments \`SvelteHTMLElements\` so every Helix tag
is typed in a component, and it does so by re-exporting the JSX types rather
than emitting a second copy: Svelte binds a handler as \`onhelix-input={…}\`,
which is the shape those types already describe, and two generated copies of one
thing are two things that can disagree.

## Nothing else to configure

\`\`\`svelte
<helix-input label="Name" onhelix-input={(event) => (name = event.detail.value)} value={name} />
\`\`\`

Svelte sets a property when the element has one and an attribute otherwise, and
binds \`on*\` with \`addEventListener\`. There is no unknown-element warning to
silence and no compiler flag to set. That is the whole page, and it is short
because Svelte was already right about custom elements.

**Pass objects and arrays as properties**, which Svelte does on its own:

\`\`\`svelte
<helix-tabs items={tabs} />
\`\`\`

## Two things that are not framework-specific

\`bind:\` does not work on a Helix control, because there is no two-way binding
convention a custom element can opt into. Read the value off the event.

And a declared \`value\`, \`open\`, \`checked\` or \`active\` is a claim of ownership:
the element announces and waits rather than applying the change itself. Use
\`default-value\` and its siblings when you want the element to own its own state.
See [State and control](./state-and-control).
`,
  'theme-builder': `---
description: The tool that turns intent inputs into a token set you can see.
section: Tooling
title: Theme builder
---

# Theme builder

[Open the theme builder](/helix/theme).

Move a slider and every surface in the library resolves around it. A theme here
is derived rather than picked, and this is where you see that happen.

## What it does

You give it the intent inputs, the same ones \`derive()\` takes: a brand color, a
chroma ceiling, a radius, a density, a contrast target, a motion character. It
runs the real derivation, not an approximation of it, and shows you the complete
token set plus the library rendered in it.

Light and dark at once, because \`[data-color-mode]\` works on any element and the
two previews are two subtrees of one document. See [Color modes](./color-modes).

## The contrast column

Every pairing the engine solved is listed with its measured ratio against the
ground it is actually painted on. Three states:

- **Met.** The pair reaches the target.
- **Unverifiable.** The ground is translucent, so there is no known color to
  measure against. Not a failure, and not a pass either: it is what a material
  choice costs you, reported rather than hidden.
- **Pinned.** You supplied the color outright, so the engine did not solve for
  it and cannot promise anything about it.

A theme with a column of \`unverifiable\` is a theme making a trade. It should be
possible to see that you made it.

## What comes out

The token block, as CSS, to paste into your own stylesheet:

\`\`\`css
:root {
  --helix-color-primary: oklch(…);
  …
}
\`\`\`

Or the intent object, to keep in your repository and re-derive from:

\`\`\`ts
export const theme = { brand: '#2563eb', chroma: { ceiling: 0.1 }, radius: 2 }
\`\`\`

**Keep the intent, not the tokens.** The tokens are the output of a solver, and
the solver improves: a theme stored as its inputs picks up a better derivation,
and a theme stored as 176 literal values is frozen at the version that produced
it. The tokens are for pasting into a system that cannot run the engine.

## What it does not do

It shows you numbers and swatches, not components in your product. A contrast
matrix is a grid with three states, which a terminal or a table renders better
than a picture does, and the components beside it are there to sanity-check the
result rather than to be a design surface.
`,
  theming: `---
description: Deriving an accessible token set from intent inputs.
section: Theming
title: Deriving a theme
---

# Theming

**Tokens are a function, not a table.**

A design system that ships two hundred hand-picked hex values can only offer
override. You change one, break contrast somewhere three components away, and
never find out. That is a config file, not a theming system.

\`@helix-io/theme\` computes a complete token set from a handful of intent
inputs, and every foreground and background pair meets its contrast target **by
construction** rather than by audit.

## Two ways to theme

They are both real and they are not the same thing, so they have different
names.

**Tuned** is the CSS path. Write a seed, the stylesheet re-derives, and nothing
has to be installed or run:

\`\`\`css
:root {
  --helix-seed-brand: oklch(0.58 0.19 20);
  --helix-seed-accent-hue: 140;
  --helix-seed-chroma-scale: 0.4;
}
\`\`\`

It works at \`:root\` and on any \`[data-helix-theme]\` subtree, and nowhere else.
A \`var()\` inside a custom property is substituted on the element the property is
*declared* on, so the ramp has already resolved at the root and a seed written
on a plain element is read by nothing. Naming the scope is what re-runs those
declarations.

**Tuned makes no contrast promise**, and cannot. CSS has no contrast function:
\`oklch(from …)\` can step and rotate, and it cannot search for the lightness that
clears a target. The figures baked into the ramp are exact for the seed that
ships and approximate for any other.

**Verified** is the engine. It solves rather than steps, measures every pair it
emits, and hands back an artifact:

\`\`\`ts
import { deriveTheme, toCss } from '@helix-io/theme'

const theme = deriveTheme({
  brand: '#0b3d91',
  contrastTarget: 4.5, // 4.5 is WCAG AA, 7 is AAA
  scheme: 'light',
})

if (theme.violations.length > 0) {
  throw new Error(theme.violations.join('\\n'))
}

console.log(toCss(theme))
\`\`\`

The emitted block carries the seeds as well as the tokens, so the halves the
engine does not compute, the twenty-four series colours a chart reads, the
spacing scale and the corner radii, re-derive from the same values the solver
used. That is what stops the two paths disagreeing on the same page.

Reach for tuned to try a color. Reach for verified to ship one.

## Why OKLCH

Equal numeric steps in sRGB are not equal perceptual steps, which makes both
scale generation and contrast math unreliable. OKLCH is what makes derivation
possible at all. Colors are authored in it and converted at the edge.

The brand color keeps its hue and chroma; only lightness moves to meet the
target. That is what preserves brand identity while guaranteeing contrast.

## What it protects against

Both of these produce a palette that passes review and fails in production.
Both are covered by regression tests.

**Solving against colors that cannot be rendered.** A near-white surface
carrying brand tint falls outside the sRGB gamut and gets truncated on the way
to hex, breaking both the intended hue and the contrast just solved for. Every
color is gamut-fitted before it is solved against, and a token reports
\`chromaReduced\` when fitting changed it rather than clipping silently.

**Verifying against only one surface.** Text lands on \`surface\` as often as on
\`background\`: cards, dialogs, menus. In a dark theme \`surface\` is *lighter*
than \`background\`, so light text loses contrast inside every card while the
page itself passes. Foregrounds are solved against the hardest surface they
land on, not just the page background.

## Inspecting a theme

Every derived token carries the check that produced it:

\`\`\`ts
const theme = deriveTheme({ brand })

for (const token of theme.tokens) {
  console.log(token.name, token.hex, token.contrast, token.chromaReduced)
}
\`\`\`

\`violations\` is empty when the theme passes. Anything that could not reach its
target at the requested chroma is reported there rather than shipped.
`,
  tiers: `---
description: Why the headless and styled tiers are separate packages.
order: 2
section: Getting started
title: Tiers
---

# Tiers

Helix ships as four stacked packages. Each has one job, and the dependency
direction never reverses.

| Package | Owns | Depends on |
| --- | --- | --- |
| \`@helix-io/styles\` | Tokens and the base layer. Pure CSS | nothing |
| \`@helix-io/core\` | Element base class, mixins, decorators | Lit |
| \`@helix-io/headless\` | Structure, accessibility, state, form participation | \`core\` |
| \`@helix-io/web\` | Presentation: tokens, parts, and the visual axes | \`headless\`, \`styles\` |

\`@helix-io/theme\` and \`@helix-io/icons\` ship beside the stack rather than in it:
neither is a tier, and neither is needed to render a component. **There is no
React package.** The framework typings are generated into \`@helix-io/web\`, and
the bridge that repairs React's hydration of custom events is in
\`@helix-io/core\`. See [React](./react).

## Why the split

**\`headless\` must never depend on \`styles\`.**

That single constraint is what makes the headless tier independently
consumable. Consume it and bring your own
styling entirely; nothing about how Helix looks comes with it. If styling leaks
downward, the five packages are one package in five files.

## What belongs where

The base tier owns what a component **is and does**: markup structure, ARIA
wiring, slots, events, internal state, form participation. It ships no CSS, no
token references, and none of the visual axes.

The styled tier extends it and adds only presentation. Token references live
here.

\`\`\`ts
// headless/src/accordion/item/accordion-item.ts
// no CSS, no tokens
export class HelixBaseAccordionItem extends MixinControllerOpen(HelixElement) {
  protected override render() {
    return html\`
      <div part="container">
        <button aria-expanded=\${this.open} part="trigger" @click=\${this.handleToggle}>
          <slot name="summary"></slot>
        </button>
      </div>
    \`
  }
}

// web/src/accordion/root/accordion-root.ts
// extends the base, adds presentation only
import { styles } from './accordion-root.css.js'

@customElement('helix-accordion')
export class HelixAccordion extends HelixBaseAccordion {
  @property({ reflect: true })
  separation?: 'outlined' | 'plain'

  static override styles: CSSResultGroup = styles
}
\`\`\`

\`\`\`css
/* web/src/accordion/item/accordion-item.css */
[part='trigger'] {
  min-block-size: var(--helix-size-control);
  padding: var(--helix-space-sm);
}
\`\`\`

## Styling from the outside

Shadow DOM markup uses CSS Shadow Parts, not class names. Every structural
element carries a \`part\`, which doubles as the public override API:

\`\`\`css
helix-accordion-item::part(trigger) {
  font-weight: 600;
}
\`\`\`

For single-knob changes, prefer the per-component custom property. It defaults
to a system token, so overriding it restyles one component without touching
\`--helix-*\` and affecting everything else:

\`\`\`css
helix-accordion {
  --accordion-radii: 1rem;
}
\`\`\`

## Mixins and tooling

\`open\` and \`defaultOpen\` come from \`MixinControllerOpen\` in \`@helix-io/core\`.
The manifest analyzer cannot follow a mixin into another package, so any
mixin-provided API a component exposes has to be documented on the component
itself with \`@event\`, \`@property\`, or similar. Undocumented mixin API is
invisible to IDE tooltips, the React wrapper generator, and any agent reading
the manifest.
`,
  tokens: `---
description: The two layers, the surface ladder, and what is enforced.
pinned: true
section: Theming
title: Tokens
---

# Tokens

Two layers. You see the second.

| Layer | Shape | Who may use it |
|---|---|---|
| Primitive | \`--_helix-neutral-500\` | \`@helix-io/styles\` only |
| Semantic | \`--helix-color-primary\` | everything, including you |

Every semantic token answers *what is this for*, never *what value is it*. There
are fifteen categories and every token is in exactly one: \`color\` \`space\`
\`radii\` \`font\` \`text\` \`weight\` \`leading\` \`tracking\` \`border\` \`shadow\`
\`material\` \`duration\` \`easing\` \`size\` \`layer\`.

The leading underscore is the whole convention: \`--_helix-\` is private and may
be renamed or re-spaced without notice. Reaching past the semantic layer is the
one thing that will break under you.

## The surfaces

Depth is distance from the page, in whichever direction there is room. The page
is white in light and black in dark, so in light there is nothing above white to
be lifted into: a raised surface goes *down* the ramp, not up.

- **\`background\`**: the page.
- **\`surface\`**: a plane on the page. A card, a panel you own.
- **\`surface-raised\`**: something lifted while still *lying on* the page: a
  selected tab's pill, a hovered row, an option under the pointer. It has the
  page on all sides, so it is told apart by its fill, which on white has to be a
  step darker.
- **\`surface-overlay\`**: something *over* the page rather than on it: a menu, a
  popover, a dialog, and the thumb of a switch or a segmented control. It is
  told apart by its shadow and by what it covers, so on white it is white.
- **\`surface-sunken\`**: a well you put a value into, an input's fill, a track, a
  groove.

**\`raised\` and \`overlay\` are the pair worth learning.** They land on the same
step in dark mode, which is why one token tried to do both jobs for a while. In
light they want opposite fills: a hovered row must be darker than a white page,
and a thumb must be lighter than the groove it sits in. If something looks
almost right in dark and wrong in light, this is usually why.

## Per-component hooks

\`\`\`css
helix-card {
  --card-padding: var(--helix-space-lg);
}
\`\`\`

\`--card-padding\` is not a Helix token. It is a hook that particular component
exposes, documented on the component, and it defaults to a semantic token. Use
them to nudge one component; use the semantic tokens to move everything.

## What is enforced

Four things fail the build:

1. **A raw value where a token exists.** \`#e5e5e5\` when a neutral is right there.
2. **A primitive referenced from outside \`@helix-io/styles\`.**
3. **A reference to a token that does not exist.**
4. **A component hook nothing reads**, and a primitive nothing resolves into.

The third earns its keep on its own: a renamed token resolves to nothing, the
property silently falls back to a browser default, and the code looks correct
while the component is quietly unstyled.

## Theming

Both modes live in one declaration:

\`\`\`css
--helix-color-surface: light-dark(var(--_helix-neutral-50), var(--_helix-neutral-900));
\`\`\`

Which half resolves is decided by \`color-scheme\` and nothing else, so the color
mode is a single attribute and no token is restated to honor it. Set
\`data-color-mode="light"\` or \`"dark"\` on any element to theme that subtree.
\`color-scheme\` inherits, so a light preview inside a dark page is one attribute.

Absent, it follows the operating system.
`,
  typography: `---
description: Three families, one scale, and a heading that is a real heading.
section: Foundations
title: Typography
---

# Typography

## The families

[//]: # (tokens:font)

| Token | Value | For |
| --- | --- | --- |
| \`--helix-font-sans\` | \`ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif\` | Everything, unless it is one of the two below. |
| \`--helix-font-mono\` | \`ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace\` | Code, and anything that has to line up in a column. |
| \`--helix-font-display\` | \`ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif\` | Headings meant to be looked at rather than read. Falls back to the sans face. |

[//]: # (/tokens)

Three, not a scale of weights and widths, because a design system with more type
families than a product has uses ends up with two that mean the same thing.

## The scale

\`--helix-text-xs\` through \`--helix-text-3xl\`, plus \`--helix-text-control\`, which
is the size a control's own text takes and follows the region's density rather
than the type scale.

**The scale is applied to real headings by the base layer, not by a component.**

\`\`\`css
:where([data-prose] h1) { font-size: var(--helix-text-3xl); }
:where([data-prose] h2) { font-size: var(--helix-text-2xl); }
\`\`\`

Styling the element rather than a component means the markup and the appearance
cannot disagree by default, and it reaches prose the design system never renders:
anything out of a CMS, a markdown file, or a rich-text field lands inside
\`[data-prose]\` and comes out right without being rewritten.

**\`Text\` exists for the case where they genuinely have to come apart.** A
section's second heading sometimes has to look smaller without lying about the
outline, and a \`<p>\` sometimes has to read as a caption, so \`as\` chooses the
element and \`variant\` chooses the ramp:

\`\`\`html
<helix-text
  as="h3"
  variant="body"
>Reads as body, outlines as a heading</helix-text>
\`\`\`

They default to matching, so \`as="h2"\` and nothing else is the common case, and
the pairing is resolved in CSS rather than by writing an attribute onto the host,
because that would be a hydration mismatch in every React consumer. Size, weight
and leading are not properties: a ramp is a decision the system already made, and
exposing the parts offers a few hundred combinations of which a handful are
right. There is no separate \`Heading\` component, because that is \`as\`.

## Applying it to your own text

\`\`\`html
<article data-prose>
  <h2>A real heading</h2>
  <p>Body text, at the right measure and leading.</p>
</article>
\`\`\`

\`[data-prose]\` is the container. Inside it, headings, paragraphs, lists, links
and code are all styled from the token layer.

For one-off text outside prose, \`[data-text]\` carries the ramp:

\`\`\`html
<span data-text="sm">Fine print</span>
\`\`\`

## The vertical metrics

[//]: # (tokens:leading)

| Token | Value | For |
| --- | --- | --- |
| \`--helix-leading-tight\` | \`1.2\` | Body text set close, for a short measure. |
| \`--helix-leading-normal\` | \`1.5\` | Body text, and the default a paragraph takes. |
| \`--helix-leading-loose\` | \`1.7\` | Body text set open, for a long measure or a small size. |
| \`--helix-leading-heading\` | \`calc(0.99em + 0.5rem)\` | Headings, which want less than a paragraph. Written as a length plus an em so it tightens as the type grows. |

[//]: # (/tokens)

[//]: # (tokens:tracking)

| Token | Value | For |
| --- | --- | --- |
| \`--helix-tracking-tight\` | \`-0.01em\` | Large type, which needs the letters closer than a paragraph does. |
| \`--helix-tracking-normal\` | \`0\` | Body text, and the default. |
| \`--helix-tracking-wide\` | \`0.02em\` | Small capitals and labels, which need the room. |

[//]: # (/tokens)

[//]: # (tokens:weight)

| Token | Value | For |
| --- | --- | --- |
| \`--helix-weight-regular\` | \`400\` | Body text, and the weight most of a page is set in. |
| \`--helix-weight-medium\` | \`500\` | A label, or a heading that should not shout. |
| \`--helix-weight-semibold\` | \`600\` | A heading, and the heaviest this system goes. |

[//]: # (/tokens)

**Headings have their own leading token rather than a smaller number of the body
one.** A heading set at the paragraph's line height reads as loose at every
size, and the correction is not proportional: the larger the type, the less
leading it wants. One token expresses that once instead of a magic multiplier at
every heading level.
`,
  'using-the-elements': `---
description: Binding events, registering elements, and the traps in both.
pinned: true
section: Essentials
title: Using the elements
---

# Using the elements

Write \`<helix-card>\` in your JSX. They are plain custom elements: no wrapper, no
patched React, and no React package: there is not one.

\`\`\`tsx
export default function Page() {
  return (
    <helix-card>
      <h2 slot="header">Deployments</h2>
      <helix-button emphasis="solid" tone="primary">Ship it</helix-button>
    </helix-card>
  )
}
\`\`\`

Everything below is a trap that has actually cost time, rather than general
advice.

## Bind Helix events with \`onhelix-*\`

\`\`\`tsx
<helix-tabs onhelix-change={(event) => setPane(event.detail.value)} />
\`\`\`

There is a real bug underneath this, and the elements work around it for you.
**React attaches no custom element listener while hydrating**, so on a
server-rendered page every one of these props is dead until React commits an
update for some other reason, at which point it silently starts working. Nothing
is logged. It is
[facebook/react#35446](https://github.com/facebook/react/issues/35446), open and
unfixed.

Every Helix element binds the handler itself, immediately before it announces
anything, using the function React is already holding for it. Measured in Chrome
against React 19.2.8: on a hydrated page the first event reaches the handler,
and it is never delivered twice once React binds its own listener.

Nothing is required of you, and nothing changes once React fixes it.

React's own events are unaffected where they bubble. \`onClick\` on a
\`<helix-button>\` goes through the synthetic system, which hydration does set up.

A few of ours are native events relayed from inside the component, and the ones
that do not bubble (\`load\` and \`error\` on Avatar, \`ended\`, \`play\` and \`pause\` on
Video) reach nothing React sets up. The elements bind those for you, so
\`onError\` on a \`<helix-avatar>\` works like the rest.

## The prop is \`on\` plus the event name

React slices \`on\` off the prop and listens for exactly what is left, without
inspecting it.

- \`onhelix-open\` reaches \`helix-open\`. ✅
- \`onhelix-sample-start\` reaches \`helix-sample-start\`. ✅
- \`onHelixOpen\` binds an event called \`HelixOpen\`, which nobody dispatches. ❌

The number of hyphens does not matter, measured in Chrome against React 19.2.8.
An earlier version of this page said two were a hard stop; that was the
hydration bug above, read as a fact about names.

## Register once, in a client component

A custom element registers as a side effect of importing its module, and that
import has to be in the client graph to ever run. A server component's imports
do not ship to the browser. So one client component holds every element import
and renders \`null\`:

\`\`\`tsx
'use client'
import '@helix-io/web/card'
import '@helix-io/web/button'

export function HelixElements(): null {
  return null
}
\`\`\`

Render it once in your layout. **Your pages stay server components.** An
unregistered tag is just an unknown element in the HTML that upgrades when the
definition lands. Asking you to mark every page \`'use client'\` to use a button
would not be a design system.

## Import \`elements.css\` beside the base layer

\`\`\`ts
import '@helix-io/styles/base.css'
import '@helix-io/web/elements.css'
\`\`\`

It hides each tag with \`:not(:defined)\` until it upgrades, using \`visibility\` so
the page does not reflow. Without it a card arrives as a run of unstyled text
and then snaps into a card.

It is generated from the element sources and enumerates the tags, because CSS
cannot select "any custom element" and a bare \`:not(:defined)\` would also catch
your framework's dev overlay.

## Import from subpaths

\`\`\`ts
import '@helix-io/web/card' // ✅ one family
import '@helix-io/web' // ❌ the barrel
\`\`\`

One family per module, so you are not shipping the library to use a button.

## There is no declarative shadow DOM

Components render on the server through Lit SSR in our own tests, but the app
ships no DSD, and the shadow styles arrive with the definition rather than in
the markup. You do not need to configure anything for this; it is here so the
absence is not mistaken for something missing.

The short version of why: DSD cannot activate for script-inserted nodes, a
server component's output is replayed from the flight payload through DOM APIs
rather than re-run, and the patch that made it work hooked webpack, which
Turbopack ignores, silently.
`,
  versioning: `---
description: What a version number means here, and which packages move together.
order: 6
section: Getting started
title: Versioning
---

# Versioning

**Every Helix package shares one version.** \`@helix-io/web@1.4.0\` works with
\`@helix-io/headless@1.4.0\` and with \`@helix-io/styles@1.4.0\`, and that is a
guarantee rather than a coincidence: they are released together, always, from
one tag.

\`\`\`sh
bun add @helix-io/web@1.4.0 @helix-io/styles@1.4.0
\`\`\`

Pin them to the same number or pin none of them. A range that lets one drift
ahead of another is the one configuration this scheme does not defend against.

## Why lockstep

Cortex moves independently. Full-repo lockstep would be wrong here because the
documentation packages carry the version of what they document: publishing a
Cortex fix would bump \`@helix-io/docs\` to a version in which nothing about Helix
changed.

Per-domain lockstep keeps the property that matters, which is that two Helix
packages of the same version are the pair that was tested together.

## The version lives in the tag

Every manifest in the repository holds \`0.0.0-dev\`. The real number is stamped
in CI, seconds before packing.

If you read the source: a manifest saying \`0.0.0-dev\` is not an unreleased
package, it is every package. Committing the number back
would need a bot whose push access outranks branch protection, to record
something \`git tag\` already holds.

Two tag shapes, and the second is the useful one:

| Tag | Means |
|---|---|
| \`helix-v1.4.0\` | A release that promoted |
| \`helix-attempt-v1.4.0\` | A number that was spent and did not ship |

Version computation reads both, so a failed release burns a number rather than
poisoning the next one. If you see 1.4.0 skipped, that is what happened.

## Documentation is versioned with the code

\`@helix-io/docs@1.4.0\` documents Helix 1.4.0. There is no version axis inside
the package and no version switcher in it: the package version *is* the version,
because every package in the domain moves together.

A site serving several versions installs several versions, which is the
mechanism npm already provides and the only one that cannot drift.

## Stability

Components carry a \`status\` in the manifest and on their page: \`experimental\`,
\`stable\`, or \`deprecated\`. Most of the library is experimental today and says
so. That label is the honest one and it will not be softened to make the set
look more finished than it is.

## Release notes

On GitHub, generated from the tags. There is no changelog file in this package,
because a second copy of the release notes is a second thing to keep in step and
the one that goes stale is the one nobody is reading that week.
`,
  'visual-axes': `---
description: Four words with fixed vocabularies, one escape hatch, and the word that is refused.
section: Theming
title: Visual axes
---

# Visual axes

A component's visual choices come from four registered axes with fixed
vocabularies. You cannot invent a value, and a component may take a subset.

| Axis | Values |
|---|---|
| \`emphasis\` | \`ghost\`, \`outlined\`, \`solid\`, \`subtle\` |
| \`material\` | \`frosted\`, \`glass\`, \`transparent\` |
| \`separation\` | \`elevated\`, \`filled\`, \`outlined\`, \`plain\` |
| \`tone\` | The status and intent words: \`primary\`, \`accent\`, \`neutral\`, \`danger\`, and so on |
| \`width\` | \`auto\`, \`full\`, \`standard\` |

\`\`\`html
<helix-button
  emphasis="solid"
  tone="primary"
>Save</helix-button>
<helix-card separation="outlined">…</helix-card>
<helix-megamenu material="glass">…</helix-megamenu>
\`\`\`

## Why two axes

**The library had four axes and one word for all of them.** Counted across both
tiers, \`appearance\` held 21 declarations describing at least four different
questions: where a surface ends (\`outlined\` against \`plain\` on a Card), how much
ink a control claims (\`ghost\` against \`solid\` on a Button), which widget gets
rendered (\`segmented\` against \`underlined\` on Tabs), and in one case a plain
misfiled tone.

The tell is that \`outlined\` appeared in two of those groups meaning different
things. On a Card it says where the surface ends. On a Button it says how much
ink. Same word, two questions, and no way to ask one without answering the
other.

**\`appearance\` is refused outright now.** It is not a word this library uses,
and a component reintroducing it fails the build.

## Two axes, not one

This is the test, and the library found it before the registry existed.
\`megamenu-root.css\` reads: a consumer can make the panel glass, which is not an
appearance, because \`full\` already occupies that axis with a layout. A panel can
be glass *and* outlined. Two axes.

If you are adding a property and cannot decide which axis it belongs to, that is
usually the answer: it is two properties.

## \`variant\` is the escape hatch

\`\`\`html
<helix-tabs variant="segmented">…</helix-tabs>
<helix-time-picker variant="wheels">…</helix-time-picker>
\`\`\`

\`variant\` takes no registry, being component-specific by definition: \`segmented\`
against \`underlined\`, \`list\` against \`wheels\`, \`dots\` against \`marks\`. It is a
choice between two widgets, which is structural wherever it is made, so it lives
on either tier.

**What it may not be is a place to put something that is on an axis.** That is
the failure mode \`appearance\` demonstrated for 21 components.

## \`tone\` is the one axis both tiers carry

A styled axis never appears on the headless tier, which has nothing to paint and
no box to size. \`tone\` is the exception and a principled one: it says what a
thing *means*, and meaning survives having no stylesheet.
`,
  vue: `---
description: The one compiler setting Vue needs, and why props and events already work.
parent: installation
section: Getting started
title: Vue
---

# Vue

\`\`\`ts
import '@helix-io/web/vue'
\`\`\`

A types-only import, once. It augments Vue's \`GlobalComponents\` so every Helix
tag is typed in an SFC template, with its real props and its real events. The
generated file declares the augmentation under both \`vue\` and
\`@vue/runtime-core\`, because tooling disagrees about which one to read.

## Tell the compiler the tags are deliberate

Without this, Vue resolves \`<helix-button>\` as a component it cannot find and
warns on every render.

\`\`\`ts
// vite.config.ts
export default defineConfig({
  plugins: [
    vue({
      template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('helix-') } },
    }),
  ],
})
\`\`\`

The prefix test is the whole rule. Every element in the library is \`helix-\`
something, in both tiers, and nothing else is.

## Props and events need no ceremony

Vue sets a property when the element has one and falls back to an attribute
otherwise, which is exactly right for these: a string goes through either path
and an array or an object goes through the property.

\`\`\`vue
<helix-tabs :items="items" @helix-change="onChange" />
\`\`\`

\`@helix-change\` binds with \`addEventListener\`, so the name is the event's own.
Vue is the framework this works most quietly in, which is why this page is
short: there is no bridge and no wrapper, only the compiler setting above.

**Force the property with \`.prop\` if you ever need to**, for instance where a
string would be ambiguous:

\`\`\`vue
<helix-input :value.prop="'42'" />
\`\`\`

Rarely necessary, and it exists so you do not go looking for it.

## The controlled-property rule still applies

\`value\`, \`open\`, \`checked\` and \`active\` are claims of ownership in Helix, and
declaring one without answering it gives you a control that ignores input. Vue
has no type-level constraint for this the way the React types do, so read
[State and control](./state-and-control) before writing a form.

\`\`\`vue
<!-- Uncontrolled: the element owns it. -->
<helix-input default-value="Ada" label="Name" />

<!-- Controlled: you own it, so you answer it. -->
<helix-input :value="name" label="Name" @helix-input="name = $event.detail.value" />
\`\`\`
`,
  'without-a-bundler': `---
description: A page that uses Helix with no build step, and what that costs.
parent: installation
section: Getting started
title: Without a bundler
trailing: true
---

# Without a bundler

Helix ships standard ES modules and plain CSS files, so a page can use it with
no build step at all. Two ways, and they suit different things.

## Styles alone

\`\`\`html
<link
  href="/vendor/helix/tokens.css"
  rel="stylesheet"
/>
<link
  href="/vendor/helix/base.css"
  rel="stylesheet"
/>

<button
  data-button="solid"
  data-button-tone="primary"
>Save</button>
<div data-card>
  <h2>A card</h2>
  <p data-prose>Written in your own markup.</p>
</div>
\`\`\`

\`@helix-io/styles\` has no dependencies and no JavaScript. It carries the token
layer, the element reset, the type scale on bare headings, and recipes for
markup this library does not render, so a page can look like Helix without a
single custom element on it.

This is a real way to adopt Helix rather than a fallback, and it is the whole of
what some pages need. See [Recipes](./recipes) for what the base layer provides.

## The elements, through an import map

\`\`\`html
<script type="importmap">
  {
    "imports": {
      "@helix-io/web": "/vendor/helix/web/dist/index.js",
      "@helix-io/core": "/vendor/helix/core/dist/index.js",
      "@helix-io/icons": "/vendor/helix/icons/dist/index.js",
      "lit": "/vendor/lit/index.js"
    }
  }
</script>
<script type="module">
  import '@helix-io/web'
</script>
\`\`\`

The components are built on Lit, so \`lit\` has to resolve too. That is the part
that makes an import map necessary rather than optional: the package's own
imports are bare specifiers, and a browser needs to be told where each one is.

**Copy the files, do not point at a CDN.** An import map pointing at someone
else's server makes your page stop working when theirs does, which is the
dependency the Sovereignty Constraint exists to refuse. \`bun add\` and then copy
\`node_modules/@helix-io/*/dist\` into whatever you serve.

## What this costs

**Every element ships, whether the page uses one or not.** A bundler is what
drops the components you never wrote, and without one the browser fetches the
whole library. Fine for an internal tool or a prototype; not what you want on a
landing page.

You can narrow it by importing subpaths instead:

\`\`\`js
import '@helix-io/web/button'
import '@helix-io/web/dialog'
\`\`\`

Each still pulls its own dependencies, so this is a reduction rather than a
minimum, but for a page using five components it is a large one.

**No TypeScript, so no controlled-property constraint.** The type error that
catches \`value\` without a handler is a compile-time thing, and there is no
compile. The rule still applies, silently: see [State and
control](./state-and-control).

## The stylesheets are the same

\`\`\`html
<link
  href="/vendor/helix/tokens.css"
  rel="stylesheet"
/>
<link
  href="/vendor/helix/base.css"
  rel="stylesheet"
/>
<link
  href="/vendor/helix/web/elements.css"
  rel="stylesheet"
/>
\`\`\`

In that order, and \`elements.css\` matters more here than anywhere: with no
bundler the module graph arrives over the network, so the interval where the
markup exists and the definitions do not is longer than it is in a built app.
`,
}
