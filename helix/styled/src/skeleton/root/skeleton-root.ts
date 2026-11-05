import { customElement, numberConverter } from '@fusion.dev/helix-core'
import { HelixHeadlessSkeleton } from '@fusion.dev/helix-headless/skeleton'
import { type CSSResultGroup, html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './skeleton-root.css.js'

/**
 * @summary A placeholder shown in place of content that is still loading.
 *
 * @description
 * Animates a highlight sweeping across the block, which reads as work in
 * progress. A block fading in and out can look broken, so `effect="pulse"` is
 * a choice rather than the default.
 *
 * Around content with `loading`, the skeleton takes the content's box and
 * paints over it, and the content is hidden until `loading` is taken off.
 * Around a field, such as an Input with a label and a hint, it draws the
 * field's own pieces: a line for the label, the box, and a line for the hint.
 *
 * **`lines` draws a paragraph.** With `shape="text"` and `lines="3"`, one
 * element stands in for three lines of text: each line a `skeleton` part one
 * `em` tall, spaced a body line height apart, and the last one shorter, as the end
 * of a paragraph is.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Placeholder, Shimmer, Ghost
 * @documentation https://fusion.dev/helix/components/skeleton
 *
 * @csspart content - The box around the content, hidden while `loading`.
 * @csspart line - Each line of a `lines` paragraph, which is also a `skeleton` part.
 * @csspart lines - The column holding a `lines` paragraph, drawn only for `shape="text"` with two or more lines.
 * @csspart piece - Each shape drawn over a wrapped field: its label, its box, and its hint. Also a `skeleton` part.
 * @csspart pieces - The layer holding the shapes drawn over a wrapped field.
 * @csspart sheen - The highlight swept across the shape. Hidden for `effect="pulse"` and `effect="none"`.
 * @csspart skeleton - The placeholder shape, or each line of a `lines` paragraph.
 *
 * @cssproperty --skeleton-block-size - The height of the block shape, which is the shape when `shape` is unset. Defaults to the control height.
 * @cssproperty --skeleton-color - The placeholder's fill.
 * @cssproperty --skeleton-duration - How long one sweep or one pulse takes.
 * @cssproperty --skeleton-last-line-size - The width of the last line of a `lines` paragraph. Defaults to 60%.
 * @cssproperty --skeleton-radius - The corner of the block shape. Around content, it defaults to the corner the content draws.
 * @cssproperty --skeleton-sheen-color - The highlight the sweep carries across the fill.
 * @cssproperty --skeleton-size - The diameter of the circle shape.
 */
@customElement('helix-skeleton')
export class HelixSkeleton extends HelixHeadlessSkeleton {
  /**
   * How the placeholder shows it is waiting: a sweep when unset, `pulse` to
   * fade the fill in and out, or `none` to sit still.
   *
   * Reduced motion stills both.
   */
  @property({ reflect: true })
  effect?: 'none' | 'pulse'

  /**
   * How many lines of text the placeholder stands for, with `shape="text"`.
   *
   * Absent, or 1, is one line. Reflected, because the stylesheet sizes a
   * paragraph by it.
   */
  @property({ converter: numberConverter('lines', undefined), reflect: true })
  lines?: number

  /**
   * The shape of the placeholder: `text`, `circle`, or a block when unset.
   *
   * Unset is a block, which is what most missing things are. A block is the
   * control height until you size it, with a height on the element or
   * `--skeleton-block-size`.
   */
  @property({ reflect: true })
  shape?: 'text' | 'circle'

  static override styles: CSSResultGroup = styles

  /* **Around content, the shape takes the content's own corner**, so a
     wrapped Avatar is drawn round and a wrapped field with its field's
     corner: every wrapped thing came out as a `radii-sm` slab. Read from the
     element, or, where its host draws no corner, from the box its shadow root
     draws at the host's size. Read again once a custom element is defined,
     since an undefined one has no shadow root to read. */
  private corner = ''

  /* **Around a field, its pieces.** One block over a wrapped Input covered the
     label, the box and the hint as a single 90 pixel slab, a shape no field
     has. A field's shadow root lays out a label, a box and a hint one under
     another, so each visible one is measured where it sits and drawn as its
     own shape: the label and the hint as lines of text as wide as their
     words, the box with its corner. Measured after layout, when the field
     changes size, so a served page draws the one block until then. */
  private pieces: readonly Piece[] = []

  private fieldWatcher: ResizeObserver | undefined

  private watchedField: Element | undefined

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    const first =
      this.isConnected && typeof getComputedStyle === 'function' ? this.firstElementChild : null
    this.corner = first ? cornerOf(first) : ''
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const first = this.firstElementChild
    if (first?.localName.includes('-') && !customElements.get(first.localName)) {
      void customElements.whenDefined(first.localName).then(() => {
        requestAnimationFrame(() => this.requestUpdate())
      })
    }
    this.watchField(this.loading ? first : null)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.watchField(null)
  }

  /** Watches the wrapped element's size while loading, to measure its pieces. */
  private watchField(field: Element | null): void {
    if (field === this.watchedField || typeof ResizeObserver !== 'function') {
      return
    }
    this.fieldWatcher?.disconnect()
    this.watchedField = field ?? undefined
    if (!field) {
      /* Nothing to draw again: the shape reads the pieces only while loading. */
      this.pieces = []
      return
    }
    this.fieldWatcher ??= new ResizeObserver(() => this.measurePieces())
    this.fieldWatcher.observe(field)
  }

  private measurePieces(): void {
    const field = this.watchedField
    this.setPieces(field && this.loading ? (piecesOf(field, this) ?? linesOf(field, this)) : [])
  }

  private setPieces(next: readonly Piece[]): void {
    if (JSON.stringify(next) !== JSON.stringify(this.pieces)) {
      this.pieces = next
      this.requestUpdate()
    }
  }

  /* One shape per line, each a `skeleton` part, so a page's rule for the
     shape reaches every line. */
  protected override renderShape(): TemplateResult {
    if (this.loading && this.pieces.length > 0) {
      return html`<span part="pieces">${this.pieces.map(
        (piece) =>
          html`<span
            part="skeleton piece"
            ?data-line=${piece.line}
            style=${`inset-block-start: ${piece.top}px; inset-inline-start: ${piece.start}px; block-size: ${piece.height}px; inline-size: ${piece.width}px;${piece.corner ? ` --_skeleton-corner: ${piece.corner};` : ''}`}
            ><span part="sheen"></span
          ></span>`,
      )}</span>`
    }
    const count = Math.floor(this.lines ?? 1)
    if (this.shape !== 'text' || !(count > 1)) {
      return html`<span
        part="skeleton"
        style=${this.corner ? `--_skeleton-corner: ${this.corner}` : nothing}
        ><span part="sheen"></span
      ></span>`
    }
    return html`<span part="lines">${Array.from(
      { length: count },
      () => html`<span part="skeleton line"><span part="sheen"></span></span>`,
    )}</span>`
  }
}

/** One shape over a wrapped field, in pixels from the host's start edge and top. */
interface Piece {
  readonly corner: string
  readonly height: number
  readonly line: boolean
  readonly start: number
  readonly top: number
  readonly width: number
}

/**
 * The shapes a wrapped field is drawn as: one for each box its shadow root
 * lays out, where it has a label or a hint, which is what makes it a field.
 * A label or a hint is a line one `em` tall in the middle of its line box, as
 * wide as its words; the box keeps its own size and corner. Empty for anything
 * else, which keeps the one block. Undefined where the element is not a field.
 */
const piecesOf = (field: Element, host: Element): Piece[] | undefined => {
  const boxes = [...(field.shadowRoot?.children ?? [])]
  if (!boxes.some((box) => box.matches('[part~="label"], [part~="hint"]'))) {
    return undefined
  }
  const frame = host.getBoundingClientRect()
  const rtl = getComputedStyle(host).direction === 'rtl'
  const pieces: Piece[] = []
  for (const box of boxes) {
    const at = box.getBoundingClientRect()
    if (at.width === 0 || at.height === 0) {
      continue
    }
    const parts = box.getAttribute('part')?.split(/\s+/) ?? []
    const line = parts.includes('label') || parts.includes('hint')
    let start = rtl ? frame.right - at.right : at.left - frame.left
    let top = at.top - frame.top
    let width = at.width
    let height = at.height
    let corner = cornerOf(box)
    if (line) {
      const words = document.createRange()
      words.selectNodeContents(box)
      const ink = words.getBoundingClientRect()
      const size = Number.parseFloat(getComputedStyle(box).fontSize) || at.height
      width = Math.min(at.width, ink.width > 0 ? ink.width : at.width)
      start = rtl ? frame.right - Math.min(at.right, ink.right || at.right) : start
      top += Math.max(0, (at.height - size) / 2)
      height = Math.min(size, at.height)
      corner = ''
    }
    pieces.push({
      corner,
      height: Math.round(height),
      line,
      start: Math.round(start),
      top: Math.round(top),
      width: Math.round(width),
    })
  }
  return pieces
}

/**
 * **Around words that wrap, a line for each line they take.** One block over a
 * Text set on two lines drew a 538 by 42 slab, where `shape="text"` with
 * `lines` draws a paragraph as its lines. Only an element that holds words and
 * no elements, such as a Text or a paragraph, and only from two lines: one line
 * keeps the one shape the size of its words. Each line is one `em` tall in the
 * middle of its line box and as wide as its words, as a field's label is.
 */
const linesOf = (element: Element, host: Element): Piece[] => {
  if (element.children.length > 0 || (element.textContent ?? '').trim() === '') {
    return []
  }
  const words = document.createRange()
  words.selectNodeContents(element)
  const lines: { bottom: number; left: number; right: number; top: number }[] = []
  for (const box of words.getClientRects()) {
    if (box.width === 0) {
      continue
    }
    const line = lines.find(
      (one) => box.top < one.bottom - box.height / 2 && box.bottom > one.top + box.height / 2,
    )
    if (line) {
      line.left = Math.min(line.left, box.left)
      line.right = Math.max(line.right, box.right)
    } else {
      lines.push({ bottom: box.bottom, left: box.left, right: box.right, top: box.top })
    }
  }
  if (lines.length < 2) {
    return []
  }
  const frame = host.getBoundingClientRect()
  const rtl = getComputedStyle(host).direction === 'rtl'
  const size = Number.parseFloat(getComputedStyle(element).fontSize) || 16
  return lines.map((line) => ({
    corner: '',
    height: Math.round(size),
    line: true,
    start: Math.round(rtl ? frame.right - line.right : line.left - frame.left),
    top: Math.round((line.top + line.bottom) / 2 - size / 2 - frame.top),
    width: Math.round(line.right - line.left),
  }))
}

/** Whether a computed `border-radius` draws any corner at all. */
const rounded = (radius: string): boolean =>
  radius.split(/[\s/]+/).some((one) => Number.parseFloat(one) > 0)

/**
 * The corner an element draws, as a computed `border-radius`: its own, or that
 * of the element its open shadow root draws at its size. Empty where neither
 * draws one.
 */
const cornerOf = (element: Element): string => {
  const own = getComputedStyle(element).borderRadius
  if (rounded(own)) {
    return own
  }
  const box = element.getBoundingClientRect()
  for (const inner of element.shadowRoot?.children ?? []) {
    const at = inner.getBoundingClientRect()
    const radius = getComputedStyle(inner).borderRadius
    if (
      Math.abs(at.width - box.width) <= 1 &&
      Math.abs(at.height - box.height) <= 1 &&
      rounded(radius)
    ) {
      return radius
    }
  }
  return ''
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-skeleton': HelixSkeleton
  }
}
