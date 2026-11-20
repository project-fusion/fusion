import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSteps } from '@fusion.dev/helix-headless/steps'
import type { CSSResultGroup } from 'lit'
import { styles } from './steps-root.generated.css.js'

/**
 * @summary A sequence of stages that shows which stage the user is on.
 *
 * @description
 * The numbers are a CSS counter, so the browser draws each step's position at
 * layout, the numbers are correct in the server's markup with no script, and
 * reordering the steps renumbers them.
 *
 * A step's name is a `helix-button`, so its hover, focus, and disabled styles
 * come from `Button` and use Button's custom properties.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Stepper, Wizard, Progress steps
 * @use Progress through a fixed sequence of stages, such as a checkout.
 * @instead tabs - Sections you visit in any order.
 * @instead number-input - A number you type, such as a quantity.
 * @anatomy step
 * @anatomy progress?
 * @practice Give every step a `value`, or none. - A step with no value is named by its place, so a value of 2 and the second place are one name.
 * @practice Set `--button-background-color` to change the hover color of a step's name. - The name is a Button, and Steps has no `--steps-hover-color`.
 * @documentation https://fusion.dev/helix/components/steps
 *
 * @csspart progress - How far through the sequence is, drawn as a bar under the steps once a stylesheet gives the part a `display`, such as `helix-steps::part(progress) { display: block }`.
 *
 * @cssproperty --steps-complete-color - Color of the mark on a finished step.
 * @cssproperty --steps-connector-color - Color of the line that connects the steps.
 * @cssproperty --steps-connector-inset - Space on either side of a mark, before the connecting line.
 * @cssproperty --steps-current-color - Color of the mark on the current step.
 * @cssproperty --steps-gap - Space between one step and the next.
 * @cssproperty --steps-marker-size - Size of the mark, whether an icon or a digit.
 * @cssproperty --steps-progress-color - Fill of the progress bar, once a page shows the `progress` part.
 * @cssproperty --steps-progress-thickness - Height of the progress bar.
 * @cssproperty --steps-progress-track-color - Color of the progress bar's track.
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
