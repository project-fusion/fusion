import { customElement } from '@helix-io/core'
import { HelixHeadlessTour } from '@helix-io/headless/tour'
import type { CSSResultGroup } from 'lit'
import { styles } from './tour-root.css.js'

/**
 * @summary A guided run through an interface, one stop at a time.
 *
 * @description
 * The styled tier of `BaseTour`. It draws the light and nothing else.
 *
 * @since 0.1.0
 * @status experimental
 * @category overlays
 * @documentation https://helix.fusion.dev/components/tour
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
