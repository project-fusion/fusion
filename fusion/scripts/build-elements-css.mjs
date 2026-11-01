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
   out of that package, which `fusion x workspace`'s `reaching` rule reads and is
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
   column takes the track a column with no `width` takes. A `width` is the
   column's own attribute, which no rule on the table can read, so a table that
   serves its rows takes its widths from `columns` on itself, which a rule can. */
const COUNTED = 10
const SERVED = 'helix-data-table:not(:defined):has(> helix-table-row)'
const VISIBLE = 'helix-table-column:not([hidden])'
/* The attributes that put a checkbox or a grip column ahead of the columns. */
const LEAD = '[selectable], [reorderable-rows]:not([child-field])'
const BOTH = '[selectable][reorderable-rows]:not([child-field])'
/* The attributes that draw a pagination under the rows. */
const PAGED = ':is([page-size]:not([page-size="0"]), [paginated])'
/* **The page sizes a stylesheet can compare a served page with.** CSS cannot
   read `page-size` as a number, so each size is its own selector: a table that
   serves fewer rows than the size has served its whole result, which the table
   draws on one page and so with no pagination. Outside `server` mode, where
   `total` could promise more. A size not listed keeps the row. */
const SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 100]
const SHORT = `:not([mode="server"]):is(${SIZES.map(
  (size) => `[page-size="${size}"]:not(:has(> helix-table-row:nth-of-type(${size})))`,
).join(', ')})`
const tracks = Array.from(
  { length: COUNTED },
  (_, at) =>
    `:is(helix-data-table, helix-table):not(:defined):has(> helix-table-column:nth-of-type(${at + 1}):last-of-type) {\n  --_table-count: ${at + 1};\n}`,
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
  --data-table-template: var(--_data-table-lead,) repeat(var(--_table-count, 1), minmax(max-content, 1fr));
}

${tracks}

/* **The widths a column asks for, from \`columns\`**, where the browser can read
 * an attribute into a track list. Where it cannot, the columns take the tracks
 * counted above until the table upgrades. A server rendering declarative shadow
 * DOM writes the same list into the grid itself, so that path needs no rule.
 */
@supports (grid-template-columns: attr(columns type(*))) {
  helix-data-table:not(:defined)[columns] {
    --data-table-template: var(--_data-table-lead,) attr(columns type(*));
  }
}

/* **The checkbox and grip columns, from the first paint.** The table draws them
 * ahead of the columns, as tracks that take what they hold, and the rows the
 * page served have no cells there. Each row leads with a box of the same size
 * in their place, and the headings start after it, so nothing moves when the
 * table draws its own. Both together are two tracks under one box, each set to
 * the width its cell takes.
 */
helix-data-table:not(:defined):is(${LEAD}) {
  --_data-table-lead: max-content;
}

helix-data-table:not(:defined)${BOTH} {
  --_data-table-lead: calc(1em + 2 * var(--data-table-padding-inline, var(--helix-space-sm)))
    calc(var(--checkbox-size, var(--helix-size-checkbox)) + 2 * var(--data-table-padding-inline, var(--helix-space-sm)));
}

${SERVED}:is(${LEAD})::before,
helix-data-table:is(${LEAD}) > helix-table-row:not([hidden])::before {
  border-block-end: var(--helix-border-thin) solid
    var(--data-table-rule-color, var(--helix-color-border));
  content: '';
  grid-column: 1;
}

helix-data-table:is(${LEAD}) > helix-table-row:last-of-type::before {
  border-block-end-color: transparent;
}

helix-data-table:where(${LEAD}) > helix-table-row:not([hidden])::before {
  block-size: 1em;
  box-sizing: content-box;
  inline-size: 1em;
  padding-block: var(--data-table-padding-block, var(--helix-space-sm));
  padding-inline: var(--data-table-padding-inline, var(--helix-space-sm));
}

helix-data-table[selectable] > helix-table-row:not([hidden])::before {
  block-size: var(--checkbox-size, var(--helix-size-checkbox));
  inline-size: var(--checkbox-size, var(--helix-size-checkbox));
}

${SERVED}${BOTH}::before,
helix-data-table${BOTH} > helix-table-row:not([hidden])::before {
  grid-column: 1 / span 2;
  inline-size: auto;
}


/* **A table served with declarative shadow DOM** lays its headings and cells
 * out in its shadow root's grid, which takes its tracks from the columns once
 * the table upgrades: the same count, at the track a column with no \`width\`
 * takes, until then. A table that sets \`columns\` is sent that list by the
 * server, which wins.
 */
helix-table:not(:defined):has(> helix-table-column) {
  --table-template: var(--_table-lead,) repeat(var(--_table-count, 1), minmax(max-content, 1fr));
}

/* Its grip and checkbox columns, which the rows draw once the table upgrades
 * and tells them it has them: until then each row leads with an empty box in
 * their place, under the headings the server sent for them, at the width
 * their cells take.
 */
helix-table:not(:defined)[reorderable] {
  --_table-lead: calc(var(--helix-space-2xs) + 1em + var(--helix-space-sm));
}

helix-table:not(:defined)[selectable] {
  --_table-lead: calc(var(--checkbox-size, var(--helix-size-checkbox)) + var(--helix-space-md));
}

helix-table:not(:defined)[reorderable][selectable] {
  --_table-lead: calc(var(--helix-space-2xs) + 1em + var(--helix-space-sm))
    calc(var(--checkbox-size, var(--helix-size-checkbox)) + var(--helix-space-md));
}

helix-table:not(:defined):is([reorderable], [selectable]) > helix-table-row:not([hidden])::before {
  border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
  content: '';
  grid-column: 1;
}

helix-table:not(:defined)[reorderable][selectable] > helix-table-row:not([hidden])::before {
  grid-column: 1 / span 2;
}

/* **A table served without declarative shadow DOM** keeps its place too. It
 * stays hidden, as every element does until it upgrades, and is laid out as it
 * lays itself out, so nothing below it moves when it does: the grid, each
 * heading and cell at the box its own shadow root gives it, and a box in each
 * row where the grip and checkbox cells go. Under declarative shadow DOM the
 * table keeps its own box, and each heading is drawn once, by the column.
 */
helix-table:not(:defined) {
  display: grid;
  grid-template-columns: var(--table-columns, var(--table-template, minmax(0, 1fr)));
  overflow-x: auto;
}

@supports (grid-template-columns: attr(columns type(*))) {
  helix-table:not(:defined)[columns] {
    --table-template: var(--_table-lead,) attr(columns type(*));
  }
}

helix-table:not(:defined) > [slot="heading"] {
  grid-column: 1 / -1;
  order: -1;
}

/* **The heading's own look, in a layer of its own.** Once the table upgrades
 * it comes from the table's \`::slotted()\`, which every rule the page writes
 * for the heading beats, \`helix.css\`'s own heading reset included, whatever
 * its weight. A rule in a layer is beaten by every rule outside one, so these
 * lose to the same rules, and the heading takes the same box either way.
 */
@layer {
  helix-table:not(:defined) > [slot="heading"] {
    display: block;
    font-family: var(--helix-font-sans);
    font-size: var(--table-title-text, var(--helix-text-md));
    font-weight: var(--helix-weight-semibold);
    margin-block: var(--helix-space-none) var(--table-title-gap, var(--helix-space-sm));
  }
}

helix-table:not(:defined) > helix-table-column,
helix-table:not(:defined) > helix-table-row > helix-table-cell {
  align-items: center;
  border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
  box-sizing: border-box;
  display: flex;
  font-size: var(--helix-text-sm);
  min-inline-size: 0;
  padding-inline: var(--helix-space-none) var(--helix-space-md);
}

helix-table:not(:defined) > helix-table-column {
  font-family: var(--helix-font-sans);
  font-weight: var(--helix-weight-semibold);
  min-block-size: var(--helix-size-control-loose);
}

helix-table:not(:defined) > helix-table-column::part(column) {
  border: none;
  min-block-size: 0;
  padding: 0;
}

helix-table:not(:defined) > helix-table-row > helix-table-cell {
  font-variant-numeric: tabular-nums;
  min-block-size: var(--helix-size-control);
  overflow-wrap: anywhere;
  padding-block: calc(var(--helix-space-control) * 0.5);
}

helix-table:not(:defined) > helix-table-column:last-of-type,
helix-table:not(:defined) > helix-table-row > helix-table-cell:last-child {
  padding-inline-end: var(--helix-space-none);
}

helix-table:not(:defined) > helix-table-row > helix-table-cell[header] {
  font-weight: var(--helix-weight-medium);
}

helix-table:not(:defined) > helix-table-row:not([hidden]) {
  display: contents;
}

helix-table:not(:defined):is([reorderable], [selectable])::before {
  border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
  content: '';
  grid-column: 1;
}

helix-table:not(:defined)[reorderable][selectable]::before {
  grid-column: 1 / span 2;
}

helix-table:not(:defined) > :is([slot="empty"], [slot="error"], [slot="loading"]) {
  display: none;
}

/* A windowed table scrolls a box of its own height, so its rows take no more
 * room than that before it upgrades. */
helix-table:not(:defined)[windowed] {
  block-size: var(--table-block-size, 24em);
  overflow-y: auto;
}

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

${SERVED} > helix-table-column:last-of-type {
  padding-inline: var(--data-table-padding-inline, var(--helix-space-none));
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
  font-variant-numeric: tabular-nums;
  font-weight: inherit;
  min-block-size: auto;
  min-inline-size: auto;
  overflow-wrap: normal;
  padding-block: var(--data-table-padding-block, var(--helix-space-sm));
  padding-inline: var(--data-table-padding-inline, var(--helix-space-none) var(--helix-space-md));
}

helix-data-table > helix-table-row > helix-table-cell:last-child {
  padding-inline: var(--data-table-padding-inline, var(--helix-space-none));
}

helix-data-table > helix-table-row:last-of-type > helix-table-cell {
  border-block-end-color: transparent;
}

/* Each cell takes its column's edge, by its place in the row. */
${edges}

/* The first heading and each row's first cell, after the checkbox and grip
 * columns. A tree grid draws no grips.
 */
${SERVED}:is(${LEAD}) > helix-table-column:first-of-type,
helix-data-table:is(${LEAD}) > helix-table-row > :first-child {
  grid-column-start: 2;
}

${SERVED}${BOTH} > helix-table-column:first-of-type,
helix-data-table${BOTH} > helix-table-row > :first-child {
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

/* **The pagination's row, held from the first paint.** The table draws its
 * pagination once it knows how many rows there are, below the rows and beside
 * anything in the footer, so the room it takes is kept here: under the rows,
 * or as the least height of the footer, whose content sits in the middle of
 * it as the pagination's row sets it.
 */
${SERVED}${PAGED}:not(:has(> [slot="footer"]))::after {
  block-size: var(--pagination-size, var(--helix-size-control-tight));
  content: '';
  grid-column: 1 / -1;
  margin-block-start: var(--data-table-footer-gap, var(--helix-space-sm));
  order: 1;
}

${SERVED}${PAGED} > [slot="footer"] {
  align-content: center;
  min-block-size: var(--pagination-size, var(--helix-size-control-tight));
}

/* **Not for a page shorter than its size**, which is the whole result: the
 * table draws it with no pagination, so a row held for one would close up at
 * the upgrade and move everything under the table. The footer's gap stays,
 * since the table keeps it above the empty pagination.
 */
${SERVED}${SHORT}::after {
  block-size: 0;
}

${SERVED}${SHORT} > [slot="footer"] {
  min-block-size: auto;
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
