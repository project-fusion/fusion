import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSteps } from '@fusion.dev/helix-headless/steps'
import type { CSSResultGroup } from 'lit'
import { styles } from './steps-root.css.js'

/**
 * @summary A sequence of stages that shows which stage the user is on.
 *
 * @description
 * The numbers are a CSS counter, so the browser draws each step's position at
 * layout, the numbers are correct in the server's markup with no script, and
 * reordering the steps renumbers them.
 *
 * A step's name is a `helix-button`, so its hover, focus, and disabled styles
 * come from `Button` and use Button's custom properties. To change the hover
 * color, set `--button-background-color`. There is no `--steps-hover-color`.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Stepper, Wizard, Progress steps
 * @documentation https://fusion.dev/helix/components/steps
 *
 * @cssproperty --steps-complete-color - Color of the mark on a finished step.
 * @cssproperty --steps-connector-color - Color of the line that connects the steps.
 * @cssproperty --steps-connector-inset - Space on either side of a mark, before the connecting line.
 * @cssproperty --steps-current-color - Color of the mark on the current step.
 * @cssproperty --steps-gap - Space between one step and the next.
 * @cssproperty --steps-marker-size - Size of the mark, whether an icon or a digit.
 */
@customElement('helix-steps')
export class HelixSteps extends HelixHeadlessSteps {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-steps': HelixSteps
  }
}
