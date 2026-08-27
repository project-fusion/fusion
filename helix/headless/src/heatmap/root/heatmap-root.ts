import {
  customElement,
  HelixElement,
  HelixResizeEvent,
  hostAria,
  MixinChartSource,
  slotFilled,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
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
 * the semantic names at the theme's status colours and the numbered ones at a
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
 * @slot start - Below the strip, at the leading edge: usually the oldest date.
 * @slot summary - Below the strip, in the middle: the reading over the range drawn.
 * @slot end - Below the strip, at the trailing edge: usually the newest date.
 *
 * @csspart strip - The grid of cells.
 * @csspart cell - One reading.
 * @csspart footer - The three-slot row under the strip.
 * @csspart start - The leading slot's box.
 * @csspart summary - The middle slot's box.
 * @csspart end - The trailing slot's box.
 * @csspart empty - Shown when the table has no readings in it.
 *
 * @cssproperty --heatmap-cell-size - The size a cell wants. The strip fits as many as the container allows.
 * @cssproperty --heatmap-gap - Space between cells.
 * @cssproperty --heatmap-cell-radius - How far a cell's corners are rounded.
 * @cssproperty --heatmap-tone - The tone of the cell this is set on. Written by the component, read by the sheet that paints.
 * @cssproperty --heatmap-tone-1 - The quietest step of the magnitude ramp, reached by `tones="1 …"`.
 * @cssproperty --heatmap-tone-2 - The second step of the magnitude ramp.
 * @cssproperty --heatmap-tone-3 - The third step of the magnitude ramp.
 * @cssproperty --heatmap-tone-4 - The fourth step of the magnitude ramp.
 * @cssproperty --heatmap-tone-5 - The loudest step of the magnitude ramp.
 *
 * @event {HelixResizeEvent} helix-resize - Fired when the number of cells drawn changes, carrying that number.
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
   * The smallest a cell may get before the strip draws fewer of them.
   *
   * In CSS pixels, because this is arithmetic against a measured width rather
   * than a length the stylesheet resolves.
   *
   * **Which makes it a statement about the sheet, and it has to agree with
   * one.** These two defaults are a bare strip's, and `helix/styled` overrides
   * both because it draws something bigger: it was 8 and 2 against a sheet
   * drawing 12 and 4, so the arithmetic believed a cell cost 10 pixels where it
   * cost 16, and the strip ran 940 pixels wide out of a 592 pixel box at every
   * width measured. `visible` said 59 the whole time, so the one number a
   * summary is told to trust was the number that was wrong. A consumer who moves
   * `--heatmap-cell-size` or `--heatmap-gap` sets these to match.
   *
   * Zero turns the dropping off altogether, which is right for a strip in a
   * container that cannot get narrow.
   */
  @property({ attribute: 'min-cell', type: Number })
  minCell = 8

  /** Space between cells, in CSS pixels, for the same reason `min-cell` is a number. */
  @property({ type: Number })
  gap = 2

  /** Shown when the table has no readings in it. */
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

  /** How many cells the container has room for, as a whole number of columns. */
  private get room(): number {
    return fits(this.points.length, this.width ?? Number.NaN, this.minCell, this.gap, this.rowCount)
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

    return html`<div part="strip" style="--_heatmap-rows: ${this.rowCount}">
        ${
          cells.length === 0
            ? html`<p part="empty">${this.emptyText}</p>`
            : cells.map((reading) => {
                const tone = toneOf(reading, bounds, palette)
                const title = `${reading.label}: ${reading.value}`
                /* The title is the only tooltip here, and one delegated handler
                 would still be ninety elements' worth of markup to hang it on.
                 Ninety `helix-tooltip` elements is what this avoids; the native
                 one costs nothing and works on a touch device's long press. */
                /* **Two templates rather than one with a conditional style, and
                   the reason is that an absent tone has to mean an absent
                   declaration.** `--heatmap-tone: var(--heatmap-tone-undefined)`
                   is not an unset property, it is a property set to the
                   guaranteed-invalid value, and `var(--heatmap-tone, …)` then
                   declines to use its own fallback because the property *is*
                   set. An untoned cell came out transparent rather than taking
                   the quiet ground the sheet has for it. */
                return tone === undefined
                  ? html`<span part="cell" title=${title}></span>`
                  : html`<span
                part="cell"
                title=${title}
                data-tone=${tone}
                style="--heatmap-tone: var(--heatmap-tone-${tone})"
              ></span>`
              })
        }
      </div>
      <div part="footer">
        <span part="start"><slot name="start"></slot></span>
        <span part="summary"><slot name="summary"></slot></span>
        <span part="end"><slot name="end"></slot></span>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-heatmap': HelixHeadlessHeatmap
  }
}
