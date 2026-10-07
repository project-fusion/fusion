#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { root } from '@fusion.dev/scripts/workspace'

/**
 * Generates the light-DOM stylesheet that hides elements until they upgrade.
 *
 * A custom element is an inline, unstyled box until its definition loads. Its
 * light-DOM children render immediately in document order, so a card arrives as
 * a run of unstyled text and then snaps into a card. `:not(:defined)` covers
 * that window.
 *
 * The tag list is read from the source rather than from the manifest, because
 * the manifest is written by `analyze`, which runs inside `build`, and this has
 * to be available before it.
 *
 * CSS has no way to select "any custom element", and a bare `:not(:defined)`
 * rule also catches elements this package does not own, including Next's dev
 * overlay. So the tags are enumerated.
 */
const TAG = /@customElement\(\s*['"]([a-z][a-z0-9]*(?:-[a-z0-9]+)+)['"]\s*\)/g

/**
 * Every element source under a directory, the specs left out, and so are the
 * two kinds of module a generator writes there.
 *
 * **Read, they were the reason a build did not restore.** `styles` writes each
 * `.css.ts` and `element-events` writes its `.generated.ts` beside the sources,
 * and neither can hold a `@customElement`. Hashed as inputs they moved this
 * task's key between a clean checkout, where this runs before them, and every
 * run after, so a build restored on CI missed here and rebuilt every package
 * above `helix-styles`. `turbo.json` leaves them out of `inputs` for the same
 * reason, and the two lists have to agree.
 */
const walk = (dir) =>
  readdirSync(dir, { recursive: true })
    .filter(
      (entry) =>
        entry.endsWith('.ts') &&
        !entry.endsWith('.spec.ts') &&
        !entry.endsWith('.css.ts') &&
        !entry.endsWith('.generated.ts'),
    )
    .map((entry) => join(dir, entry))

/* Two packages, because the tags and the stylesheet no longer live together:
   the list is a fact about the element package, and the rule belongs with the
   rest of the base layer, which is what `@fusion.dev/helix-styles/helix.css` is.

   Resolved from this file rather than taken as arguments, the way the two
   generators beside it already do. A path in a `package.json` script is a path
   out of that package, which `fusion workspace`'s `reaching` rule reads and is
   right to; and the answer here is not a caller's to give, there being exactly
   one element package and one style package. */
const source = join(root, 'helix/styled')
const target = join(root, 'helix/styles')
const tags = new Set()

for (const file of walk(join(source, 'src'))) {
  for (const match of readFileSync(file, 'utf8').matchAll(TAG)) {
    tags.add(match[1])
  }
}

const sorted = [...tags].sort()
const selector = sorted.map((tag) => `${tag}:not(:defined)`).join(',\n')
/* Every tag, whether or not it has an `align` of its own. A component without
   one never matches, and the point is that a component that gains one later is
   already covered. */
const aligned = sorted.map((tag) => `${tag}[align]`).join(',\n')

/* **A data table's first page, served as rows.** The page writes the first page
   as `helix-table-row` and `helix-table-cell` children under the columns, so the
   values are in the HTML a server sends. These rules lay that markup out as the
   table draws it, from the first paint, and keep it laid out that way once the
   table has upgraded and until it draws its own rows.

   Up to ten columns are counted, more than any example declares, and each
   column takes the track a column with no `width` takes. A column with a
   `width` takes its own once the table upgrades. */
const COUNTED = 10
const SERVED = 'helix-data-table:not(:defined):has(> helix-table-row)'
const VISIBLE = 'helix-table-column:not([hidden])'
const tracks = Array.from(
  { length: COUNTED },
  (_, at) =>
    `helix-data-table:not(:defined):has(> helix-table-column:nth-of-type(${at + 1}):last-of-type) {\n  --_data-table-count: ${at + 1};\n}`,
).join('\n\n')
/* `end` alone, which every numeric column here sets: a column set to the
   center is centered once the table upgrades. */
const edges = `${Array.from(
  { length: COUNTED },
  (_, at) =>
    `helix-data-table:has(> helix-table-column:nth-of-type(${at + 1})[text-align="end"]) > helix-table-row > :nth-child(${at + 1})`,
).join(',\n')} {\n  text-align: end;\n}`
const served = `/* A data table's first page, served as rows: see \`fusion/scripts/build-elements-css.mjs\`.
 *
 * **Shown before the table upgrades**, which is the point of serving them, and
 * the rows and cells stay shown when \`Table\` is not registered at all.
 */
${SERVED},
${SERVED} > helix-table-column:not(:defined),
helix-data-table > helix-table-row:not(:defined),
helix-data-table > helix-table-row > helix-table-cell:not(:defined) {
  visibility: visible;
}

/* **One grid, as the table's own**, which is what lines every column up across
 * every row: the headings and the cells are its items, and the rows draw no box.
 * The tracks are the ones the table works out for columns with no \`width\`,
 * counted below. With declarative shadow DOM the grid is the shadow root's, and
 * the same count reaches it through \`--data-table-template\`, which inherits
 * until the table writes its own.
 */
${SERVED} {
  display: grid;
  grid-template-columns: var(--data-table-columns, var(--data-table-template));
  overflow-x: auto;
}

helix-data-table:not(:defined) {
  --data-table-template: repeat(var(--_data-table-count, 1), minmax(max-content, 1fr));
}

${tracks}

/* A heading, as the column draws it in its own shadow root once it upgrades:
 * the same rule, height, inset and weight. Under declarative shadow DOM the
 * column's own box is emptied, so the heading is drawn once.
 */
${SERVED} > ${VISIBLE} {
  align-items: center;
  border-block-end: var(--helix-border-thin) solid
    var(--data-table-rule-color, var(--helix-color-border));
  box-sizing: border-box;
  color: var(--data-table-heading-color, var(--helix-color-foreground-muted));
  display: flex;
  font-family: var(--helix-font-sans);
  font-size: var(--data-table-text, var(--helix-text-sm));
  font-weight: var(--helix-weight-semibold);
  min-block-size: var(--helix-size-control-loose);
  min-inline-size: 0;
  padding-block: var(--data-table-padding-block, var(--helix-space-none));
  padding-inline: var(--data-table-padding-inline, var(--helix-space-none) var(--helix-space-md));
}

${SERVED} > helix-table-column[text-align="center"] {
  justify-content: center;
}

${SERVED} > helix-table-column[text-align="end"] {
  justify-content: flex-end;
}

${SERVED} > helix-table-column::part(column) {
  border: none;
  min-block-size: 0;
  padding: 0;
}

/* A cell, as the table draws one: the same box whether \`Table\` has upgraded
 * it or not, so nothing moves when the table draws its own rows in their place.
 */
helix-data-table > helix-table-row:not([hidden]) {
  display: contents;
}

helix-data-table > helix-table-row > helix-table-cell {
  border-block-end: var(--helix-border-thin) solid
    var(--data-table-rule-color, var(--helix-color-border));
  box-sizing: border-box;
  color: var(--data-table-color, var(--helix-color-foreground));
  display: block;
  font-family: var(--helix-font-sans);
  font-size: var(--data-table-text, var(--helix-text-sm));
  font-weight: inherit;
  min-block-size: auto;
  min-inline-size: auto;
  overflow-wrap: normal;
  padding-block: var(--data-table-padding-block, var(--helix-space-sm));
  padding-inline: var(--data-table-padding-inline, var(--helix-space-none) var(--helix-space-md));
}

helix-data-table > helix-table-row:last-of-type > helix-table-cell {
  border-block-end-color: transparent;
}

/* Each cell takes its column's edge, by its place in the row. */
${edges}

/* Once the table upgrades it draws its checkbox and grip columns first, which
 * the served rows have no cells for.
 */
helix-data-table:defined:is([selectable], [reorderable-rows]) > helix-table-row > :first-child {
  grid-column-start: 2;
}

helix-data-table:defined[selectable][reorderable-rows] > helix-table-row > :first-child {
  grid-column-start: 3;
}

/* The toolbar above the rows and the footer below them, across every column,
 * and the status lines left to the table, which says them once it upgrades.
 * Under declarative shadow DOM the gaps taken here stand in for the regions'
 * own.
 */
${SERVED} > [slot="toolbar"] {
  grid-column: 1 / -1;
  margin-block-end: var(--data-table-toolbar-gap, var(--helix-space-sm));
  order: -1;
}

${SERVED}::part(toolbar) {
  padding-block-end: 0;
}

${SERVED} > [slot="footer"] {
  grid-column: 1 / -1;
  margin-block-start: var(--data-table-footer-gap, var(--helix-space-sm));
  order: 1;
}

${SERVED}:has(> [slot="footer"])::part(footer) {
  padding-block-start: 0;
}

${SERVED} > :is([slot="empty"], [slot="error"], [slot="loading"]) {
  display: none;
}
`

/* Written into `helix/styles/src`, beside the three layers it is imported with,
   so `helix.css` reaches it with a relative `@import` like the others. A bare
   specifier in an `@import` is resolved by the bundler rather than by CSS, so
   the cross-package version worked in most toolchains and silently did not in
   the rest. That is what kept these apart, and moving the file removes it.

   **The tags are read from the element package and the sheet is written to the
   style package**, which is a build step rather than a dependency: nothing in
   `helix/styles`' manifest points at `helix/styled`, and the generator reads
   source text, so it needs nothing built. Were it the other way round the two
   packages could not both be built, `helix/styled` depending on this one. */
const out = join(target, 'src')
mkdirSync(out, { recursive: true })

writeFileSync(
  join(out, 'elements.css'),
  `/* Generated by fusion/scripts/build-elements-css.mjs. Do not edit.
 *
 * Carried by \`helix.css\`, which is the one import an app needs:
 *
 *   import '@fusion.dev/helix-styles/helix.css'
 *
 * Without it, every component renders as unstyled light-DOM content until its
 * definition loads and then snaps into place. With it, the element reserves its
 * place in the layout and reveals itself already styled.
 *
 * \`visibility\` rather than \`display\`, so the element still takes part in
 * layout and the page does not reflow when it upgrades. The content is in the
 * markup either way, so a crawler reads it regardless.
 */
${selector} {
  visibility: hidden;
}

/* \`align\` is a legacy presentational hint, and a browser applies it to any
 * element it appears on, including one it has never heard of. So a component
 * with an \`align\` property for its own layout silently gets \`text-align\` as
 * well: every \`<helix-flex align="center">\` was centering its text, which is a
 * thing nobody asked for and nothing in the component could be blamed for.
 *
 * Neutralized here rather than in each component, so the next component with an
 * \`align\` property does not have to remember. Enumerated for the same reason
 * the rule above is: CSS cannot select "any custom element".
 *
 * \`:where()\` keeps this at zero specificity, so a consumer setting
 * \`text-align\` on the same element still wins.
 */
:where(
${aligned}
) {
  text-align: inherit;
}

${served}`,
)

console.log(`elements.css: ${sorted.length} tags`)
