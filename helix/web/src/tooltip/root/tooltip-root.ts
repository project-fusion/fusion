import { customElement } from '@helix-io/core'
import { HelixBaseTooltip } from '@helix-io/headless/tooltip'
import type { CSSResultGroup } from 'lit'
import { styles } from './tooltip-root.css.js'

/**
 * @summary A short description that appears beside what it describes.
 *
 * @description
 * The bubble is in the top layer, so it needs no `z-index` and cannot be
 * clipped by whatever it sits inside.
 *
 * The arrow is positioned by the same pass that positions the bubble, so it
 * still points at the trigger after the bubble has slid along to stay in view.
 *
 * @since 0.1.0
 * @status experimental
 * @category overlays
 * @aliases Hint, Popup label
 * @documentation https://helix.fusion.dev/components/tooltip
 *
 * @cssproperty --tooltip-arrow-size - Size of the point at the bubble's edge.
 * @cssproperty --tooltip-background-color - Fill of the bubble.
 * @cssproperty --tooltip-max-inline-size - Widest the bubble grows before wrapping.
 */
@customElement('helix-tooltip')
export class HelixTooltip extends HelixBaseTooltip {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tooltip': HelixTooltip
  }
}
