import { customElement, HelixElement } from '@helix-io/core'
import { html, nothing, type SVGTemplateResult, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { encode } from 'uqr'

/** How much of the code can be lost and still read. */
export type QrCorrection = 'H' | 'L' | 'M' | 'Q'

/**
 * The dark modules of a matrix, as one path.
 *
 * One `<path>` rather than a rect per module. A modest code is 33 by 33, so a
 * rect apiece is a thousand elements the browser lays out and the accessibility
 * tree walks, and every one of them is a one-unit square. The path is the same
 * picture in a single node, and runs of adjacent modules are joined into one
 * subpath so a row of eight costs one `h8` rather than eight squares.
 */
const pathFor = (matrix: readonly (readonly boolean[])[]): string => {
  const parts: string[] = []
  for (const [y, row] of matrix.entries()) {
    let run = 0
    for (let x = 0; x <= row.length; x += 1) {
      if (row[x]) {
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
 * percent of itself and still read, which is what makes covering the centre
 * with a mark safe; at `L` the same mark makes the code unscannable. That is
 * why the slot exists on the same element as the property, and why the default
 * moves when the slot is filled.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases QR, Barcode, Scan code
 * @documentation https://helix.fusion.dev/components/qr-code
 *
 * @slot logo - A mark for the centre, which only reads at a high correction.
 *
 * @csspart code - The square itself.
 * @csspart logo - The box holding the centre mark.
 */
@customElement('helix-base-qr-code')
export class HelixBaseQrCode extends HelixElement {
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
   * How much of the code can be lost and still read.
   *
   * `M` by default, which is the level almost every code in the world uses and
   * costs about fifteen percent redundancy. `H` where a mark covers the centre,
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
    return svg`<svg
      part="code"
      viewBox="0 0 ${box} ${box}"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label=${this.label || this.value}
      shape-rendering="crispEdges"
    >
      <path d=${pathFor(result.data)} transform="translate(${quiet} ${quiet})" fill="currentColor" />
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
    'helix-base-qr-code': HelixBaseQrCode
  }
}
