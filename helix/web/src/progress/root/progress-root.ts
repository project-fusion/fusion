import { customElement } from '@helix-io/core'
import { HelixBaseProgress } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './progress-root.css.js'

/**
 * @summary Shows how far along a task is, when that is known.
 *
 * @description
 * A track and the part of it that is done. The height comes from a token rather
 * than from a size property, for the reason the rest of the library gives about
 * controls: how heavy a bar is says something about the region it is in, and a
 * `--progress-size` on that region says it once.
 *
 * The fill transitions, which is worth more here than it looks. Progress
 * arrives in steps, often large ones, and a bar that jumps between them reads
 * as a series of unrelated states where one that travels reads as a single
 * thing advancing.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Progress bar, Loading bar
 * @documentation https://helix.fusion.dev/components/progress
 *
 * @cssproperty --progress-size - Thickness of the bar.
 * @cssproperty --progress-color - Fill of the part that is done.
 * @cssproperty --progress-track-color - Fill of the part that is not.
 */
@customElement('helix-progress')
export class HelixProgress extends HelixBaseProgress {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-progress': HelixProgress
  }
}
