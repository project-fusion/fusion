import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTour } from '@fusion.dev/helix-headless/tour'
import type { CSSResultGroup } from 'lit'
import { styles } from './tour-root.css.js'

/**
 * @summary A guided run through an interface, one stop at a time.
 *
 * @description
 * It draws the light and nothing else: the scrim's color and the lit box's
 * corners are this tier's, and the order, the stops and the measuring stay
 * below.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @documentation https://fusion.dev/helix/components/tour
 *
 * @cssproperty --tour-scrim-color - The darkness outside the lit box.
 * @cssproperty --tour-spotlight-radius - Corner radius of the lit box.
 */
@customElement('helix-tour')
export class HelixTour extends HelixHeadlessTour {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tour': HelixTour
  }
}
