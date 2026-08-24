import { customElement, HelixElement } from '@helix-io/core'
import { html, nothing, type SVGTemplateResult, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { encode } from 'uqr'

/** How much of the code can be lost and still read. */
export type QrCorrection = 'H' | 'L' | 'M' | 'Q'

/** How the modules are drawn. */
export type QrStyle = 'dots' | 'rounded' | 'square'

/** Whether a module is one of the three finder squares, or their separators. */
const isFinder = (x: number, y: number, size: number): boolean => {
  const near = (a: number, b: number): boolean => a < 8 && b < 8
  return near(x, y) || near(size - 1 - x, y) || near(x, size - 1 - y)
}

/**
 * The dark modules of a matrix, as one path.
 *
 * One `<path>` rather than a rect per module. A modest code is 33 by 33, so a
 * rect apiece is a thousand elements the browser lays out and the accessibility
 * tree walks, and every one of them is a one-unit square.
 *
 * **`square` joins runs and the other styles cannot.** A row of eight square
 * modules is one `h8`, which is what keeps the node count down; a row of eight
 * *rounded* ones is eight shapes, because the corners are what is being drawn
 * and a joined run has no corners in the middle of it. So the cost of the other
 * styles is real and is paid only by the codes that ask for them.
 *
 * `only` splits the drawing in two without walking the matrix twice: the finder
 * squares are structural, at three known corners, so a caller can ask for them
 * alone and get a second path to paint differently.
 */
const pathFor = (
  matrix: readonly (readonly boolean[])[],
  style: QrStyle,
  only: 'all' | 'body' | 'finders' = 'all',
): string => {
  const size = matrix.length
  const wanted = (x: number, y: number): boolean => {
    if (!matrix[y]?.[x]) {
      return false
    }
    if (only === 'all') {
      return true
    }
    return only === 'finders' ? isFinder(x, y, size) : !isFinder(x, y, size)
  }

  const parts: string[] = []
  if (style === 'square') {
    for (let y = 0; y < size; y += 1) {
      let run = 0
      for (let x = 0; x <= size; x += 1) {
        if (wanted(x, y)) {
          run += 1
          continue
        }
        if (run > 0) {
          parts.push(`M${x - run} ${y}h${run}v1h-${run}z`)
          run = 0
        }
      }
    }
    return parts.join('')
  }

  /* A circle for `dots` and a squircle for `rounded`, both drawn as arcs on a
     one-unit square. The radius is a little under half so neighbouring dots do
     not touch, which is what makes a dotted code read as dots rather than as a
     square one with soft edges. */
  const r = style === 'dots' ? 0.45 : 0.28
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!wanted(x, y)) {
        continue
      }
      if (style === 'dots') {
        parts.push(
          `M${x + 0.5 - r} ${y + 0.5}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0z`,
        )
      } else {
        parts.push(
          `M${x + r} ${y}h${1 - r * 2}a${r} ${r} 0 0 1 ${r} ${r}` +
            `v${1 - r * 2}a${r} ${r} 0 0 1 ${-r} ${r}` +
            `h${-(1 - r * 2)}a${r} ${r} 0 0 1 ${-r} ${-r}` +
            `v${-(1 - r * 2)}a${r} ${r} 0 0 1 ${r} ${-r}z`,
        )
      }
    }
  }
  return parts.join('')
}

/**
 * @summary Encodes a short piece of text as a scannable square.
 *
 * @description
 * **The picture is one `<path>`, not a grid of squares.** A code of any useful
 * length is a thousand modules, and drawing each as its own rect is a thousand
 * nodes for one image. Runs of adjacent dark modules are joined, so a row of
 * eight is one horizontal move rather than eight squares.
 *
 * **It is an image and says so.** `role="img"` with a name, because what a
 * reader with a screen reader needs is what the code is *for*, and no amount of
 * describing the pattern gives them that. Where nothing is passed the value
 * itself is the name, which is right far more often than it looks: most codes
 * hold a URL, and a URL read aloud is the destination.
 *
 * **The quiet zone is part of the code.** Four modules of margin are required
 * by the specification, not a design choice, and a scanner will refuse a code
 * that is cropped to its edge. It is drawn inside the `viewBox` so it survives
 * any size the component is given, including one set in CSS.
 *
 * `correction` is what buys the middle slot. A code at `H` can lose thirty
 * percent of itself and still read, which is what makes covering the center
 * with a mark safe; at `L` the same mark makes the code unscannable. That is
 * why the slot exists on the same element as the property, and why the default
 * moves when the slot is filled.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases QR, Barcode, Scan code
 * @documentation https://helix.fusion.dev/components/qr-code
 *
 * @slot logo - A mark for the center, which only reads at a high correction.
 *
 * @csspart code - The square itself.
 * @csspart modules - Everything but the three corner squares.
 * @csspart finders - The three corner squares, which can take their own color.
 * @csspart logo - The box holding the center mark.
 */
@customElement('helix-headless-qr-code')
export class HelixHeadlessQrCode extends HelixElement {
  /** What the code encodes, which is usually a URL. */
  @property()
  value = ''

  /**
   * What the image is called.
   *
   * Falling back to the value is deliberate: a code almost always holds a URL,
   * and a URL is a better name than "QR code" for a reader who cannot see it.
   */
  @property()
  label = ''

  /**
   * How the modules are drawn.
   *
   * `square` is the default and the only one that joins runs of adjacent
   * modules into a single subpath, which is what keeps a thousand modules to a
   * handful of nodes. `rounded` and `dots` draw each module on its own, because
   * the corners are the thing being drawn and a joined run has none in the
   * middle. That cost is paid only by a code that asks for them.
   *
   * A scanner reads contrast between cells, not their shape, so all three
   * scan. `dots` sits a little under half a module so neighbours do not touch,
   * which is what makes it read as dots rather than as a softened square code.
   */
  @property()
  shape: QrStyle = 'square'

  /**
   * How much of the code can be lost and still read.
   *
   * `M` by default, which is the level almost every code in the world uses and
   * costs about fifteen percent redundancy. `H` where a mark covers the center,
   * chosen automatically when the slot is filled: it is the level that makes
   * covering safe, and a consumer who fills the slot has said what they want
   * without having to know that.
   */
  @property({ attribute: 'correction' })
  correction?: QrCorrection

  /** Whether anything is slotted into the middle. */
  private logo = false

  /** The level actually used, which the slot can raise. */
  private get level(): QrCorrection {
    return this.correction ?? (this.logo ? 'H' : 'M')
  }

  private renderCode(): SVGTemplateResult | typeof nothing {
    if (this.value === '') {
      return nothing
    }
    /* Regenerated on every render rather than cached. It is a pure function of
       two properties, Lit only renders when one of them moved, and a cache here
       would be a second place for them to disagree. */
    const result = encode(this.value, { border: 0, ecc: this.level })
    const size = result.size
    /* The quiet zone, in the `viewBox` rather than in a wrapper's padding. Four
       modules is what the specification requires and what a scanner looks for,
       so it has to scale with the code and not with whatever box the component
       was given. */
    const quiet = 4
    const box = size + quiet * 2
    /* The three corner squares as their own path, so they can take their own
       color. Their positions are structural rather than guessed: seven by
       seven at each of three corners, plus the separator ring, which is what
       `isFinder` describes. Drawn square whatever the body's style is, because
       they are what a scanner locks onto first and rounding them costs
       reliability for decoration. */
    const finders = pathFor(result.data, 'square', 'finders')
    return svg`<svg
      part="code"
      viewBox="0 0 ${box} ${box}"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label=${this.label || this.value}
      shape-rendering="crispEdges"
    >
      <path
        part="modules"
        d=${pathFor(result.data, this.shape, 'body')}
        transform="translate(${quiet} ${quiet})"
        fill="currentColor"
      />
      <path
        part="finders"
        d=${finders}
        transform="translate(${quiet} ${quiet})"
        fill="currentColor"
      />
    </svg>`
  }

  protected override render(): TemplateResult {
    return html`${this.renderCode()}
    <span ?hidden=${!this.logo} part="logo">
      <slot
        name="logo"
        @slotchange=${(event: Event) => {
          const next = (event.target as HTMLSlotElement).assignedNodes().length > 0
          if (next !== this.logo) {
            this.logo = next
            this.requestUpdate()
          }
        }}
      ></slot>
    </span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-qr-code': HelixHeadlessQrCode
  }
}
