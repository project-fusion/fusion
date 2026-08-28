import {
  customElement,
  drawTooltip,
  HelixElement,
  HelixResizeEvent,
  hostAria,
  MixinChartSource,
  slotFilled,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import '../../tooltip/index.js'
import { fits, numbers, toneOf, words } from './buckets.js'

/**
 * @summary A strip of cells coloured by how each one went: uptime, contributions, activity.
 *
 * @description
 * **One family covers both readings, and the split people expect does not
 * exist.** It was filed as two on the argument that a contribution graph needs a
 * continuous ramp where uptime needs a category. GitHub's contribution graph is
 * five discrete levels rather than a gradient, so a cell that takes a tone
 * covers both: `rows="1"` is a status strip, `rows="7"` is a contribution graph,
 * and heatmap is the name of that.
 *
 * **What it cannot be is a bar chart with flat values**, and the data model is
 * what closes that rather than taste: chart color is per *series* everywhere
 * else here, `--chart-series-1` through `-15`, so ninety differently coloured
 * cells would be ninety series.
 *
 * The data is a real `<table>` named by `for`, the same convention every chart
 * in this library uses, which also answers the accessibility question without
 * inventing anything: **the table is the accessible representation**, it is
 * already in the markup, and the drawing is a picture of it. Hide it with
 * `data-hidden-visually` and the reading is still there for anyone who needs it.
 *
 * A cell takes its tone from its own `data-tone`, or from `thresholds` and
 * `tones` bucketing its value. The first is what a status page wants and the
 * second is what a contribution graph wants; the cell's own wins, so a page that
 * already knows a day was degraded does not have to encode that as a number for
 * this component to decode again.
 *
 * **A tone is a name this tier never resolves.** `tone="success"` writes
 * `--heatmap-tone: var(--heatmap-tone-success)` onto the cell and stops there,
 * so what a name is worth is the answering tier's to say: `helix/styled` points
 * the semantic names at the theme's status colors and the numbered ones at a
 * ramp, and a consumer on `headless` declares the same names as whatever they
 * like. It read `var(--helix-color-${tone})` until 27 Aug 2026, which is the
 * dependency the tiers exist to prevent and which failed loudly rather than
 * quietly: off-tier that property is not undefined, it is *invalid*, so
 * `background-color: var(--heatmap-tone, …)` declined its own fallback and every
 * cell came out transparent. The headless baseline was a blank page under a row
 * of footer text. `shared/chart/series.css` records Bar Chart having had the
 * same fault for the same reason.
 *
 * **On a narrow container it draws fewer cells rather than thinner ones.**
 * Ninety cells in 320 pixels is three and a half pixels each, which is a smear
 * and not a strip. The cells it drops are the oldest, and it reflects `visible`
 * and fires `helix-resize` when the number changes, because **a summary saying
 * "99.2% over 90 days" above a strip drawing 45 of them is telling the reader
 * something false about the picture in front of them** and nothing about the
 * picture says so.
 *
 * @since 0.1.0
 * @status experimental
 * @category charts
 * @aliases Contribution graph, Uptime strip, Calendar heatmap, Activity graph
 * @documentation https://helix.fusion.dev/components/heatmap
 *
 * @slot end - Below the strip, at the trailing edge: usually the newest date.
 * @slot start - Below the strip, at the leading edge: usually the oldest date.
 * @slot summary - Below the strip, in the middle: the reading over the range drawn.
 *
 * @event {HelixResizeEvent} helix-resize - Fired when the number of cells drawn changes, carrying that number.
 *
 * @csspart cell - One reading.
 * @csspart empty - Shown when the table has no readings in it.
 * @csspart end - The trailing slot's box.
 * @csspart footer - The three-slot row under the strip.
 * @csspart mark - The invisible point the tooltip is anchored to.
 * @csspart start - The leading slot's box.
 * @csspart strip - The grid of cells.
 * @csspart summary - The middle slot's box.
 * @csspart tooltip - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-label - The reading's own name inside the tooltip.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-value - A column's value inside the tooltip.
 *
 * @cssproperty --heatmap-cell-height - How tall a cell is. A row of a tall thin cell is what a status page draws.
 * @cssproperty --heatmap-cell-radius - How far a cell's corners are rounded.
 * @cssproperty --heatmap-cell-size - The size a cell wants on both axes, where neither is given its own.
 * @cssproperty --heatmap-cell-width - How wide a cell is. The strip fits as many as the container allows.
 * @cssproperty --heatmap-gap - Space between cells. Zero is a continuous field rather than a grid of tiles.
 * @cssproperty --heatmap-tone - The tone of the cell this is set on. Written by the component, read by the sheet that paints.
 * @cssproperty --heatmap-tone-1 - The quietest step of the magnitude ramp, reached by `tones="1 …"`.
 * @cssproperty --heatmap-tone-2 - The second step of the magnitude ramp.
 * @cssproperty --heatmap-tone-3 - The third step of the magnitude ramp.
 * @cssproperty --heatmap-tone-4 - The fourth step of the magnitude ramp.
 * @cssproperty --heatmap-tone-5 - The loudest step of the magnitude ramp.
 * @cssproperty --heatmap-tone-accent - What `accent` is worth.
 * @cssproperty --heatmap-tone-danger - What `danger` is worth.
 * @cssproperty --heatmap-tone-info - What `info` is worth.
 * @cssproperty --heatmap-tone-muted - What `muted` is worth: the quiet ground, for a bucket that means nothing happened.
 * @cssproperty --heatmap-tone-primary - What `primary` is worth.
 * @cssproperty --heatmap-tone-success - What `success` is worth, as a name or a `data-tone`.
 * @cssproperty --heatmap-tone-warning - What `warning` is worth.
 */
@customElement('helix-headless-heatmap')
export class HelixHeadlessHeatmap extends MixinChartSource(HelixElement) {
  /**
   * How many rows the strip has.
   *
   * `1` is a status strip and `7` is a calendar week, which are the two readings
   * this covers. Cells fill down the column and then across, which is what a
   * calendar heatmap does: a week is a column, so the strip reads left to right
   * in weeks and top to bottom in days.
   */
  @property({ type: Number })
  rows = 1

  /**
   * Lower bounds for the tone buckets, in the order the tones are given.
   *
   * `thresholds="1 3 6 9"` with `tones="1 2 3 4"` puts 1 and 2 in the ramp's
   * first step, 3 to 5 in the second, 6 to 8 in the third, and 9 upward in the
   * fourth. A value below the first bound gets no tone at all: an empty day in a
   * contribution graph is a day with nothing in it, and painting it as the
   * lowest bucket claims a reading that does not exist.
   */
  @property()
  thresholds = ''

  /**
   * Tone per bucket, in the same order as `thresholds`.
   *
   * A name, resolved as `--heatmap-tone-<name>` by whichever tier answers.
   * **`"1"` through `"5"` are a ramp and everything else is a category**, which
   * is the distinction a heatmap lives or dies on: magnitude has to be one hue
   * getting louder, because a reader compares two cells by weight and cannot
   * compare two hues at all. This shipped demonstrating the opposite,
   * `tones="surface info accent success primary"` for a commit count, and five
   * unrelated hues for five amounts is confetti with no order in it.
   */
  @property()
  tones = ''

  /**
   * The smallest a cell may get before the strip draws fewer of them, in CSS pixels.
   *
   * **Set this only to overrule what the strip actually draws.** The arithmetic
   * needs a width in pixels and the width is a length the stylesheet resolves,
   * so for as long as this was the only answer it was a promise the consumer had
   * to keep by hand: it sat at 8 against a sheet drawing 12, the arithmetic
   * believed a cell cost 10 pixels where it cost 16, and a ninety day strip ran
   * 940 pixels wide out of a 592 pixel box while `visible` reported 59. The one
   * number a summary is told to trust was the number that was wrong.
   *
   * The strip is measured now, so `--heatmap-cell-width` and `--heatmap-gap` are
   * enough on their own and these two are the estimate used until the first
   * measurement lands. Writing the attribute pins the value and stops the
   * measurement being consulted, which is what a container query or a transition
   * on the cell size wants, where what is drawn this frame is not what the
   * arithmetic should plan around.
   *
   * Zero turns the dropping off altogether, which is right for a strip in a
   * container that cannot get narrow.
   */
  @property({ attribute: 'min-cell', type: Number })
  minCell = 8

  /**
   * Space between cells, in CSS pixels, for the same reason `min-cell` is a
   * number.
   */
  @property({ type: Number })
  gap = 2

  /**
   * Shown when the table has no readings in it.
   */
  @property({ attribute: 'empty-text' })
  emptyText = 'No readings'

  /**
   * How many cells are actually drawn.
   *
   * **This is the number a summary has to agree with**, and the reason it is
   * published at all: a consumer's own summary is their markup and this element
   * cannot rewrite it, so the only honest arrangement is to hand over the count
   * and say when it changed.
   *
   * **A plain getter, and the attribute is written in `updated`, because
   * `@property({ reflect: true })` on a getter with no setter reflects once and
   * then goes stale.** Lit reflects a property that is in `changedProperties`,
   * and nothing puts a derived getter there after the first update: the
   * attribute would be right on load and wrong from the first resize, which is
   * the exact failure the count exists to prevent, arriving through the
   * mechanism meant to prevent it.
   */
  get visible(): number {
    return Math.min(this.points.length, this.room)
  }

  /**
   * The width last measured, or nothing before the first measurement.
   *
   * Undefined rather than zero, because the two mean different things and the
   * difference is a whole strip: unmeasured has to show everything, since a
   * first paint that shows one cell and then expands is a flicker on every load.
   */
  @state()
  private width: number | undefined = undefined

  /**
   * The cell and gap the strip is drawing, in pixels, once it has been read.
   *
   * **The arithmetic's inputs are a stylesheet's decisions, so the honest way to
   * learn them is to ask the stylesheet.** A cell's size is a length that only
   * the cascade can resolve: it may be a `rem` against a root font size, a
   * percentage of a container, or whatever a container query chose this frame.
   * Every one of those is invisible to a number typed into an attribute, and
   * each of `--heatmap-cell-width`, `--heatmap-cell-height` and `--heatmap-gap`
   * added one more way for the two to drift apart silently.
   *
   * Reading it back is not styling and does not breach the tier: this asks what
   * was decided rather than deciding, which is the same direction as the facts
   * this component writes out as custom properties, run backwards.
   */
  @state()
  private metrics: { cell: number; gap: number } | undefined = undefined

  /**
   * Which drawn cell the pointer is on, as an index into `drawn`, or -1 for
   * none.
   */
  @state()
  private hovered = -1

  private observer: ResizeObserver | undefined = undefined

  private announced: number | undefined = undefined

  /**
   * Every reading in the table, oldest first, as the table is written.
   *
   * **Not `readings`, which the mixin already has and which means a count.**
   * Two members of the same name meaning a number and an array is the kind of
   * collision that type-checks in one direction and reads wrong in both.
   */
  private get points(): Array<{ label: string; tone?: string | undefined; value: number }> {
    return this.series[0]?.points ?? []
  }

  /**
   * `rows` as a usable count, which is not always what the attribute says.
   *
   * One place rather than two: the fit arithmetic and the grid template both
   * need it, and a `rows="0"` or a `rows="2.5"` that reached one of them and not
   * the other would draw a strip whose columns and whose capacity disagreed.
   */
  private get rowCount(): number {
    return Math.max(1, Math.floor(this.rows) || 1)
  }

  /**
   * The cell width the arithmetic should plan around, in pixels.
   *
   * The attribute wins where a consumer wrote one, because that is what writing
   * it is for; otherwise what the strip draws, and the declared default only
   * until the first measurement lands.
   */
  private get cellPx(): number {
    return this.hasAttribute('min-cell') ? this.minCell : (this.metrics?.cell ?? this.minCell)
  }

  /** The gap the arithmetic should plan around, on the same terms as `cellPx`. */
  private get gapPx(): number {
    return this.hasAttribute('gap') ? this.gap : (this.metrics?.gap ?? this.gap)
  }

  /** How many cells the container has room for, as a whole number of columns. */
  private get room(): number {
    return fits(
      this.points.length,
      this.width ?? Number.NaN,
      this.cellPx,
      this.gapPx,
      this.rowCount,
    )
  }

  /**
   * Reads back the cell and the gap the strip resolved.
   *
   * `gridAutoColumns` and `columnGap` rather than a cell's own box, and the
   * difference matters on the frame it matters: a cell exists only once some
   * have been drawn, and how many are drawn is what this is measuring *for*.
   * Asking the track instead breaks the circle, since a track is sized whether
   * or not anything sits in it. Neither property forces layout, so this stays a
   * style read on every update rather than a reflow.
   *
   * Anything that does not parse to a positive number leaves the estimate alone:
   * `columnGap` computes to `normal` where no gap is set, and a track given a
   * keyword or a `repeat()` has no single width to report. A wrong number here
   * is worse than no number, because it is the one the count is published from.
   */
  private measure(): void {
    const strip = this.renderRoot?.querySelector('[part="strip"]')
    if (!strip || typeof getComputedStyle !== 'function') {
      return
    }
    const style = getComputedStyle(strip)
    const cell = Number.parseFloat(style.gridAutoColumns)
    const gap = Number.parseFloat(style.columnGap)
    if (!Number.isFinite(cell) || cell <= 0 || !Number.isFinite(gap) || gap < 0) {
      return
    }
    if (this.metrics?.cell !== cell || this.metrics?.gap !== gap) {
      /* A new object rather than a mutation, because `@state` compares by
         identity and a mutated one schedules nothing. */
      this.metrics = { cell, gap }
    }
    /* **Whether there is anything between the cells, which CSS cannot ask.**
       A sheet can set the gap and cannot read it back, so a rule that wants to
       know whether a strip is a grid of tiles or one continuous field has no
       selector for it. The measurement is already here, so saying so costs
       nothing. It is a fact rather than a decision, which is the line a base
       component's custom properties are on the right side of too. */
    strip.toggleAttribute('data-spaced', gap > 0)
  }

  /**
   * The readings actually drawn, newest kept.
   *
   * The tail rather than the head: a status strip that drops the newest days to
   * keep the oldest is answering a question nobody asked.
   */
  private get drawn(): Array<{ label: string; tone?: string | undefined; value: number }> {
    const all = this.points
    return all.slice(Math.max(0, all.length - this.room))
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* Guarded because Lit SSR provides no `ResizeObserver`, and a component that
       measures itself to render has to render without the measurement first. */
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver((entries) => {
        const measured = entries[0]?.contentRect.width
        if (measured !== undefined && measured !== this.width) {
          this.width = measured
        }
      })
      this.observer.observe(this)
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.observer?.disconnect()
    this.observer = undefined
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label || 'Heatmap', role: 'img' })
  }

  /**
   * Says on the footer whether any of its three slots holds anything.
   *
   * **The stylesheet used to ask, and could not.** It read
   * `[part="footer"]:not(:has(slot:has(*)))`, which is two faults at once:
   * `:has()` may not be nested inside `:has()`, so the selector failed to parse
   * and the rule was discarded whole; and a slot's assigned nodes are not its
   * DOM children, so `slot:has(*)` reports fallback content rather than the
   * fill, and would have been false either way. Both verified in a browser. A
   * heatmap with no legend and no summary still reserved the row for one.
   */
  private markEmpty(): void {
    this.markRegion('footer', ['start', 'summary', 'end'])
  }

  /**
   * One region, hidden when its slot holds nothing and nothing of ours fills it.
   *
   * `hidden` beside the `data-empty` mirror: `data-empty` is the hook the styled
   * sheet reads, and this tier ships no sheet, so an empty region left in the box
   * tree would be a gap a headless consumer cannot close without knowing to look
   * for it. The styled rule stays too, because that sheet sets `display` on these
   * parts and therefore outranks the UA's `[hidden]` one.
   */
  private markRegion(part: string, slots: readonly string[], occupied?: string): void {
    const region = this.renderRoot?.querySelector<HTMLElement>(`[part="${part}"]`)
    const empty =
      !slots.some((name) =>
        slotFilled(this.renderRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)),
      ) && !(occupied && this.renderRoot?.querySelector(occupied))
    region?.toggleAttribute('data-empty', empty)
    region?.toggleAttribute('hidden', empty)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
    this.measure()
    /* Written here rather than reflected, and announced only on a change: a
       consumer recomputing a summary from this is doing work, and an event per
       resize frame is work per frame.
       
       The attribute is set after the first render rather than during it, so a
       hydrating consumer's markup and the server's output agree: neither has it,
       and it appears once the element has measured something. */
    /* **Nothing measured yet is the absence of the attribute.** The comment
       above claimed writing here made the server's output and a hydrating
       consumer's markup agree, and it does the reverse: `updated` runs in the
       same microtask checkpoint as `firstUpdated`, before React need have
       reached the node, so `visible="0"` was an attribute no server sent. That
       is the fault `data-settled` was found for four times. */
    const showing = this.visible
    const written = showing > 0 ? String(showing) : null
    if (this.getAttribute('visible') !== written) {
      if (written === null) {
        this.removeAttribute('visible')
      } else {
        this.setAttribute('visible', written)
      }
    }
    if (this.announced !== undefined && this.announced !== showing) {
      this.dispatchEvent(new HelixResizeEvent({ size: showing }))
    }
    this.announced = showing
  }

  protected override render(): TemplateResult {
    const bounds = numbers(this.thresholds)
    const palette = words(this.tones)
    const cells = this.drawn

    return html`<div
        part="strip"
        id="helix-chart-plot"
        style="--_heatmap-rows: ${this.rowCount}"
        @pointerover=${this.onPointerOver}
        @pointerleave=${this.onPointerLeave}
      >
        ${
          cells.length === 0
            ? nothing
            : cells.map((reading, index) => {
                const tone = toneOf(reading, bounds, palette)
                /* **Two templates rather than one with a conditional style, and
                   the reason is that an absent tone has to mean an absent
                   declaration.** `--heatmap-tone: var(--heatmap-tone-undefined)`
                   is not an unset property, it is a property set to the
                   guaranteed-invalid value, and `var(--heatmap-tone, …)` then
                   declines to use its own fallback because the property *is*
                   set. An untoned cell came out transparent rather than taking
                   the quiet ground the sheet has for it. */
                return tone === undefined
                  ? html`<span part="cell" data-index=${index}></span>`
                  : html`<span
                part="cell"
                data-index=${index}
                data-tone=${tone}
                style="--heatmap-tone: var(--heatmap-tone-${tone})"
              ></span>`
              })
        }
        ${this.renderTooltip()}
      </div>
      ${cells.length === 0 ? html`<p part="empty">${this.emptyText}</p>` : nothing}
      <div part="footer">
        <span part="start"><slot name="start"></slot></span>
        <span part="summary"><slot name="summary"></slot></span>
        <span part="end"><slot name="end"></slot></span>
      </div>`
  }

  /**
   * The bubble over the cell a pointer is resting on.
   *
   * **One tooltip that moves, which is what every other chart here does and is
   * the thing the `title` attribute was kept to avoid.** The note this replaces
   * read that ninety `helix-tooltip` elements was the cost of a real one, and
   * that was never the shape: Bar Chart, Line Chart and Donut Chart each render
   * a single anchor against an invisible mark and move the mark, so the count is
   * one however many readings there are. `drawTooltip` is their shared markup
   * and this is the fourth caller.
   *
   * What it buys over the native one is the row rather than the reading.
   * `sourceRows` carries every column of the table including the ones nothing
   * was plotted from, so a cell reads "11 Jun 2026 / Uptime 81.2% / Note Partial
   * outage" where `title` could only ever say the two values this component
   * happens to hold. It is also styleable, appears at once rather than after the
   * platform's second of delay, and cannot be truncated by the window edge.
   *
   * The mark is placed in pixels rather than in percent, which is the one thing
   * this does differently from its siblings: they divide a plot into equal
   * slots, and a strip's cells are a fixed size with a fixed gap inside a box
   * that is usually wider, so a percentage of the box lands between cells. The
   * pitch is `cell + gap` and both are measured.
   */
  protected renderTooltip(): TemplateResult | typeof nothing {
    const at = this.hovered
    if (at < 0) {
      return nothing
    }
    /* `sourceRows` is indexed over every reading and the strip draws a tail of
       them, so the two agree only when nothing was dropped. Off by the length of
       what was cut, a tooltip names the wrong day, and it names one that is
       still on screen, so nothing about it looks wrong. */
    const offset = this.points.length - this.drawn.length
    const cell = this.cellPx
    const gap = this.gapPx
    const column = Math.floor(at / this.rowCount)
    const row = at % this.rowCount
    return drawTooltip(this.sourceRows, offset + at, this.tag('tooltip'), {
      placement: 'top',
      x: `${column * (cell + gap) + cell / 2}px`,
      y: `${row * (cell + gap)}px`,
    })
  }

  /**
   * Which drawn cell the pointer is over, or -1.
   *
   * `pointerover` on the strip rather than a listener per cell: the event
   * bubbles, so one handler covers however many cells there are, and unlike
   * `mouseover` it is delivered for a pen and for the touch that follows a long
   * press.
   */
  private readonly onPointerOver = (event: PointerEvent): void => {
    const cell = (event.target as Element | null)?.closest?.('[part="cell"]')
    const index = Number(cell?.getAttribute('data-index') ?? -1)
    this.hovered = Number.isInteger(index) ? index : -1
  }

  private readonly onPointerLeave = (): void => {
    this.hovered = -1
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-heatmap': HelixHeadlessHeatmap
  }
}
