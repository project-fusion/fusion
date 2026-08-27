import {
  customElement,
  HelixElement,
  HelixResizeEvent,
  hostAria,
  MixinChartSource,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
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
 * @cssproperty --heatmap-tone - The tone of the cell this is set on. Written by the component, read by the sheet that paints.
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
   * `thresholds="0 1 3 6"` with `tones="muted info accent success"` puts 0 in
   * `muted`, 1 and 2 in `info`, 3 to 5 in `accent`, and 6 upward in `success`.
   * A value below the first bound gets no tone at all: an empty day in a
   * contribution graph is a day with nothing in it, and painting it as the
   * lowest bucket claims a reading that does not exist.
   */
  @property()
  thresholds = ''

  /** Tone per bucket, in the same order as `thresholds`. */
  @property()
  tones = ''

  /**
   * The smallest a cell may get before the strip draws fewer of them.
   *
   * In CSS pixels, because this is arithmetic against a measured width rather
   * than a length the stylesheet resolves. Zero turns the dropping off
   * altogether, which is right for a strip in a container that cannot get narrow.
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

  /** How many cells the container has room for. */
  private get room(): number {
    return fits(this.points.length, this.width ?? Number.NaN, this.minCell, this.gap)
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

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
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

    return html`<div part="strip" style=${`--_heatmap-rows: ${Math.max(1, Math.floor(this.rows) || 1)}`}>
        ${
          cells.length === 0
            ? html`<p part="empty">${this.emptyText}</p>`
            : cells.map((reading) => {
                const tone = toneOf(reading, bounds, palette)
                /* The title is the only tooltip here, and one delegated handler
                 would still be ninety elements' worth of markup to hang it on.
                 Ninety `helix-tooltip` elements is what this avoids; the native
                 one costs nothing and works on a touch device's long press. */
                return html`<span
                part="cell"
                title=${`${reading.label}: ${reading.value}`}
                data-tone=${tone ?? nothing}
                style=${tone ? `--heatmap-tone: var(--helix-color-${tone})` : nothing}
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
