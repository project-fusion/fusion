import { customElement } from '@helix-io/core'
import { HelixBaseSteps } from '@helix-io/headless'
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
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @aliases Stepper, Wizard, Progress steps
 * @documentation https://helix.fusion.dev/components/steps
 *
 * @cssproperty --steps-gap - Space between one step and the next.
 * @cssproperty --steps-marker-size - Size of the mark, glyph or digit.
 * @cssproperty --steps-connector-color - The rule running through the steps.
 * @cssproperty --steps-hover-color - Wash behind a step under the pointer.
 * @cssproperty --steps-complete-color - The mark on a finished step.
 * @cssproperty --steps-current-color - The mark on the current step.
 */
@customElement('helix-steps')
export class HelixSteps extends HelixBaseSteps {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-steps': HelixSteps
  }
}
