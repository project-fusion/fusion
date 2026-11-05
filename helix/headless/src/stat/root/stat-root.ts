import {
  customElement,
  formatNumber,
  formatNumberParts,
  HelixElement,
  hostAria,
  internalsOf,
  numberConverter,
  reportRuntime,
  slotFilled,
  slottedWords,
  wordsLocale,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One measurement, with a label that names what it measures.
 *
 * @description
 * The label comes first in the markup and the value after it, so a screen
 * reader reads what the figure counts before the number. Visually, the number
 * stands out either way.
 *
 * Both are bare slots. An element that assigned itself a slot on connect would
 * add an attribute after upgrade, which markup rendered on the server by React
 * does not have.
 *
 * **A stat with a label is a group named by it**, so a reader moving through a
 * dashboard hears "Revenue, group" and then the figure, its unit and its
 * trend as one reading, rather than a run of loose words. The role and the name
 * are set through `ElementInternals` once the label is known, which writes no
 * attribute; a stat with no label has no role. Put a `Trend` in the `trend`
 * slot to have it read inside the group, after the figure it qualifies.
 *
 * **Or give the figure as a number.** `value` is written with
 * `Intl.NumberFormat`, in `locale` and with `format-options`, so
 * `value="1234567" format-options='{"notation":"compact"}'` shows `1.2M`, and
 * a server writes it as the browser does. A number in `value` takes the place
 * of a slotted figure.
 *
 * **Each slot is a part of the same name**, and `value` for the figure, so a
 * page reaches the label, the unit and the trend from outside. A slot draws no
 * box, so a part passes inherited properties to what is slotted. **The stat
 * says which pieces it holds**, as `:state(has-label)`, `:state(has-unit)` and
 * `:state(has-trend)`, read in the browser, so a served stat carries none
 * until the script runs.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Metric, KPI, Figure
 * @documentation https://fusion.dev/helix/components/stat
 *
 * @slot - The value.
 * @slot label - What the value measures, which also names the stat for a screen reader.
 * @slot trend - How the value moved, usually a `Trend`, read after the value inside the stat's group.
 * @slot unit - The unit, shown beside the value.
 *
 * @csspart label - The slot the label arrives through, drawing no box, as `value` does.
 * @csspart trend - The slot the trend arrives through, drawing no box, as `value` does.
 * @csspart unit - The slot the unit arrives through, drawing no box, as `value` does.
 * @csspart value - The slot the value is written in, or the figure `value` writes. A slot draws no box, so it takes the inherited properties, such as color and font, and passes them to the value.
 *
 * @cssstate has-label - Something is slotted into `label`.
 * @cssstate has-trend - Something is slotted into `trend`.
 * @cssstate has-unit - Something is slotted into `unit`.
 * @cssstate stepped - The figure is set a step smaller, because at full size it does not fit the stat's width on one line.
 * @cssstate stepped-twice - The figure is set two steps smaller, because one step smaller it still does not fit. `stepped` holds as well.
 */
@customElement('helix-headless-stat')
export class HelixHeadlessStat extends HelixElement {
  /**
   * Which way the label and the value are arranged.
   *
   * Absent is a column, the label over the number, which is how a figure is read
   * on a dashboard: the words say what is coming and the number answers.
   * `column-reverse` puts the number first, which is right where the number is
   * the headline and the label is a caption under it.
   *
   * The row directions set them side by side, for a figure in a line of text or
   * a narrow strip where a stacked pair would be two lines of almost nothing.
   *
   * A property rather than a `Flex` around it, because the unit has to stay on
   * the value's baseline whichever way the pair goes, and only this element
   * knows which of its children the unit belongs to.
   *
   * The name and the values are `Flex`'s, which lays out the same way. Which
   * way a number moved is `Trend`'s `movement`. On a Stat, `up`, `down` and
   * `neutral` are not layouts, and the pair stays the column.
   *
   * **Optional rather than defaulted to `column`, which is not a style
   * preference.** A reflecting property with a default writes its attribute onto
   * the host the moment the element upgrades, and the host is markup the
   * consumer rendered: React compares what it rendered against what is there and
   * reports a hydration mismatch. The absent attribute is the column, which the
   * stylesheet reads as the base case, and the server spec asserts the host
   * carries nothing nobody wrote.
   */
  @property({ reflect: true })
  direction?: 'column-reverse' | 'row' | 'row-reverse'

  /**
   * `Intl.NumberFormat` options `value` is written with, such as
   * `{"notation":"compact"}` for `1.2M` or `{"style":"percent"}` for `98%`,
   * written as JSON in the attribute.
   *
   * Absent writes the number as the locale writes any number.
   */
  @property({ attribute: 'format-options', type: Object })
  formatOptions?: Intl.NumberFormatOptions

  /**
   * The locale `value` is written in, such as `de` for `1.234.567`.
   *
   * Absent reads the nearest `lang`, then the runtime's own. Set it on a page
   * rendered on a server, so the server and the browser write the figure
   * alike.
   */
  @property()
  locale = ''

  /**
   * The figure as a number, written with `format-options` in `locale` in
   * place of a slotted value.
   *
   * Absent leaves the figure to the slot.
   */
  @property({ converter: numberConverter('value', undefined) })
  value?: number

  /* Named by what is slotted as the label: by reference where the engine
     reflects elements, so an edit to the label's text renames the group, and
     by the label's words where it does not. Nothing on a server, which has no
     children to name it with. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    const labels = this.knownChildren.filter((child) => child.slot === 'label')
    hostAria(internalsOf(this), {
      label:
        labels.length > 0 && !('ariaLabelledByElements' in internalsOf(this))
          ? slottedWords(this, ['label'])
          : '',
      labelledBy: labels,
      role: labels.length > 0 ? 'group' : '',
    })
  }

  /* A hydrated label slot was filled before its listener was bound and sends
     no change, so the name is read once more after hydrating. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  /** Watches the stat's own width, to step the figure down where it does not fit. */
  private widths: ResizeObserver | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    if (typeof ResizeObserver === 'undefined' || this.widths) {
      return
    }
    this.widths = new ResizeObserver(() => this.fit())
    this.widths.observe(this)
    /* **Measured again once a face arrives.** The figure is set in the display
       face, and measured in the fallback before it loads it fitted: "$8,402"
       stayed at full size in a 6rem column and wrapped once the face drew it
       wider, with no resize to measure it again. */
    this.ownerDocument.fonts?.addEventListener('loadingdone', this.refit)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.widths?.disconnect()
    this.widths = undefined
    this.ownerDocument.fonts?.removeEventListener('loadingdone', this.refit)
  }

  private readonly refit = (): void => this.fit()

  /**
   * Sets the figure a step or two smaller where it does not fit on one line.
   *
   * **A figure is read whole, so it is never broken between digits first.** At
   * full size "1,284" measured 104.5 pixels against a 6rem column and wrapped as
   * "1,28" over "4". Decided by the owner on November 3, 2026: step a long value
   * down the type scale, a second step where one is not enough, and break it only
   * where even that does not fit, and then only after a group separator. One step
   * left "$8,402" as "$8," over "402" at 6rem.
   *
   * Each size is measured on one line, with no wrapping, against the stat's own
   * width rather than the screen's, smallest step last. Measured afresh on every
   * resize, so the figure steps back up once the room is there.
   */
  private fit(): void {
    const part = this.renderRoot?.querySelector<HTMLElement>('[part="value"]')
    if (!part) {
      return
    }
    /* The figure's own column where it writes the figure, read before it is
       set on one line: the stat's whole width is the column and what stands
       beside it, and "$8,402" at 128 pixels fitted a 130 pixel stat and wrapped
       in its 126 pixel column. A slotted figure has no box, so the stat's
       content box stands for it. */
    const box = getComputedStyle(this)
    const room =
      part instanceof HTMLSlotElement
        ? this.clientWidth -
          (Number.parseFloat(box.paddingInlineStart) || 0) -
          (Number.parseFloat(box.paddingInlineEnd) || 0)
        : part.getBoundingClientRect().width
    if (room <= 0) {
      return
    }
    const unit = this.renderRoot.querySelector('[part="unit"]')
    const wrap = part.style.whiteSpace
    part.style.whiteSpace = 'nowrap'
    /* The breaks after the group separators are out while it is measured:
       Chromium breaks at a `<wbr>` under `nowrap`, and "$8,402" measured as its
       longer line, 71 pixels, and fitted a 96 pixel column it overflowed. */
    const breaks = [...part.querySelectorAll<HTMLElement>('wbr')]
    for (const one of breaks) {
      one.style.display = 'none'
    }
    /* The unit counts only beside a slotted figure: a figure the stat writes
       has a column of its own, and the unit already stands outside it. */
    const beside = part instanceof HTMLSlotElement ? this.widthOf(unit) : 0
    const fits = (): boolean => this.widthOf(part) + beside <= room + 0.5
    this.toggleState('stepped', false)
    this.toggleState('stepped-twice', false)
    if (!fits()) {
      this.toggleState('stepped', true)
      if (!fits()) {
        this.toggleState('stepped-twice', true)
      }
    }
    part.style.whiteSpace = wrap
    for (const one of breaks) {
      one.style.removeProperty('display')
    }
  }

  /** The width of what a part shows, slotted or its own, on the lines it takes. */
  private widthOf(part: Element | null): number {
    if (!part) {
      return 0
    }
    /* What the part holds, and not its box: the figure the part writes is a
       grid item, as wide as the column whatever it holds, so its box always
       fitted and the figure never stepped down. */
    const nodes =
      part instanceof HTMLSlotElement ? part.assignedNodes({ flatten: true }) : [...part.childNodes]
    const shown = nodes.filter(
      (node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim(),
    )
    if (shown.length === 0) {
      return 0
    }
    const range = document.createRange()
    range.setStartBefore(shown[0] as Node)
    range.setEndAfter(shown.at(-1) as Node)
    return range.getBoundingClientRect().width
  }

  /* Said once for the mix-up the description warns about. A server runs no
     `updated`, so nothing is said there. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.readPieces()
    this.fit()
    const given = this.direction as string | undefined
    if (changed.has('direction') && (given === 'up' || given === 'down' || given === 'neutral')) {
      reportRuntime({
        kind: 'misread-direction',
        message:
          `<${this.localName} direction="${given}"> lays out as the column: \`${given}\` is a ` +
          "`movement` of Trend's, which says which way a number moved. Put it on the " +
          "`helix-trend` in the stat's `trend` slot.",
        tag: this.localName,
      })
    }
  }

  /** Says which pieces the stat holds, one call apiece so each pairs with its `@cssstate`. */
  private readonly readPieces = (): void => {
    const filled = (name: string): boolean =>
      slotFilled(this.renderRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`))
    this.toggleState('has-label', filled('label'))
    this.toggleState('has-unit', filled('unit'))
    this.toggleState('has-trend', filled('trend'))
  }

  protected override render(): TemplateResult {
    /* The label's slot asks for the update that names the group, since a
       label arriving later changes no property; that update reads the
       pieces, and the unit's and the trend's slots read them directly. */
    const value = this.value
    const figure =
      value === undefined || !Number.isFinite(value)
        ? ''
        : formatNumber(value, wordsLocale(this), this.formatOptions)
    /* A break is offered after each group separator, so a figure too wide for
       its column even two steps smaller breaks as "$1,284," over "567.89" and
       not between two digits. */
    const pieces: (string | TemplateResult)[] = []
    if (figure !== '') {
      let run = ''
      for (const piece of formatNumberParts(
        value as number,
        wordsLocale(this),
        this.formatOptions,
      )) {
        run += piece.value
        if (piece.type === 'group') {
          pieces.push(html`${run}<wbr />`)
          run = ''
        }
      }
      pieces.push(run)
    }
    /* **The figure replaces the slot**, where a slot's fallback would not: the
       line breaks between the stat's children are assigned to the unnamed
       slot, so a fallback under it would never show. */
    return html`<slot name="label" part="label" @slotchange=${() => this.requestUpdate()}></slot>
      ${figure === '' ? html`<slot part="value"></slot>` : html`<span part="value">${pieces}</span>`}
      <slot name="unit" part="unit" @slotchange=${this.readPieces}></slot>
      <slot name="trend" part="trend" @slotchange=${this.readPieces}></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-stat': HelixHeadlessStat
  }
}
