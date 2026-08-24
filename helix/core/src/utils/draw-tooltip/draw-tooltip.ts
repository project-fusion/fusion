import { nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { html, type StaticValue } from 'lit/static-html.js'
import { seriesIndex } from '../../mixins/mixin-chart-source/mixin-chart-source.js'
import type { Row } from '../read-series/read-series.js'

/*
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
 *
 * **The tooltip's tag is an argument, because this file is on the wrong tier to
 * know it.** It wrote `<helix-tooltip>` literally, which `helix/styled` registers
 * and `@helix-io/headless` does not, so a consumer of the headless tier alone
 * got an inert unknown element where the reading should be: the chart correct,
 * the markup correct, and resting a pointer on a bar doing nothing. Nothing
 * here could catch it. `check:composed` holds a *component* to interpolating
 * its tag through `tier` and this is a free function with no class to read one
 * from, and both the sandbox frame and the docs site import the whole library,
 * so every environment a test runs in has the styled tag registered and the
 * element upgrades.
 *
 * So the caller passes `this.tag('tooltip')` and each tier answers with its own
 * name, which is how every composed tag in the library already resolves. That
 * makes this `static-html` rather than `lit`, a tag being a `StaticValue`.
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
/** Where a tooltip points, in the plot's own percentages, and which side it prefers. */
export interface TooltipAt {
  /**
   * The side the bubble prefers. It moves if that side does not fit.
   */
  placement: 'bottom' | 'left' | 'right' | 'top'
  /**
   * How far across the plot the reading is, as a percentage.
   */
  x: string
  /**
   * How far down the plot the reading is, as a percentage.
   */
  y: string
}

/**
 * What a pointer resting on a reading shows, as `Tooltip` pointed at a mark.
 *
 * **A chart does not draw its own tooltip, and the top layer is why.** `Tooltip`
 * renders `popover="manual"` through `PopoverController`, so it clears every
 * stacking context and every `overflow` on the page. A box drawn by the chart is
 * `position: absolute` inside the plot and is confined to the chart's own
 * context, so it is clipped by, or layered under, whatever sits beside the
 * chart. Escaping that means reimplementing `PopoverController`, which is
 * `Tooltip` with extra steps and a second copy of the hard part.
 *
 * **`for` was already the anchor and needed nothing added.** It resolves through
 * `getRootNode().getElementById()`, and a chart's shadow root *is* a
 * `ShadowRoot`, so a chart names an element inside itself and `Tooltip` finds
 * it. What the chart provides is an invisible mark at the reading's point.
 *
 * **An HTML mark rather than the `<rect>` or `<circle>` already there.**
 * `FloatingController` types its anchor as `HTMLElement` and an SVG element is
 * not one; and a slice's `<circle>` has the bounding box of the whole ring
 * rather than of its arc, so anchoring to it would point at the ring's center
 * for every slice.
 *
 * **And the arrow now follows from placement rather than from a compass.** The
 * chart says which side it prefers and `FloatingController` moves it if that
 * side does not fit, which is how a slice at any bearing gets a bubble that
 * points at it. Four hard-coded sides could not express a bearing, which is what
 * made the donut's arrow miss its own ring.
 *
 * **It shows the table's text and not the chart's numbers.** `$128k` is what the
 * cell says and `128000` is what the drawing measured. Every cell of the row is
 * here, including columns nothing was plotted from, because a note beside the
 * figures is most of the reason to want a tooltip.
 *
 * **Hidden from assistive technology, on purpose.** The table is the accessible
 * representation and the drawing is `aria-hidden`; a reader on a keyboard gets
 * the table, which they can reach, rather than a tooltip which they cannot.
 */
export const drawTooltip = (
  rows: Row[],
  at: number,
  tag: StaticValue,
  where?: TooltipAt,
): TemplateResult | typeof nothing => {
  const row = rows[at]
  if (!row || rows.length === 0) {
    return nothing
  }
  const slot = 100 / rows.length
  const place: TooltipAt = where ?? {
    placement: 'top',
    x: `${at * slot + slot / 2}%`,
    y: '0%',
  }
  /* The mark and the bubble are siblings, and the id is fixed rather than
     generated: it is scoped to this chart's shadow root, where it is the only
     one, so nothing can collide with it and nothing has to be threaded through
     a render to stay in step. */
  return html`<div
      id="helix-chart-mark"
      part="mark"
      style=${styleMap({ insetBlockStart: place.y, insetInlineStart: place.x })}
    ></div>
    <${tag}
      exportparts="tooltip"
      for="helix-chart-mark"
      open
      part="tooltip-anchor"
      placement=${place.placement}
      within="helix-chart-plot"
    >
      <div aria-hidden="true" slot="content">
        <span part="tooltip-label">${row.label}</span>
        ${row.cells.map(
          (cell, index) =>
            /* A palette color only where something was plotted in it.
             *
             * A cell with no number is a column no chart drew: a note, a status,
             * a name. Given `data-series` anyway it takes a series color and the
             * stylesheet draws a dot, so a row reading `Note  Outage` arrived
             * wearing series three's green while the legend beside the chart said
             * series three was something else. */
            html`<span
              data-series=${cell.value === undefined ? nothing : seriesIndex(index)}
              part="tooltip-cell"
            >
              <span part="tooltip-name">${cell.name}</span>
              <span part="tooltip-value">${cell.text}</span>
            </span>`,
        )}
      </div>
    </${tag}>`
}
