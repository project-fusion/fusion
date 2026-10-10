import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessLogGroup } from '@fusion.dev/helix-headless/log'
import type { CSSResultGroup } from 'lit'
import { styles } from './log-group.css.js'

/**
 * @summary One step of a log, which folds its lines under a heading with its status and how long it took.
 *
 * @description
 * The heading is a row in the sans face with a caret, the status mark in its
 * color, the heading, and the duration at the far end. A step that is `done`
 * takes the success color, one that `failed` the danger color, and one that
 * is `running` the info color.
 *
 * @since 0.199.0
 * @status experimental
 * @documentation https://fusion.dev/helix/components/log
 */
@customElement('helix-log-group')
export class HelixLogGroup extends HelixHeadlessLogGroup {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-log-group': HelixLogGroup
  }
}
