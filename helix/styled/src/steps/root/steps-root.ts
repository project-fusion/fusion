import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSteps } from '@fusion.dev/helix-headless/steps'
import type { CSSResultGroup } from 'lit'
import { styles } from './steps-root.css.js'

/**
 * @summary A sequence of stages that shows which stage the user is on.
 *
 * @description
 * The numbering is a CSS counter rather than a property, so a step's position
 * is drawn by the browser at layout and is right in the server's markup with no
 * script involved. Reordering the steps renumbers them; nothing has to be told.
 *
 * A step's name is a `helix-button`, so what it looks like under the pointer,
 * with focus, and when refused are Button's decisions and Button's hooks. There
 * is no `--steps-hover-color`: `--button-background-color` is that hook, and a
 * second name for it here would be a second thing to keep in step.
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
