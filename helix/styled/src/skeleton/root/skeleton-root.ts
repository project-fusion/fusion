import { customElement, numberConverter } from '@fusion.dev/helix-core'
import { HelixHeadlessSkeleton } from '@fusion.dev/helix-headless/skeleton'
import { type CSSResultGroup, html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './skeleton-root.generated.css.js'

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
 * A label, a hint, or a box of words alone is a line for each line its words
 * take, one `em` tall in the middle of its line box and as wide as its words;
 * any other box keeps its own size and corner. Undefined where the element is
 * not a field.
 *
 * **A row that holds a box beside its label is read for both**, as a
 * Checkbox's or a Radio's `<label>` is. Read as one, the Checkbox drew its
 * label's two lines and no box (measured November 4, 2026). **A slot is read
 * for what it shows**, since it draws no box of its own: a Stat's label and
 * figure arrive through slots, and the Stat drew one 112 by 50 block for its
 * figure and nothing for its label.
 */
const piecesOf = (field: Element, host: Element): Piece[] | undefined => {
  const boxes = [...(field.shadowRoot?.children ?? [])].flatMap((box) =>
    box.matches('[part~="field"]') && box.querySelector(':scope > [part~="label"]')
      ? [...box.children]
      : [box],
  )
  if (!boxes.some((box) => box.matches('[part~="label"], [part~="hint"]'))) {
    return undefined
  }
  const frame = host.getBoundingClientRect()
  const rtl = getComputedStyle(host).direction === 'rtl'
  const pieces: Piece[] = []
  for (const box of boxes) {
    const at = box.getBoundingClientRect()
    const slot = box instanceof HTMLSlotElement
    /* A label drawn only to name the box is clipped to a pixel, and is no
       line a reader sees. A slot draws no box, so it is read for its words. */
    if (!slot && (at.width <= 1 || at.height <= 1)) {
      continue
    }
    const parts = box.getAttribute('part')?.split(/\s+/) ?? []
    const words = wordsOf(box)
    const line =
      words.length > 0 && (parts.includes('label') || parts.includes('hint') || wordy(box))
    if (line) {
      const size = fontOf(box)
      for (const one of linesIn(words)) {
        pieces.push(lineAt(one, size, frame, rtl))
      }
      continue
    }
    if (slot) {
      continue
    }
    pieces.push({
      corner: cornerOf(box),
      height: Math.round(at.height),
      line: false,
      start: Math.round(rtl ? frame.right - at.right : at.left - frame.left),
      top: Math.round(at.top - frame.top),
      width: Math.round(at.width),
    })
  }
  return pieces
}

/** Whether a box holds words alone: a slot, or text with nothing in it but breaks and slots. */
const wordy = (box: Element): boolean =>
  box instanceof HTMLSlotElement ||
  [...box.children].every((child) => child.localName === 'wbr' || child.localName === 'slot')

/**
 * The words a box shows, as ranges: what a slot in it is assigned, or falls
 * back to, or the box's own text. Empty where it shows no words. An element
 * among them is read for what it holds and not for its box, which a grid can
 * stretch: a Stat's label measured the stat's whole width.
 */
const wordsOf = (box: Element): Range[] => {
  const slot = box instanceof HTMLSlotElement ? box : box.querySelector('slot')
  const nodes = slot ? slot.assignedNodes({ flatten: true }) : [box]
  return nodes
    .filter((node) => node.textContent?.trim())
    .map((node) => {
      const range = document.createRange()
      if (node.nodeType === Node.TEXT_NODE) {
        range.selectNode(node)
      } else {
        range.selectNodeContents(node)
      }
      return range
    })
}

/**
 * The size a box's words are set in: those of what a slot in it shows, which
 * may set their own, as a Stat's label does at 12 in a stat at 16.
 */
const fontOf = (box: Element): number => {
  const slot = box instanceof HTMLSlotElement ? box : box.querySelector('slot')
  const first = slot?.assignedNodes({ flatten: true }).find((node) => node.textContent?.trim())
  const holder =
    first instanceof Element
      ? first
      : ((first as Text | undefined)?.assignedSlot ?? first?.parentElement ?? box)
  return Number.parseFloat(getComputedStyle(holder).fontSize) || 16
}

interface LineBox {
  bottom: number
  left: number
  right: number
  top: number
}

/** The lines a run of words takes, each the span of the boxes on it. */
const linesIn = (words: Range[]): LineBox[] => {
  const lines: LineBox[] = []
  for (const box of words.flatMap((one) => [...one.getClientRects()])) {
    if (box.width === 0) {
      continue
    }
    const line = lines.find(
      (one) => box.top < one.bottom - box.height / 2 && box.bottom > one.top + box.height / 2,
    )
    if (line) {
      line.left = Math.min(line.left, box.left)
      line.right = Math.max(line.right, box.right)
      line.top = Math.min(line.top, box.top)
      line.bottom = Math.max(line.bottom, box.bottom)
    } else {
      lines.push({ bottom: box.bottom, left: box.left, right: box.right, top: box.top })
    }
  }
  return lines
}

/** A line of words as a shape, one `em` tall in the middle of the line. */
const lineAt = (line: LineBox, size: number, frame: DOMRect, rtl: boolean): Piece => ({
  corner: '',
  height: Math.round(Math.min(size, line.bottom - line.top)),
  line: true,
  start: Math.round(rtl ? frame.right - line.right : line.left - frame.left),
  top: Math.round(
    (line.top + line.bottom) / 2 - Math.min(size, line.bottom - line.top) / 2 - frame.top,
  ),
  width: Math.round(line.right - line.left),
})

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
  const lines = linesIn([words])
  if (lines.length < 2) {
    return []
  }
  const frame = host.getBoundingClientRect()
  const rtl = getComputedStyle(host).direction === 'rtl'
  const size = Number.parseFloat(getComputedStyle(element).fontSize) || 16
  return lines.map((line) => lineAt(line, size, frame, rtl))
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
  /* Or that of a child drawn at its size, as a Checkbox's input is inside the
     box that holds it. */
  for (const inner of [...(element.shadowRoot?.children ?? []), ...element.children]) {
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
