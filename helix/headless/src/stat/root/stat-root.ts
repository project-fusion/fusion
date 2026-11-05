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
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** The characters a figure groups its digits with, besides the locale's own. */
const SEPARATORS = new Set([',', '.', "'", '\u2019', ' ', '\u00a0', '\u2009', '\u202f'])

/** Text that reads as a figure: digits, the separators, signs, currency and percent. */
const FIGURE = /^[\p{N}\p{Sc}\p{Zs}.,'\u2019+\-\u2212%\u2030]+$/u

/** What a Stat asks of the group around it: the step its figure takes. */
interface StepSharing {
  stepFor(stat: HelixHeadlessStat): number
}

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
 * **A figure too wide for its column breaks after a group separator**, slotted
 * or written from `value`, so "$1,284,567" breaks as "$1,284," over "567" and
 * never between two digits. A slotted figure that is text alone is written by
 * the stat with those breaks, and the slot is hidden while it is. A figure
 * holding an element is shown as it is.
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
 * @csspart value - The slot the value is written in, or the figure the stat writes from `value` or from slotted text. A slot draws no box, so it takes the inherited properties, such as color and font, and passes them to the value.
 *
 * @cssstate has-label - Something is slotted into `label`.
 * @cssstate has-trend - Something is slotted into `trend`.
 * @cssstate has-unit - Something is slotted into `unit`.
 * @cssstate number - The slotted figure is text that reads as a number, such as `1284392118` or `$8,402`, so it breaks only after a group separator and never between two digits.
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
    /* **The figure is read before the render that draws it**, on the first
       update and when the locale moves, so its runs are in this render. Read
       in `firstUpdated` and `updated` it asked for a second update after the
       first had completed, which Lit's development build reports, on every
       stat on the site's home page. Not while hydrating, whose render is the
       server's: the update after it reads the figure. */
    if (this.childrenKnown && (!this.figureRead || changed.has('locale'))) {
      this.figureRead = true
      this.readFigure()
    }
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
     no change, so the name is read once more after hydrating. The update that
     asks for reads the figure too. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  /** Watches the stat's own width, to step the figure down where it does not fit. */
  private widths: ResizeObserver | undefined

  /**
   * A slotted figure that is text alone, cut into the runs it may break
   * after. Empty where the slot holds an element, or text with no group
   * separator, which the slot then shows as it is.
   */
  @state()
  private slottedRuns: string[] = []

  /** Whether the figure has been read since the children were known. */
  private figureRead = false

  /** Watches the slotted text, which a framework edits in place with no `slotchange`. */
  private edits: MutationObserver | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    if (typeof ResizeObserver === 'undefined' || this.widths) {
      return
    }
    this.widths = new ResizeObserver(() => this.fit())
    this.widths.observe(this)
    if (typeof MutationObserver !== 'undefined') {
      this.edits = new MutationObserver(this.readFigure)
      this.edits.observe(this, { characterData: true, subtree: true })
    }
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
    this.edits?.disconnect()
    this.edits = undefined
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
    /* **The stat's content box, less the unit's column and the gap before it.**
       The figure's own column is `auto`, sized by what it holds, so reading it
       was circular; and the gap is there whether a unit is or not: "1,284" in
       an 80 pixel stat measured 79.6 of room against the 76 its column had, and
       wrapped as "1,28" over "4". */
    const box = getComputedStyle(this)
    const unit = this.renderRoot.querySelector('[part="unit"]')
    const room =
      this.clientWidth -
      (Number.parseFloat(box.paddingInlineStart) || 0) -
      (Number.parseFloat(box.paddingInlineEnd) || 0) -
      (Number.parseFloat(box.columnGap) || 0) -
      this.widthOf(unit)
    if (room <= 0) {
      return
    }
    const wrap = part.style.whiteSpace
    part.style.whiteSpace = 'nowrap'
    /* The breaks after the group separators are out while it is measured:
       Chromium breaks at a `<wbr>` under `nowrap`, and "$8,402" measured as its
       longer line, 71 pixels, and fitted a 96 pixel column it overflowed. */
    const breaks = [...part.querySelectorAll<HTMLElement>('wbr')]
    for (const one of breaks) {
      one.style.display = 'none'
    }
    const fits = (): boolean => this.widthOf(part) <= room + 0.5
    this.showStep(0)
    let need = 0
    if (!fits()) {
      need = 1
      this.showStep(1)
      if (!fits()) {
        need = 2
      }
    }
    part.style.whiteSpace = wrap
    for (const one of breaks) {
      one.style.removeProperty('display')
    }
    this.stepNeeded = need
    /* **A group in columns sets every figure at one step**, the largest any of
       them needs. Each stat stepped on its own width, and one row of three in
       120 pixel columns read 42, 32 and 24. */
    const group = this.parentElement as Partial<StepSharing> | null
    this.showStep(group?.stepFor ? group.stepFor(this) : need)
  }

  /**
   * The steps down this stat's own figure needs to fit its width, from 0 to 2,
   * measured at full size whatever step it shows. A group in columns reads it
   * to set every figure at the same step.
   */
  stepNeeded = 0

  /** Sets the figure at a step, 0 for full size, without measuring it again. */
  showStep(step: number): void {
    this.toggleState('stepped', step >= 1)
    this.toggleState('stepped-twice', step >= 2)
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

  /**
   * Reads a slotted figure that is text alone into the runs it may break
   * after: each ends at a group separator between two digits.
   *
   * **A slotted figure broke between digits.** A slot offers no break of its
   * own, so it took `overflow-wrap: anywhere`, and "12,345,678" in a 120 pixel
   * stat broke as "12,345,67" over "8". The separators are the locale's own
   * group character and the ones figures are written with, a comma, a point, an
   * apostrophe, or a space, less the locale's decimal sign, so "1.284.567,89"
   * breaks after its points in German and "1,284.5" never after its point.
   */
  private readonly readFigure = (): void => {
    /* Before the first render there is no slot yet, and what it will hold is
       the children that name no other slot. */
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot:not([name])')
    const nodes =
      slot?.assignedNodes({ flatten: true }) ??
      [...this.childNodes].filter((node) => !(node instanceof Element && node.hasAttribute('slot')))
    const text = nodes.every((node) => node.nodeType === Node.TEXT_NODE)
      ? nodes
          .map((node) => node.textContent ?? '')
          .join('')
          .trim()
      : ''
    const parts = formatNumberParts(1234.5, wordsLocale(this))
    const group = parts.find((part) => part.type === 'group')?.value ?? ','
    const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.'
    const characters = [...text]
    const runs: string[] = []
    let run = ''
    for (const [at, character] of characters.entries()) {
      run += character
      const between = /\d/.test(characters[at - 1] ?? '') && /\d/.test(characters[at + 1] ?? '')
      if (between && character !== decimal && (character === group || SEPARATORS.has(character))) {
        runs.push(run)
        run = ''
      }
    }
    runs.push(run)
    /* **A number with no separator is kept whole**, as the owner decided on
       November 3, 2026: stepped down twice and then broken only after a group
       separator, so "1284392118" in a 6rem column does not break as
       "12843921" over "18". Words that are not a number keep breaking where
       they must. */
    this.toggleState('number', /\d/.test(text) && FIGURE.test(text))
    const next = runs.length > 1 ? runs : []
    const same =
      next.length === this.slottedRuns.length &&
      next.every((piece, at) => piece === this.slottedRuns[at])
    if (!same) {
      this.slottedRuns = next
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
    const slotted = figure === '' ? this.slottedRuns : []
    for (const [at, run] of slotted.entries()) {
      pieces.push(at < slotted.length - 1 ? html`${run}<wbr />` : run)
    }
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
       slot, so a fallback under it would never show. A slotted figure the
       stat writes itself keeps its slot, hidden, which is what tells it the
       text changed. */
    const written = figure !== '' || slotted.length > 0
    return html`<slot name="label" part="label" @slotchange=${() => this.requestUpdate()}></slot>
      ${figure === '' ? html`${written ? html`<span part="value">${pieces}</span>` : nothing}<slot part=${written ? nothing : 'value'} ?hidden=${written} @slotchange=${this.readFigure}></slot>` : html`<span part="value">${pieces}</span>`}
      <slot name="unit" part="unit" @slotchange=${this.readPieces}></slot>
      <slot name="trend" part="trend" @slotchange=${this.readPieces}></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-stat': HelixHeadlessStat
  }
}
