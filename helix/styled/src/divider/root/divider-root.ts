import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDivider } from '@fusion.dev/helix-headless/divider'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './divider-root.css.js'

/**
 * @summary A line that separates content into groups.
 *
 * @description
 * A one-pixel rule in the border color that spans the full inline size by
 * default. A vertical divider stretches to fit its flex parent, so it matches
 * the height of what it sits beside.
 *
 * Content set into the line sits at its middle. `content-placement` moves it
 * toward the start or the end, leaving a short length of line before or after
 * it, the way a section label sits in a form.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Separator, Rule
 * @documentation https://fusion.dev/helix/components/divider
 *
 * @csspart content - The content set into the line.
 * @csspart line - The line, or each half of it when content is set into it.
 *
 * @cssproperty --divider-color - The color of the line.
 * @cssproperty --divider-content-color - The color of the content set into the line.
 * @cssproperty --divider-content-font-family - The typeface of the content set into the line. The sans face by default.
 * @cssproperty --divider-content-font-size - The size of the content set into the line. The `xs` step by default.
 * @cssproperty --divider-content-font-weight - The weight of the content set into the line. The weight around the divider by default.
 * @cssproperty --divider-content-gap - The space either side of the content set into the line.
 * @cssproperty --divider-content-offset - The length of line before the content under `content-placement="start"`, or after it under `end`.
 * @cssproperty --divider-length - The length of a vertical line. A horizontal line takes the divider's width.
 * @cssproperty --divider-padding - The space removed from both ends of the line.
 * @cssproperty --divider-padding-end - The space removed from the end of the line only.
 * @cssproperty --divider-padding-start - The space removed from the start of the line only.
 * @cssproperty --divider-thickness - The thickness of the line.
 */
@customElement('helix-divider')
export class HelixDivider extends HelixHeadlessDivider {
  /**
   * Where content set into the line sits along it.
   *
   * Absent is the middle. `start` and `end` move it toward one end, with a
   * short length of line, `--divider-content-offset`, kept before or after it.
   * A divider with nothing set into it is one line whatever this says.
   */
  @property({ attribute: 'content-placement', reflect: true })
  contentPlacement?: 'end' | 'start'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-divider': HelixDivider
  }
}
