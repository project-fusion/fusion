#!/usr/bin/env node
/**
 * Writes each family's `base.html` and `base.css`, the headless tier's preview.
 *
 * **A base example is how anyone finds out whether that tier works.** It is the
 * only place the claim is tested: `headless` is advertised as independently
 * consumable, and the way to know is to take it, write every rule by hand, and
 * look. Doing that once across eighty families turned up an accordion that
 * never collapsed, twenty-one glyphs nobody outside the component could reach,
 * a chart palette no consumer could set, and a token the headless tier named
 * and could not resolve. None of those was visible from the styled tier, which
 * is exactly the point.
 *
 * **The markup is derived and machine-checked, which is what makes deriving it
 * safe.** Each `base.html` comes from the styled `default.html` beside it, so
 * copy and labels match and a reader switching tiers sees the same example
 * twice rather than two different ones. `check:examples` reads both manifests,
 * so a tag or attribute that does not exist on this tier fails the build: it
 * caught `rounded`, `divided`, `shape` and `raised`, all presentation the base
 * tier does not have.
 *
 * Only two styled tags need replacing, which is a fact about the tier's
 * coverage rather than about this script: `helix-text` becomes the element its
 * `as` names and `helix-flex` a plain box, because layout components have no
 * headless tier at all. Everything else has a `helix-base-` twin.
 *
 * **The stylesheets are the part that cannot be derived**, and most of what is
 * below is the record of finding that out in a browser. A part's name suggests
 * a rule and is wrong often enough to matter: `indicator` is a bar under a tab,
 * a dot on a badge and an `<svg>` chevron on a combobox, and one rule for all
 * three painted a black band across the badge and left the chevron 233 pixels
 * wide. So the generic vocabulary is deliberately conservative, a part it
 * cannot place gets no rule at all, and everything else is per family in
 * `HOST`, `INDICATORS` and `EXTRA`.
 *
 * **Three families are hand-written and never touched here**: accordion,
 * checkbox and dialog came first and carry prose this cannot generate.
 *
 * Run with `bun run examples:base`, or `--check` to fail when the files on disk
 * have drifted, which is `bun run check:examples-base` and part of
 * `bun run verify`. Drift is the ordinary case rather than a hypothetical: edit
 * a styled example and its base twin is stale until this runs again.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

import { format } from './lib/format-open-tags.mjs'

const manifest = JSON.parse(readFileSync('helix/headless/custom-elements.json', 'utf8'))
const BASE = new Map()
for (const mod of manifest.modules) {
  for (const d of mod.declarations ?? []) {
    if (!d.tagName) {
      continue
    }
    BASE.set(d.tagName, {
      attrs: new Set((d.attributes ?? []).map((a) => a.name)),
      parts: (d.cssParts ?? []).map((p) => p.name),
    })
  }
}

/* Presentation the headless tier does not have. `check:examples` would catch
   each of these, but naming them here keeps the failure list about real gaps.

   The visual axes of #158 are here for the same reason `appearance` is, and
   `appearance` is still here because twenty families have not been swept yet.
   A list rather than "whatever the base manifest lacks": a styled attribute the
   headless tier genuinely should have is a gap worth failing on, and stripping
   by absence would hide exactly that. */
const PRESENTATIONAL = new Set([
  'appearance',
  'data-density',
  'dense',
  'divided',
  'emphasis',
  'material',
  'raised',
  'rounded',
  'separation',
  'shape',
  'size',
  'tone',
  'variant',
  'width',
])

const displayName = (slug) =>
  slug
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')

/** `<helix-text as="h2">` is an `<h2>`; a bare one is a `<p>`. */
const detext = (html) =>
  html.replaceAll(/<helix-text\b([^>]*)>([\s\S]*?)<\/helix-text>/g, (_, attrs, body) => {
    const as = /\bas="([a-z0-9]+)"/.exec(attrs)?.[1] ?? 'p'
    const slot = /\bslot="([a-z-]+)"/.exec(attrs)
    return `<${as}${slot ? ` slot="${slot[1]}"` : ''}>${body}</${as}>`
  })

/** Layout components have no headless tier at all, so they become plain boxes. */
const delayout = (html) =>
  html
    .replaceAll(/<helix-(?:flex|grid)\b([^>]*)>/g, (_, attrs) => {
      const column = /\bdirection="column"/.test(attrs)
      const slot = /\bslot="([a-z-]+)"/.exec(attrs)
      return `<div class="${column ? 'stack' : 'row'}"${slot ? ` slot="${slot[1]}"` : ''}>`
    })
    .replaceAll(/<\/helix-(?:flex|grid)>/g, '</div>')

/* Per opening tag rather than across the whole file, and the reason is that one
   name is on both lists. `width` is a policy on a button, `auto` against `full`
   against `standard`, and a grid track on a table column, `16rem` or
   `minmax(0, 2fr)`: presentation in the first case and structure the headless
   tier owns in the second, which is why `helix-base-table-column` declares it.
   Stripping by name alone took it out of every base table.

   So the list says what is *presentation* and the manifest says what the tier
   *has*, and an attribute survives when the base element declares it. That is
   the sentence at the top of `PRESENTATIONAL` read literally rather than
   approximated by a name match. */
const strip = (html) =>
  html.replaceAll(/<helix-[a-z0-9-]+[^>]*>/g, (tag) => {
    const styled = /<(helix-[a-z0-9-]+)/.exec(tag)?.[1] ?? ''
    const declared = BASE.get(styled.replace('helix-', 'helix-base-'))?.attrs ?? new Set()
    let out = tag
    for (const name of PRESENTATIONAL) {
      if (declared.has(name)) {
        continue
      }
      // With a value, and bare: a boolean attribute is written `divided`, not
      // `divided=""`, and the first pattern alone walked past every one of them.
      out = out.replaceAll(new RegExp(`\\s+${name}="[^"]*"`, 'g'), '')
      out = out.replaceAll(new RegExp(`\\s+${name}(?=[\\s>])`, 'g'), '')
    }
    return out
  })

const rebase = (html) =>
  html.replaceAll(/<(\/?)helix-([a-z0-9-]+)/g, (whole, close, rest) => {
    const tag = `helix-base-${rest}`
    return BASE.has(tag) ? `<${close}${tag}` : whole
  })

/* What a token becomes in an example that cannot resolve one.
 *
 * The tags get rebased and an example's own `<style>` block did not, so a rule
 * copied from the styled twin arrived here still naming `--helix-space-sm`.
 * `headless` does not depend on `helix/styles`, so it resolves to nothing:
 * measured on Virtual List, where the gap and the inline padding of every row
 * vanished and the name ran into the note beside it. A missing custom property
 * is not an error in CSS, so the sheet was valid, the example rendered, and the
 * only sign was two words touching.
 *
 * Literals rather than the gray ramp's names, because these are lengths and the
 * ramp is colours. Small on purpose: anything not in here throws below rather
 * than passing through to be discovered by eye a second time. */
const LENGTHS = {
  '--helix-space-2xs': '0.125rem',
  '--helix-space-lg': '1rem',
  '--helix-space-md': '0.75rem',
  '--helix-space-sm': '0.5rem',
  '--helix-space-xs': '0.25rem',
}

const detoken = (html, slug) =>
  html.replaceAll(/var\((--helix-[a-z0-9-]+)\)/g, (_whole, name) => {
    const length = LENGTHS[name]
    if (length === undefined) {
      throw new Error(
        `${slug}: the example's own <style> names ${name}, which the headless tier cannot ` +
          'resolve, and no literal is recorded for it. Add one to LENGTHS, or take the rule ' +
          'out of the example: a token here resolves to nothing and the rule silently does ' +
          'nothing with it.',
      )
    }
    return length
  })

/**
 * A first stylesheet, from the parts every tag in the example actually renders.
 *
 * **No radii unless roundness is the shape rather than a softening.** A radio, a
 * spinner and a slider thumb are circles; a panel with a rounded corner is a
 * decision somebody made about how it should feel, and this tier does not make
 * it.
 *
 * **Conservative by construction.** A part whose job is not obvious from its
 * name gets no rule at all, because a wrong rule is worse than none: the
 * checkbox's first base sheet painted a box and left the input at
 * `appearance: auto`, so the browser drew its own control and every rule below
 * did nothing visible. Silence leaves the platform's own rendering, which is at
 * least honest about what the tier gives you.
 */
const ROUND = new Set(['dot', 'handle', 'knob', 'spinner', 'thumb'])

/* Families whose control is one the browser draws for itself, and which
   therefore has to be turned off before anything here can be seen. */
const DRAWN = new Set(['checkbox', 'radio', 'switch'])

/* Charts paint with `fill` and `stroke` rather than `background-color`, and the
   ramp is walked from light to dark so the ink lands where the data is: the
   grid is nearly invisible, the axis is a hairline, the mark is solid.

   **One gray for every series, and that is a finding rather than a choice.**
   The headless tier writes `data-series="1"` on each bar and line, which is
   exactly what a consumer would key a palette on, and `::part()` cannot be
   narrowed by an attribute selector. Measured: of three rules written against
   one chart, `::part(bar)` applied and both `::part(bar)[data-series="2"]` and
   `::part(bar):nth-child(2)` were dropped at parse time, leaving four bars one
   colour. The styled tier does it from inside its own shadow root, where a
   plain attribute selector works. Nobody outside can. #138. */
/* `trend` is not one, and it was in this set for a whole pass. It is an arrow,
   a metric and a judgement about which way is good news: no data source, no
   `MixinChartSource`, no plot, and its only parts are `direction` and `icon`.
   Being here bought it a six-shade series palette it never reads and paint
   rules that matched nothing, which is dead CSS in a file whose whole job is to
   show a consumer what has to be styled. The tell was available the whole time,
   in the part list. */
const CHART = new Set(['bar-chart', 'donut-chart', 'legend', 'line-chart', 'sparkline'])

const chartRule = (part) => {
  if (part === 'svg') {
    return 'display: block;\n  inline-size: 100%;'
  }
  if (/^(gridline|band)$/.test(part)) {
    return 'stroke: var(--_gray-fill);'
  }
  if (/^(axis|baseline|tick|guide)$/.test(part)) {
    return 'stroke: var(--_gray-line);'
  }
  if (/^(bar|slice|point|terminus)$/.test(part)) {
    return 'fill: var(--chart-series, var(--chart-series-1));'
  }
  if (part === 'line') {
    /* `non-scaling-stroke`, because the plot has a `viewBox` and a stroke is
       scaled with it: a width of 2 came out a finger thick. */
    return 'fill: none;\n  stroke: var(--chart-series, var(--chart-series-1));\n  stroke-width: 2;\n  vector-effect: non-scaling-stroke;'
  }
  if (part === 'segment') {
    /* The ring is a stroke and how thick it is is the component's own
       arithmetic: `--donut-chart-stroke` is derived from `hole` and published
       for exactly this. With no width the arc is drawn and nothing appears. */
    return 'fill: none;\n  stroke: var(--chart-series, var(--chart-series-1));\n  stroke-width: var(--donut-chart-stroke);'
  }
  if (part === 'swatch') {
    return 'background-color: var(--chart-series, var(--chart-series-1));\n  block-size: 0.75rem;\n  display: inline-block;\n  flex: none;\n  inline-size: 0.75rem;'
  }
  if (part === 'entry') {
    return 'align-items: center;\n  display: flex;\n  gap: 0.5rem;'
  }
  if (part === 'area') {
    return 'fill: var(--chart-series, var(--chart-series-1));\n  opacity: 0.25;'
  }
  if (/^(label|labels)$/.test(part)) {
    return 'fill: var(--_gray-muted);\n  font-size: 0.75rem;'
  }
  return null
}

const rulesFor = (part, slug) => {
  if (CHART.has(slug)) {
    const painted = chartRule(part)
    if (painted !== null) {
      return painted
    }
  }
  if (part === 'field') {
    // A `<label>` wrapping the control, its name and its hint. A box, not an input.
    return 'align-items: center;\n  display: flex;\n  gap: 0.5rem;'
  }
  if (part === 'control') {
    return DRAWN.has(slug)
      ? 'appearance: none;\n  background-color: var(--_gray-surface);\n  block-size: 1rem;\n  border: 1px solid var(--_gray-line);\n  inline-size: 1rem;\n  margin: 0;'
      : 'font: inherit;'
  }
  if (/^(label|summary|title|heading)$/.test(part)) {
    return 'color: var(--_gray-strong);\n  font-weight: 600;'
  }
  if (/^(hint|feedback|description|caption)$/.test(part)) {
    return 'color: var(--_gray-muted);\n  font-size: 0.875em;'
  }
  if (/^(trigger|button|close|dismiss|next|previous|back|clear|toggle)$/.test(part)) {
    return 'all: unset;\n  box-sizing: border-box;\n  cursor: pointer;'
  }
  if (/^(panel|popover|menu|listbox|surface|dialog|drawer|tooltip|sheet)$/.test(part)) {
    return 'background-color: var(--_gray-surface);\n  border: 1px solid var(--_gray-line);\n  color: var(--_gray-strong);\n  padding: 0.5rem;'
  }
  if (/^(item|option|row|tab|crumb|day|cell)$/.test(part)) {
    /* **Undressed, because several of these are `button`s.** A `button` left
       alone is drawn by the browser, and in a dark scheme that is `buttonface`,
       a mid gray: Video Playlist's duration measured 4.4:1 on one. Padding alone
       said where the row was and left the platform to paint it. */
    return 'background-color: transparent;\n  border: 0;\n  padding: 0.25rem 0.5rem;'
  }
  if (/^(items|list|actions|controls|options|group|toolbar)$/.test(part)) {
    return 'align-items: center;\n  display: flex;\n  gap: 0.25rem;'
  }
  if (/^(track|groove|rail)$/.test(part)) {
    return 'background-color: var(--_gray-fill);\n  block-size: 0.5rem;\n  display: block;\n  inline-size: 100%;'
  }
  if (/^(fill|bar|progress)$/.test(part)) {
    return 'background-color: var(--_gray-mark);\n  display: block;'
  }
  if (ROUND.has(part)) {
    return 'background-color: var(--_gray-strong);\n  block-size: 0.75rem;\n  display: block;\n  inline-size: 0.75rem;'
  }
  if (/^(icon|svg|chevron|caret|arrow|separator|glyph|check|mark|[a-z-]+-mark)$/.test(part)) {
    // An `<svg>` with no size fills whatever contains it: a callout came out as
    // a black half-circle the width of the card and a breadcrumb separator was
    // taller than the trail it sat in.
    return 'block-size: 1em;\n  flex: none;\n  inline-size: 1em;'
  }
  return null
}

/**
 * Rules a part name cannot imply, keyed on the family.
 *
 * Two kinds. Some components *are* the box, so the rule goes on the host and no
 * part exists to hang it off: an avatar with no size is its initials, a QR code
 * with no size is nothing at all. And some publish a measurement whose whole
 * purpose is to be read by a rule the consumer writes, which is the case #137
 * made reachable: an indicator knows where the active item is and only a
 * stylesheet can move a box there.
 */
const HOST = {
  /* A row with the message at one end and the way out at the other.
     Undirected, the dismiss dropped under the text, which reads as a second
     paragraph rather than as a control. */
  announcement: `helix-base-announcement {
  align-items: center;
  border-block-end: 1px solid var(--_gray-line);
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
}`,
  /* A bar, which is the one thing this component is.
     Its regions are named start, content and end, and with nothing laying them
     out they stacked: a logo, then the nav, then the actions, three lines down
     the page where every app header ever built is one line across. */
  'app-header': `helix-base-app-header {
  border-block-end: 1px solid var(--_gray-line);
  display: block;
}`,
  avatar: `helix-base-avatar {
  align-items: center;
  background-color: var(--_gray-fill);
  block-size: 2.5rem;
  border-radius: 50%;
  color: var(--_gray-strong);
  display: inline-flex;
  font-size: 0.875rem;
  inline-size: 2.5rem;
  justify-content: center;
  overflow: hidden;
}`,
  /* A mark on the corner of what it counts, which is what makes it a badge.
     The count sat inline after the bell, reading as the word "3" beside an
     icon rather than as a number on it. The host is the positioning context
     and the indicator hangs off it, below. */
  badge: `helix-base-badge {
  display: inline-flex;
  position: relative;
}`,
  /* A row of buttons that touch, which is the group's only reason to exist.
     Undirected they stacked and read as three separate controls. */
  'button-group': `helix-base-button-group {
  display: inline-flex;
  gap: 0.25rem;
}`,
  /* A box, because that is the whole of what a card is.
     With nothing on the host a card was a heading and a paragraph loose on the
     page, indistinguishable from the prose around it. */
  card: `helix-base-card {
  background-color: var(--_gray-surface);
  border: 1px solid var(--_gray-line);
  display: block;
  padding: 0.75rem;
}`,
  divider: `helix-base-divider {
  background-color: var(--_gray-line);
  block-size: 1px;
  border: 0;
  display: block;
}

helix-base-divider[orientation="vertical"] {
  align-self: stretch;
  block-size: auto;
  inline-size: 1px;
}`,
  /* Stacked and centred, because an empty state is a small notice and not a
     sentence: the heading, the line under it and the action ran together on
     one line, reading as prose with a link in it. */
  empty: `helix-base-empty {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem;
  text-align: center;
}`,
  image: `helix-base-image {
  background-color: var(--_gray-fill);
  display: block;
  max-inline-size: 100%;
}`,
  loader: `helix-base-loader {
  block-size: 1.5rem;
  color: var(--_gray-mark);
  display: inline-block;
  inline-size: 1.5rem;
}`,
  /* A box to be a fraction of. The track is `inline-size: 100%` and the host had
     no width to take a percentage of, so a meter reading 42% rendered as the
     characters "42%" and no bar at all. */
  meter: `helix-base-meter {
  display: block;
}`,
  'qr-code': `helix-base-qr-code {
  display: block;
  inline-size: 8rem;
}`,
  'scroll-area': `helix-base-scroll-area {
  block-size: 8rem;
  border: 1px solid var(--_gray-line);
  display: block;
}`,
  skeleton: `helix-base-skeleton {
  background-color: var(--_gray-fill);
  display: block;
  min-block-size: 1em;
}`,
  splitter: `helix-base-splitter {
  block-size: 8rem;
  border: 1px solid var(--_gray-line);
  display: block;
}

/* The divider is the component's whole point, so it has to be visible before
   anything else here matters. */
helix-base-splitter::part(divider) {
  background-color: var(--_gray-line);
}`,
  table: `/* The column tracks are the component's arithmetic, published as
   \`--table-template\` because only it has counted the columns. */
helix-base-table::part(table) {
  display: grid;
  grid-template-columns: var(--table-template);
}

helix-base-table-row {
  display: contents;
}

helix-base-table-cell {
  border-block-end: 1px solid var(--_gray-line);
  padding: 0.375rem 0.5rem;
}`,
  'virtual-list': `helix-base-virtual-list {
  border: 1px solid var(--_gray-line);
  display: block;
}`,
}

/* Where the active item is, published by \`IndicatorController\` and reachable
   since #137. The mark is a rule the consumer writes, which is the point: the
   controller measures and says nothing about what is drawn. */
const INDICATOR = (tag, container, along) => `${tag}::part(${container}) {
  position: relative;
}

${tag}::part(indicator) {
  background-color: var(--_gray-strong);
  ${along === 'inline' ? 'block-size: 2px;\n  inline-size: var(--indicator-width, 0);' : 'block-size: var(--indicator-height, 0);\n  inline-size: 2px;'}
  inset-block-start: 0;
  inset-inline-start: 0;
  position: absolute;
  ${along === 'inline' ? 'translate: var(--indicator-x, 0) calc(var(--indicator-y, 0px) + var(--indicator-height, 0px));' : 'translate: var(--indicator-x, 0) var(--indicator-y, 0);'}
}`

const INDICATORS = {
  navigation: INDICATOR('helix-base-navigation', 'list', 'inline'),
  outline: INDICATOR('helix-base-outline', 'list', 'block'),
  tabs: INDICATOR('helix-base-tabs', 'tabs', 'inline'),
  toggle: INDICATOR('helix-base-toggle-group', 'group', 'inline'),
}

/**
 * The families a part name could not describe, done by hand.
 *
 * Each is here because the generic vocabulary either aimed at a part that does
 * not exist or produced something that reads wrong: `splitter` has a
 * `separator` and no `divider`, `stat` publishes no parts at all and is laid
 * out entirely from the host, and a switch's `control` is a hit target lying
 * over its track rather than a box beside it.
 */
/* **Filled, not coloured.** These parts are `<svg>`s, and an `<svg>` given no
   `fill` takes SVG's initial value, black, inheriting nothing from the `color`
   around it. Sized and never painted, Tree's chevron read 1:1 against the dark
   half of these sheets: on the light half black on near-white looks like a
   diagram drawn in ink, which is why it went unnoticed. */
const GLYPH = `block-size: 1em;
  fill: var(--_gray-muted);
  flex: none;
  inline-size: 1em;`

/* A button with edges, defined once because two examples render one.
 *
 * The branch that undresses triggers is right that the platform should not paint
 * a control, and it leaves a button as bare text: the example rendered the word
 * "Button" and nothing else, which is not a diagram of a button. `EXTRA` is
 * keyed by family, so Button had a box and Button Group, whose three children
 * are buttons, did not. */
const BUTTON_BOX = `helix-base-button::part(button) {
  background-color: var(--_gray-surface);
  border: 1px solid var(--_gray-line);
  cursor: pointer;
  display: inline-flex;
  padding: 0.25rem 0.75rem;
}`

const EXTRA = {
  announcement: `helix-base-announcement::part(content) {
  flex: 1;
}`,
  'app-header': `helix-base-app-header::part(row) {
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  min-block-size: 3rem;
  padding: 0 0.75rem;
}

helix-base-app-header::part(content) {
  flex: 1;
}`,
  /* Off the corner, and small enough to be a count rather than a label. */
  badge: `helix-base-badge::part(indicator) {
  background-color: var(--_gray-strong);
  border-radius: 999px;
  color: var(--_gray-surface);
  font-size: 0.6875rem;
  inset-block-start: -0.25rem;
  inset-inline-end: -0.5rem;
  line-height: 1;
  min-inline-size: 1rem;
  padding: 0.125rem 0.25rem;
  position: absolute;
  text-align: center;
}`,
  /* A control with edges. The branch that undresses triggers and buttons is
     right that the platform should not paint them, and it leaves a button as
     bare text: the example rendered the word "Button" and nothing else, which
     is not a diagram of a button. */
  button: BUTTON_BOX,
  'button-group': BUTTON_BOX,
  carousel: `helix-base-carousel::part(track) {
  background-color: transparent;
  block-size: auto;
  display: flex;
  gap: 0.5rem;
  overflow: hidden;
}`,
  combobox: `helix-base-combobox::part(indicator) {
  ${GLYPH}
}`,
  /* Eight parts in the library are an `<svg>` under a name the vocabulary reads
     as a box, and an svg with no size fills its container: the combobox's
     chevron measured 233 by 233. Found by asking which parts are svgs rather
     than by looking, which is the only way to know the list is complete. */
  /* A column of commands inside one box, not a row of them inside two.
   
     Two names did the damage. items matched the branch that lays a group out
     along a line, so three commands sat side by side across the palette, which
     is a toolbar and not a list. And listbox matched the branch that draws a
     panel, so the list took a surface and a border of its own inside the
     dialog's: a bordered box within a bordered box, and inline into the
     bargain, which is what drew the stray rectangle under the commands.
   
     The dialog is the surface here. A listbox inside a command palette is the
     palette, so it carries nothing of its own and the rows stack. */
  command: `helix-base-command::part(items) {
  align-items: stretch;
  flex-direction: column;
}

helix-base-command::part(listbox) {
  background-color: transparent;
  border: 0;
  display: block;
  padding: 0;
}`,
  'copy-button': `helix-base-copy-button::part(button) {
  border: 1px solid var(--_gray-line);
  padding: 0.375rem;
}`,
  'icon-button': `helix-base-icon-button::part(button) {
  border: 1px solid var(--_gray-line);
  padding: 0.375rem;
}`,
  /* A row with air in it. Both lines of a row ran together, so a name and the
     caption under it read as one run of words. */
  list: `helix-base-list-item::part(row) {
  align-items: baseline;
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem 0;
}`,
  /* A column, the options having matched the branch that lays a group out
     along a line: four options ran across the page as a sentence. */
  listbox: `helix-base-listbox::part(items) {
  align-items: stretch;
  flex-direction: column;
}`,
  loader: `helix-base-loader::part(svg) {
  block-size: 100%;
  inline-size: 100%;
}

helix-base-loader::part(track) {
  fill: none;
  stroke: var(--_gray-fill);
  stroke-width: 4;
}

helix-base-loader::part(indicator) {
  fill: none;
  stroke: var(--_gray-strong);
  stroke-width: 4;
}`,
  meter: `helix-base-meter::part(track) {
  background-color: transparent;
  block-size: auto;
  fill: none;
  stroke: var(--_gray-fill);
  stroke-width: 8;
}`,
  outline: `helix-base-outline::part(list) {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}`,
  /* No markers, and a row. The run of pages is an <ol>, so every page carried
     the browser's own numbering beside its own: "1. 1  2. 2  3. 3" down the
     control, which reads as two paginations interleaved. */
  pagination: `helix-base-pagination::part(list) {
  align-items: center;
  display: flex;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}`,
  /* A box, because a cell here is an `<input>` and the branch that matched it
     undresses its subjects on purpose.
   
     That branch is right about the rows and tabs it was written for, several of
     which are `button`s the platform would otherwise paint. Applied to a text
     box it takes the border off and leaves the width to the UA, which is about
     twenty characters: measured, six cells came to 1,021 pixels against a 640
     frame, and every one of them invisible. The example rendered a label, a hint
     and nothing that looked like a code field.
   
     So the diagram says what a consumer has to say: how wide a cell is, that it
     has an edge, and that one character sits in the middle of it. */
  'pin-input': `helix-base-pin-input::part(cell) {
  background-color: var(--_gray-surface);
  border: 1px solid var(--_gray-line);
  inline-size: 2rem;
  padding: 0.25rem;
  text-align: center;
}`,
  progress: `helix-base-progress::part(track) {
  background-color: var(--_gray-fill);
  block-size: 0.5rem;
  display: block;
  overflow: hidden;
}

helix-base-progress::part(indicator) {
  background-color: var(--_gray-strong);
  block-size: 100%;
  display: block;
  inline-size: calc(var(--progress-fraction, 0) * 100%);
}`,
  'qr-code': `helix-base-qr-code::part(code) {
  block-size: auto;
  display: block;
  inline-size: 100%;
}`,
  rating: `/* The mark ships with no glyph, deliberately, so the example draws one.
   A square rotated forty-five degrees is a diamond and needs no asset.
   
   display is the load-bearing line and was the missing one. A mark is an inline
   box, and width and height do not apply to those, so a rule giving it three
   quarters of a rem left ten marks at zero by zero with their fill set and
   nothing on screen at all. */
helix-base-rating::part(mark) {
  background-color: currentColor;
  block-size: 0.75rem;
  display: block;
  inline-size: 0.75rem;
  rotate: 45deg;
}

/* Two layers in one place, which is what this component is.
   
   Both track and fill hold every mark, and the fill is a clip of the whole row
   rather than a subset of it, so they have to be stacked and not laid side by
   side. Left to the name-matching, marks became a row, track became a progress
   groove painted over the marks it is made of, and fill was a block: the
   component rendered as half a rem of flat grey, and with the groove removed it
   rendered as nothing.
   
   The width of the clip is the component's own arithmetic, published as
   --rating-full, --rating-part and --rating-steps on the container so a sheet
   can say this without knowing the score. */
helix-base-rating::part(marks) {
  display: inline-block;
  position: relative;
}

/* Coloured through currentColor, because a consumer cannot reach inside.
   
   A filled mark is a mark inside the fill layer, and ::part(fill) [part="mark"]
   selects nothing: ::part() reaches the part and no further, so descendants of a
   part are unreachable from outside the tree. The styled tier writes exactly
   that selector and it works there, its sheet being inside the shadow root.
   Colour inherits across the boundary where a selector does not, so the layers
   set it and the marks take it. */
helix-base-rating::part(track),
helix-base-rating::part(fill) {
  background-color: transparent;
  block-size: auto;
  display: flex;
  gap: 0.25rem;
  inline-size: auto;
}

helix-base-rating::part(track) {
  color: var(--_gray-fill);
}

helix-base-rating::part(fill) {
  inline-size: calc(
    (var(--rating-full, 0) + var(--rating-part, 0)) / var(--rating-steps, 1) * 100%
  );
  inset-block-start: 0;
  inset-inline-start: 0;
  overflow: hidden;
  position: absolute;
}

helix-base-rating::part(fill) {
  color: var(--_gray-strong);
}`,
  select: `helix-base-select::part(indicator) {
  ${GLYPH}
}`,
  skeleton: `helix-base-skeleton::part(skeleton) {
  background-color: var(--_gray-fill);
  display: block;
  min-block-size: 1em;
}`,
  /* The grid the component measured for itself.
     `table` names its own columns in `--table-template` and nothing read it, so
     the cells fell into the flow and every heading ran into the next:
     "ServiceRegionStatus" across the top and the rows under it out of step. */
  /* The example's own layout, which the styled twin keeps in `default.css` and
     this generator does not carry across.
   
     A skeleton has no size of its own, deliberately: it is a placeholder for
     something whose shape the consumer knows. So the classes are the diagram,
     and without them the example rendered nothing at all, which reads as a
     component that does not work rather than as one waiting to be told how big
     it is. Widths are unequal on purpose, two bars of a length being a pattern
     and a pattern reading as decoration. */
  skeleton: `.row {
  align-items: center;
  display: flex;
  gap: 0.75rem;
}

.avatar {
  block-size: 2.5rem;
  border-radius: 50%;
  inline-size: 2.5rem;
}

.stack,
.lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
}

.line-name {
  inline-size: 40%;
}

.line-detail {
  inline-size: 70%;
}`,
  slider: `/* The control stays the platform's range input, so \`accent-color\` is the
   whole of what a grayscale slider needs. */
helix-base-slider::part(control) {
  accent-color: var(--_gray-strong);
  inline-size: 100%;
}`,
  splitter: `/* The panes and the handle between them, which is the whole
   component: without a row the two stack and the separator is a stray square. */
helix-base-splitter::part(start),
helix-base-splitter::part(end) {
  min-inline-size: 0;
  overflow: auto;
  padding: 0.5rem;
}

helix-base-splitter::part(separator) {
  background-color: var(--_gray-line);
  block-size: 100%;
  cursor: col-resize;
  inline-size: 3px;
}`,
  stat: `/* No parts at all, so the arrangement is the host and its children. */
helix-base-stat-group {
  display: flex;
  gap: 1.5rem;
}

helix-base-stat {
  display: flex;
  flex-direction: column;
  font-size: 1.25rem;
}

helix-base-stat [slot="label"] {
  color: var(--_gray-muted);
  font-size: 0.75rem;
}`,
  switch: `/* The input is the hit target and lies over the track, which is what
   draws. Left visible it is a checkbox sitting beside a switch. */
helix-base-switch::part(track) {
  block-size: 1rem;
  border-radius: 0.5rem;
  display: inline-block;
  inline-size: 1.75rem;
  position: relative;
}

helix-base-switch::part(control) {
  block-size: 100%;
  inline-size: 100%;
  inset: 0;
  margin: 0;
  opacity: 0;
  position: absolute;
}

/* No transition, and \`check:motion\` is why it is worth saying: anything that
   moves owes a \`prefers-reduced-motion\` block repeating the same selector. A
   skeletal sheet has nothing to gain from the animation and would be teaching
   the omission along with it. */
helix-base-switch::part(thumb) {
  inset-block-start: 0.125rem;
  inset-inline-start: 0.125rem;
  position: absolute;
}

helix-base-switch[data-checked]::part(track) {
  background-color: var(--_gray-strong);
}

helix-base-switch[data-checked]::part(thumb) {
  background-color: var(--_gray-surface);
  translate: 0.75rem 0;
}`,
  table: `helix-base-table::part(table) {
  display: grid;
  gap: 0.25rem 1rem;
  grid-template-columns: var(--table-template, 1fr);
}

/* The head and every row take no box, so their cells are the grid's items.
   
   That is stated in the component's own docs as something the styled tier does,
   and the styled tier was the only place it was written: without it the cells
   stayed inside their rows, the grid had three items where it wanted nine, and
   the three headings ran together as "ServiceRegionStatus" with the rows under
   them out of step. */
helix-base-table::part(head),
helix-base-table-row {
  display: contents;
}`,
  tag: `helix-base-tag {
  align-items: center;
  background-color: var(--_gray-fill);
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
}`,
  'time-picker': `helix-base-time-picker::part(list),
helix-base-time-picker::part(items) {
  align-items: stretch;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  max-block-size: 12rem;
  overflow-y: auto;
}`,
  timeline: `/* Rail then content, side by side. Without a row the marker lands
   wherever the text ends, which is the right-hand edge. */
helix-base-timeline-item {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: auto 1fr;
}

/* The rail runs down beside the entries, and the generic rule drew it
   as a full-width bar across each one: measured 394 by 8, which is a band. */
helix-base-timeline-item::part(rail) {
  background-color: transparent;
  block-size: auto;
  display: flex;
  flex-direction: column;
  inline-size: auto;
}

helix-base-timeline-item::part(connector) {
  background-color: var(--_gray-fill);
  flex: 1;
  inline-size: 1px;
  margin-inline: auto;
  min-block-size: 0.75rem;
}

helix-base-timeline-item::part(marker) {
  align-items: center;
  display: flex;
  justify-content: center;
}

helix-base-timeline-item::part(dot) {
  background-color: var(--_gray-mark);
  block-size: 0.5rem;
  border-radius: 50%;
  inline-size: 0.5rem;
}`,
  /* A stack of messages, each one a row inside a box.
     Left alone the tone mark, the message and the dismiss ran together and the
     messages had no surface to sit on. */
  toast: `helix-base-toast::part(region) {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

helix-base-toast-item::part(item) {
  align-items: center;
  background-color: var(--_gray-surface);
  border: 1px solid var(--_gray-line);
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
}

helix-base-toast-item::part(content) {
  flex: 1;
}`,
  tree: `/* Down and indented, which is what nesting means.
   
   Both tree and group matched the branch that lays a group out along a line, so
   a parent and its children ran across the page: Item One, then Item Two and
   Item Three beside it, then Item Four, with nothing saying which contained
   which. A tree that reads left to right is a breadcrumb. */
helix-base-tree::part(tree),
helix-base-tree-item::part(group) {
  align-items: stretch;
  display: flex;
  flex-direction: column;
}

helix-base-tree-item::part(group) {
  padding-inline-start: 1rem;
}

/* The chevron is the toggle itself, not a glyph inside one. */
helix-base-tree-item::part(toggle) {
  ${GLYPH}
  cursor: pointer;
}

helix-base-tree-item::part(row) {
  align-items: center;
  display: flex;
  gap: 0.25rem;
  padding-inline-start: calc(var(--tree-level, 0) * 1rem);
}`,
  /* A column, because `items` and `list` match the branch that lays a group of
     things out along a line and a list of times is not one.
   
     Left to it, the headless Time Picker drew all ninety-six quarter hours in a
     single row: measured at 4,896 pixels wide against a 640 frame, which is one
     row of clipped type and no picker at all. `outline` above is the same fix
     for the same reason, and both are the price of keying rules off a part's
     name.
   
     The height and the scroll are part of the diagram rather than decoration. A
     list of ninety-six is unusable at its natural height whatever direction it
     runs in, so a consumer taking this tier has to bound it, and a skeletal
     sheet that leaves that out is not showing them the work. */
  /* A bounded box, because a virtual list has nothing to compute without one.
   
     None of the three part names matched anything, so the sheet said nothing
     about the one part that decides whether the component works: the viewport
     is the scrolling box, and a window of rows is derived from its height. With
     no height and no overflow there is no window, so the example rendered two
     pixels of ink over two thousand rows of data and looked like a component
     that had failed to load.
   
     This is the diagram doing its job rather than a workaround. A consumer
     taking this tier has to bound the viewport or get the same nothing. */
  'virtual-list': `helix-base-virtual-list::part(viewport) {
  block-size: 12rem;
  overflow-y: auto;
}`,
}

const FOCUSABLE = /^(trigger|button|control|close|toggle|tab|option|item)$/

const sheetFor = (slug, tagsUsed, usesRow, usesStack) => {
  const blocks = []
  const seen = new Set()
  let ring
  for (const tag of tagsUsed) {
    for (const part of BASE.get(tag)?.parts ?? []) {
      const key = `${tag}::part(${part})`
      if (seen.has(key)) {
        continue
      }
      const body = rulesFor(part, slug)
      if (body === null) {
        continue
      }
      seen.add(key)
      const round = ROUND.has(part) ? '\n  border-radius: 50%;' : ''
      blocks.push(`${key} {\n  ${body}${round}\n}`)
      if (ring === undefined && FOCUSABLE.test(part)) {
        ring = key
      }
    }
  }
  if (ring !== undefined) {
    blocks.push(
      `/* The keyboard reaches this, so the ring goes here. Taking the UA outline\n   off without putting one back is the commonest way a headless control stops\n   being operable without a pointer. */\n${ring}:focus-visible {\n  outline: 2px solid var(--_gray-mark);\n  outline-offset: 2px;\n}`,
    )
  }
  const layout = [
    usesRow ? '.row {\n  align-items: center;\n  display: flex;\n  gap: 0.5rem;\n}' : null,
    usesStack ? '.stack {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}' : null,
  ].filter(Boolean)
  /* A chart reads `--chart-series-N` for the nth series, so a consumer on this
     tier supplies the palette. Six shades walking the ramp, which is as many as
     a grayscale chart can keep apart: past that the reader is counting, not
     comparing, and a chart wanting more wants colour. */
  const palette = CHART.has(slug)
    ? [
        `helix-base-${slug} {\n${[
          ['#2a2a2e', '#e9e9ec'],
          ['#4a4a50', '#c9c9ce'],
          ['#6b6b73', '#a1a1aa'],
          ['#8e8e96', '#86868f'],
          ['#b1b1b8', '#63636b'],
          ['#d2d2d7', '#45454b'],
        ]
          .map(([light, dark], at) => `  --chart-series-${at + 1}: light-dark(${light}, ${dark});`)
          .join('\n')}\n}`,
      ]
    : []
  /* Every sheet, because any family may render one and an unsized
     `helix-base-icon` is 110 pixels of chevron. */
  const icon = `helix-base-icon {
  block-size: 1em;
  display: inline-flex;
  flex: none;
  inline-size: 1em;
}`
  const extra = [icon, HOST[slug]].filter(Boolean)
  const last = [INDICATORS[slug], EXTRA[slug]].filter(Boolean)
  const rules = [...layout, ...palette, ...extra, ...blocks, ...last]
  return `/* What the headless tier asks a consumer to write for ${displayName(slug)}.
 *
 * Deliberately skeletal: a diagram of what has to be styled, not a theme to
 * copy. No token, because \`headless\` does not depend on \`helix/styles\` and a
 * consumer taking that tier has none to reach for. No corner radius, because
 * rounding says how a thing should feel and that is not this tier's to say; the
 * exceptions are shapes that are round rather than softened.
 *
 * **Grays, and only grays.** A base example is a diagram, and colour in a
 * diagram reads as meaning: a blue fill says primary and a red one says danger,
 * neither of which this tier has an opinion about. A neutral ramp says nothing
 * except where one surface ends and the next begins, which is the whole job.
 *
 * Named by role rather than numbered, because a number implies a scale somebody
 * maintains and this is seven values in one file. Underscored, because they are
 * declared and read in that same file and never leave it, which is the one case
 * the sigil is for: \`check:hooks\` pairs a public name with an \`@cssproperty\`
 * and would otherwise ask this example to publish its own palette. Written through
 * \`light-dark()\` with \`color-scheme\` declared, so the sandbox's dark mode gets
 * a sheet that inverts rather than a pale card on a dark page: the headless tier
 * has no theming and this is the cheapest honest substitute.
 *
 * A part with no rule below is one the platform already renders acceptably. A
 * wrong rule is worse than none: the first checkbox sheet painted a box and left
 * the input at \`appearance: auto\`, so the browser drew its own control and
 * nothing written for it was ever visible. */

:root {
  color-scheme: light dark;
  --_gray-surface: light-dark(#fafafa, #18181b);
  --_gray-subtle: light-dark(#f0f0f1, #232326);
  --_gray-fill: light-dark(#e2e2e5, #2f2f33);
  --_gray-line: light-dark(#c9c9ce, #45454b);
  --_gray-mark: light-dark(#8e8e96, #86868f);
  --_gray-muted: light-dark(#63636b, #a1a1aa);
  --_gray-strong: light-dark(#2a2a2e, #e9e9ec);
}
${rules.length > 0 ? `\n${rules.join('\n\n')}\n` : ''}`
}

const families = readdirSync('helix/web/src', { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((f) => existsSync(`helix/web/src/${f}/.examples/default.html`))
  .filter((f) => existsSync(`helix/headless/src/${f}`))

const only = process.argv.slice(2).filter((argument) => !argument.startsWith('--'))
const wanted = only.length > 0 ? families.filter((f) => only.includes(f)) : families

const checking = process.argv.includes('--check')
const made = []
const stale = []
const HAND_WRITTEN = new Set(['accordion', 'checkbox', 'dialog'])

for (const slug of wanted) {
  if (HAND_WRITTEN.has(slug) && only.length === 0) {
    continue
  }
  const source = readFileSync(`helix/web/src/${slug}/.examples/default.html`, 'utf8')
  const body = detoken(
    rebase(delayout(detext(strip(source.replace(/<!--[\s\S]*?-->\s*/, ''))))),
    slug,
  )
  /* Formatted here rather than left to `format-examples.mjs`, which would
     rewrite it a moment later and leave every file reporting as drifted. One
     rule, one implementation, run by both. */
  /* The source's own `<link>` comes out first, because this adds one.
     Skeleton's twin links its sheet in the markup rather than relying on the
     example runner, so the base copy carried two identical links: harmless to
     render and a diagram that tells a reader to write the line twice. */
  const linked = body.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>\s*/gi, '')
  const html =
    format(`<!-- @summary The same ${displayName(slug).toLowerCase()} on the headless tier, with every rule written by hand. -->

<link href="styles.css" rel="stylesheet" />

${linked.trim()}\n`)
  const fromMarkup = [...html.matchAll(/<(helix-base-[a-z0-9-]+)/g)].map((m) => m[1])
  /* Plus every tag the family registers, because a component draws parts no tag
     in the example names: the callout's icon and the breadcrumb's separator are
     both drawn inside, and a sheet built from the markup alone never sees them.
     Plus `helix-base-icon`, which half the library renders. */
  const fromFamily = [...BASE.keys()].filter(
    (t) => t === `helix-base-${slug}` || t.startsWith(`helix-base-${slug}-`),
  )
  const tagsUsed = [...new Set([...fromMarkup, ...fromFamily, 'helix-base-icon'])]
  const sheet = sheetFor(
    slug,
    tagsUsed,
    html.includes('class="row"'),
    html.includes('class="stack"'),
  )
  for (const [name, written] of [
    [`helix/web/src/${slug}/.examples/base.html`, html],
    [`helix/web/src/${slug}/.examples/base.css`, sheet],
  ]) {
    if (checking) {
      if (!existsSync(name) || readFileSync(name, 'utf8') !== written) {
        stale.push(name)
      }
    } else {
      writeFileSync(name, written)
    }
  }
  made.push(slug)
}

if (checking) {
  if (stale.length > 0) {
    console.error(
      `Base examples are behind their styled twins (${stale.length}):\n\n  ${stale.join('\n  ')}\n\n` +
        'Run `bun run examples:base` and commit the result.',
    )
    process.exit(1)
  }
  console.log(`base examples: ${made.length} families, current`)
} else {
  const left = [
    ...new Set(
      made.flatMap((s) =>
        [
          ...readFileSync(`helix/web/src/${s}/.examples/base.html`, 'utf8').matchAll(
            /<(helix-(?!base-)[a-z0-9-]+)/g,
          ),
        ].map((m) => m[1]),
      ),
    ),
  ]
  console.log(`base examples: ${made.length} pairs written`)
  console.log(
    left.length > 0
      ? `styled tags with no base twin left behind: ${left.join(' ')}`
      : 'every helix-* tag rebased',
  )
}
