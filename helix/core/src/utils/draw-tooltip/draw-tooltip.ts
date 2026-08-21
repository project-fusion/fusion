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
/** Where a tooltip points, in the plot's own percentages, and which way it sits. */
export interface TooltipAt {
  /**
   * How far across the plot the reading is, as a percentage.
   */
  x: string
  /**
   * How far down the plot the reading is, as a percentage.
   */
  y: string
  /**
   * How to move the box off that point so its arrow rests on it.
   */
  shift: string
  /**
   * Which edge of the box the arrow is on.
   */
  side: 'bottom' | 'end' | 'start' | 'top'
}

export const drawTooltip = (
  rows: Row[],
  at: number,
  where?: TooltipAt,
): TemplateResult | typeof nothing => {
  const row = rows[at]
  if (!row || rows.length === 0) {
    return nothing
  }
  /* Placed on the reading rather than under the pointer: the point the chart
     drew it at. A box that follows the pointer exactly never settles and is
     harder to read than the number in it.
   *
   * **Outside what it describes, always, and pointing at it.** Centred was the
   * first version, which is harmless over a donut's hole and covers the data on
   * a pie, and in neither case says *which* slice it means. An arrow says it
   * once and needs no branch: the chart hands over a point and which side of the
   * box to hang the arrow on, and the same rule serves a ring, a column and a
   * line. */
  const slot = 100 / rows.length
  const place: TooltipAt = where ?? {
    shift: 'translate(-50%, -100%)',
    side: 'bottom',
    x: `${at * slot + slot / 2}%`,
    y: '0%',
  }
  return html`<div
    aria-hidden="true"
    data-side=${place.side}
    part="tooltip"
    style=${styleMap({
      '--_chart-tooltip-at': place.x,
      '--_chart-tooltip-down': place.y,
      '--_chart-tooltip-shift': place.shift,
    })}
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
    <span part="tooltip-arrow"></span>
  </div>`
}
