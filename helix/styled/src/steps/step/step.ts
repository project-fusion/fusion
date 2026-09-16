import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessStep } from '@fusion.dev/helix-headless/steps'
import type { CSSResultGroup } from 'lit'
/* Inherited from the base along with the template: this file has no
   `<helix-button>` in it to remind anyone. */
import '../../button/index.js'
import { styles } from './step.css.js'

/**
 * @summary One stage in a sequence.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Stage
 * @documentation https://fusion.dev/helix/components/steps
 */
@customElement('helix-step')
export class HelixStep extends HelixHeadlessStep {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-step': HelixStep
  }
}
