import { customElement } from '@helix-io/core'
import { HelixHeadlessSteps } from '@helix-io/headless/steps'
import type { CSSResultGroup } from 'lit'
import { styles } from './steps-root.css.js'

/**
 * @summary A sequence of stages, and where the reader is in it.
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
 * @status experimental
 * @category navigation
 * @aliases Stepper, Wizard, Progress steps
 * @documentation https://helix.fusion.dev/components/steps
 *
 * @cssproperty --steps-gap - Space between one step and the next.
 * @cssproperty --steps-connector-inset - Air either side of a mark, before the rail.
 * @cssproperty --steps-marker-size - Size of the mark, glyph or digit.
 * @cssproperty --steps-connector-color - The rule running through the steps.
 * @cssproperty --steps-complete-color - The mark on a finished step.
 * @cssproperty --steps-current-color - The mark on the current step.
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
