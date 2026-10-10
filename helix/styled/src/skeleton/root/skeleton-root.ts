import { customElement, numberConverter } from '@fusion.dev/helix-core'
import { HelixHeadlessSkeleton } from '@fusion.dev/helix-headless/skeleton'
import { type CSSResultGroup, html, type TemplateResult } from 'lit'
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
 * @csspart sheen - The highlight swept across the shape. Hidden for `effect="pulse"` and `effect="none"`.
 * @csspart skeleton - The placeholder shape, or each line of a `lines` paragraph.
 *
 * @cssproperty --skeleton-block-size - The height of the block shape, which is the shape when `shape` is unset. Defaults to the control height.
 * @cssproperty --skeleton-color - The placeholder's fill.
 * @cssproperty --skeleton-duration - How long one sweep or one pulse takes.
 * @cssproperty --skeleton-last-line-size - The width of the last line of a `lines` paragraph. Defaults to 60%.
 * @cssproperty --skeleton-radius - The corner of the block shape.
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

  /* One shape per line, each a `skeleton` part, so a page's rule for the
     shape reaches every line. */
  protected override renderShape(): TemplateResult {
    const count = Math.floor(this.lines ?? 1)
    if (this.shape !== 'text' || !(count > 1)) {
      return super.renderShape()
    }
    return html`<span part="lines">${Array.from(
      { length: count },
      () => html`<span part="skeleton line"><span part="sheen"></span></span>`,
    )}</span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-skeleton': HelixSkeleton
  }
}
