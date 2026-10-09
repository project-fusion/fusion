import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMotionToggle } from '@fusion.dev/helix-headless/motion-toggle'
import type { CSSResultGroup } from 'lit'
import { styles } from './motion-toggle-root.css.js'

/**
 * @summary A button that pauses every motion on the page that starts by itself, and lets it run again.
 *
 * @description
 * A quiet square button, as the controls over a map are, with the pause icon
 * while motion runs and the play icon while it is paused. Text slotted into
 * it stands beside the icon.
 *
 * @since 0.199.0
 * @status experimental
 * @category actions
 * @documentation https://fusion.dev/helix/components/motion-toggle
 *
 * @cssproperty --motion-toggle-background-color - The button's fill. Defaults to the floating overlay surface.
 */
@customElement('helix-motion-toggle')
export class HelixMotionToggle extends HelixHeadlessMotionToggle {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-motion-toggle': HelixMotionToggle
  }
}
