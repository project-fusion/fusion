import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTour } from '@fusion.dev/helix-headless/tour'
import type { CSSResultGroup } from 'lit'
import { styles } from './tour-root.css.js'

/**
 * @summary A guided tour of an interface, one stop at a time.
 *
 * @description
 * Draws the spotlight: the scrim's color and the corners of the lit box. The
 * order, the stops, and the measuring are in the headless tier.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @use A guided first look at an interface, one stop at a time, such as after you sign up.
 * @instead steps - Stages of a task you complete in order, such as a checkout.
 * @instead popover - Content beside one control that opens when you press it.
 * @anatomy spotlight
 * @anatomy surface
 * @anatomy arrow
 * @anatomy actions
 * @practice Open what a stop points at in the stop's `effect`, such as a menu or a drawer. - The tour runs it as it reaches the stop, and waits for a promise it returns before it shows the stop.
 * @documentation https://fusion.dev/design/components/tour
 *
 * @cssproperty --tour-scrim-color - The color of the dimmed area outside the spotlight.
 * @cssproperty --tour-spotlight-radius - The corner radius of the spotlight.
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
