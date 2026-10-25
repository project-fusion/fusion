import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessStep } from '@fusion.dev/helix-headless/steps'
import type { CSSResultGroup } from 'lit'
/* Inherited from the base along with the template: this file has no
   `<helix-button>` in it to remind anyone. */
import '../../button/index.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './step.generated.css.js'

/**
 * @summary One stage in a sequence.
 *
 * @description
 * A step draws its mark, its name as a `helix-button`, and the line that joins
 * it to the steps either side. The mark is a tick on a finished step, a dot
 * on the current one, and an empty ring on one nobody has reached. Where the
 * list sets `marker="numeric"`, it is the step's number.
 *
 * Down a column, the current step opens to show what is in its `content` slot,
 * and the others collapse it. A collapsed stage's content is hidden, so Tab and
 * a screen reader pass over it as well.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Stage
 * @documentation https://fusion.dev/helix/components/steps
 */
@customElement('helix-step')
export class HelixStep extends HelixHeadlessStep {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [liveStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-step': HelixStep
  }
}
