import { customElement } from '@helix-io/core'
import { HelixBaseStep } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './step.css.js'

/**
 * @summary One stage in a sequence.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Stage
 * @documentation https://helix.fusion.dev/components/steps
 */
@customElement('helix-step')
export class HelixStep extends HelixBaseStep {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-step': HelixStep
  }
}
