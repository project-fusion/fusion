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
   each of these, but naming them here keeps the failure list about real gaps. */
const PRESENTATIONAL = new Set([
  'appearance',
  'data-density',
  'dense',
  'divided',
  'fill',
  'raised',
  'rounded',
  'shape',
  'size',
  'tone',
  'variant',
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

const strip = (html) => {
  let out = html
  for (const name of PRESENTATIONAL) {
    // With a value, and bare: a boolean attribute is written `divided`, not
    // `divided=""`, and the first pattern alone walked past every one of them.
    out = out.replaceAll(new RegExp(`\\s+${name}="[^"]*"`, 'g'), '')
    out = out.replaceAll(new RegExp(`\\s+${name}(?=[\\s>])`, 'g'), '')
  }
  return out
}

const rebase = (html) =>
  html.replaceAll(/<(\/?)helix-([a-z0-9-]+)/g, (whole, close, rest) => {
    const tag = `helix-base-${rest}`
    return BASE.has(tag) ? `<${close}${tag}` : whole
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
const CHART = new Set(['bar-chart', 'donut-chart', 'legend', 'line-chart', 'sparkline', 'trend'])

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
    return 'fill: var(--chart-series);'
  }
  if (part === 'line') {
    /* `non-scaling-stroke`, because the plot has a `viewBox` and a stroke is
       scaled with it: a width of 2 came out a finger thick. */
    return 'fill: none;\n  stroke: var(--chart-series);\n  stroke-width: 2;\n  vector-effect: non-scaling-stroke;'
  }
  if (part === 'segment') {
    /* The ring is a stroke and how thick it is is the component's own
       arithmetic: `--donut-chart-stroke` is derived from `hole` and published
       for exactly this. With no width the arc is drawn and nothing appears. */
    return 'fill: none;\n  stroke: var(--chart-series);\n  stroke-width: var(--donut-chart-stroke);'
  }
  if (part === 'swatch') {
    return 'background-color: var(--chart-series);\n  block-size: 0.75rem;\n  display: inline-block;\n  flex: none;\n  inline-size: 0.75rem;'
  }
  if (part === 'entry') {
    return 'align-items: center;\n  display: flex;\n  gap: 0.5rem;'
  }
  if (part === 'area') {
    return 'fill: var(--chart-series);\n  opacity: 0.25;'
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
    return 'padding: 0.25rem 0.5rem;'
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
const GLYPH = `block-size: 1em;
  flex: none;
  inline-size: 1em;`

const EXTRA = {
  carousel: `helix-base-carousel::part(track) {
  background-color: transparent;
  block-size: auto;
  display: flex;
  gap: 0.5rem;
  overflow: hidden;
}`,
  /* Eight parts in the library are an `<svg>` under a name the vocabulary reads
     as a box, and an svg with no size fills its container: the combobox's
     chevron measured 233 by 233. Found by asking which parts are svgs rather
     than by looking, which is the only way to know the list is complete. */
  combobox: `helix-base-combobox::part(indicator) {
  ${GLYPH}
}`,
  'copy-button': `helix-base-copy-button::part(button) {
  border: 1px solid var(--_gray-line);
  padding: 0.375rem;
}`,
  'icon-button': `helix-base-icon-button::part(button) {
  border: 1px solid var(--_gray-line);
  padding: 0.375rem;
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
   A square rotated forty-five degrees is a diamond and needs no asset. */
helix-base-rating::part(mark) {
  background-color: var(--_gray-fill);
  block-size: 0.75rem;
  inline-size: 0.75rem;
  rotate: 45deg;
}

helix-base-rating::part(marks) {
  display: flex;
  gap: 0.25rem;
}

helix-base-rating::part(fill) {
  background-color: var(--_gray-strong);
}`,
  select: `helix-base-select::part(indicator) {
  ${GLYPH}
}`,
  skeleton: `helix-base-skeleton::part(skeleton) {
  background-color: var(--_gray-fill);
  display: block;
  min-block-size: 1em;
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
  tag: `helix-base-tag {
  align-items: center;
  background-color: var(--_gray-fill);
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
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
  tree: `/* The chevron is the toggle itself, not a glyph inside one. */
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
        `helix-base-${slug} {\n${['#2a2a2e', '#4a4a50', '#6b6b73', '#8e8e96', '#b1b1b8', '#d2d2d7']
          .map((hex, at) => `  --chart-series-${at + 1}: ${hex};`)
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
  const body = rebase(delayout(detext(strip(source.replace(/<!--[\s\S]*?-->\s*/, '')))))
  /* Formatted here rather than left to `format-examples.mjs`, which would
     rewrite it a moment later and leave every file reporting as drifted. One
     rule, one implementation, run by both. */
  const html =
    format(`<!-- @summary The same ${displayName(slug).toLowerCase()} on the headless tier, with every rule written by hand. -->

<link href="styles.css" rel="stylesheet" />

${body.trim()}\n`)
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
