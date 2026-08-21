import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { seriesIndex } from '../../mixins/mixin-chart-source/mixin-chart-source.js'
import type { Row } from '../read-series/read-series.js'

/**
 * What a pointer resting on a reading shows, as markup every chart can use.
 *
 * **A function rather than a method on `MixinChartSource`, and that is forced.**
 * A mixin's members reach a subclass only through its declared interface, and an
 * interface cannot carry a protected one: TypeScript refuses to widen a class to
 * an interface across a protected member. Declaring it public would make a
 * render seam part of the published API and break the convention
 * `check:seams` holds, that a composed thing sits behind
 * `protected render…()`. So the markup is shared here, the way `drawIcon`
 * shares a glyph, and each chart keeps a one-line seam of its own.
 *
 * **It shows the table's text and not the chart's numbers.** `$128k` is what
 * the cell says and `128000` is what the drawing measured, and a tooltip
 * printing the second is the chart overruling the table about how its own
 * figure reads. Every cell of the row is here, including columns nothing was
 * plotted from, because a note or a status beside the figures is most of the
 * reason to want a tooltip at all.
 *
 * **Hidden from assistive technology, on purpose.** The table is the accessible
 * representation and the drawing is `aria-hidden`; a reader on a keyboard gets
 * the table, which they can reach, rather than a tooltip which they cannot.
 */
export const drawTooltip = (rows: Row[], at: number): TemplateResult | typeof nothing => {
  const row = rows[at]
  if (!row || rows.length === 0) {
    return nothing
  }
  /* Placed on the reading rather than under the pointer: the middle of its own
     slot, which is where the drawing put it. A box that follows the pointer
     exactly never settles and is harder to read than the number in it. */
  const slot = 100 / rows.length
  return html`<div
    aria-hidden="true"
    part="tooltip"
    style=${styleMap({ '--_chart-tooltip-at': `${at * slot + slot / 2}%` })}
  >
    <span part="tooltip-label">${row.label}</span>
    ${row.cells.map(
      (cell, index) =>
        /* A palette colour only where something was plotted in it.
         *
         * A cell with no number is a column no chart drew: a note, a status, a
         * name. Given `data-series` anyway it takes a series colour and the
         * stylesheet draws a dot, so a row reading `Note  Outage` arrived
         * wearing series three's green while the legend beside the chart said
         * series three was something else. Seen in a browser, and it is the
         * kind of wrong that looks like a feature. */
        html`<span
          data-series=${cell.value === undefined ? nothing : seriesIndex(index)}
          part="tooltip-cell"
        >
          <span part="tooltip-name">${cell.name}</span>
          <span part="tooltip-value">${cell.text}</span>
        </span>`,
    )}
  </div>`
}
