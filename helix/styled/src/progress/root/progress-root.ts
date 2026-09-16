import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessProgress } from '@fusion.dev/helix-headless/progress'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
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
 * @status stable
 * @category feedback
 * @groups charts
 * @aliases Progress bar, Loading bar
 * @documentation https://fusion.dev/helix/components/progress
 *
 * @cssproperty --progress-color - Fill of the part that is done.
 * @cssproperty --progress-ring-size - Diameter of the ring appearance.
 * @cssproperty --progress-ring-width - Thickness of its stroke.
 */
@customElement('helix-progress')
export class HelixProgress extends HelixHeadlessProgress {
  /**
   * How much ink the bar claims.
   *
   * `subtle` is the bar as a wash of its own color: still legible, no longer
   * the loudest thing in the region. The case is a background task, which has to
   * be visible and must not compete with what the reader is actually looking at.
   *
   * **One value and not the four.** `ghost` would leave a track with nothing in
   * it, which is not a quiet reading but an absent one. `outlined` is the
   * interesting refusal: `BarChart` earns it by keeping the area and fading it
   * toward the page, so an outlined column still encodes its value and stands as
   * a *different kind of fact* from the series beside it (a forecast, a target,
   * a budget). A progress bar is alone in its region and has nothing to differ
   * from, so an outline there costs legibility and buys no distinction. `solid`
   * is the resting state and is written by not writing it, per the rule that a
   * reflected property takes no default.
   * @cssproperty --progress-size - Thickness of the bar.
   * @cssproperty --progress-track-color - Fill of the part that is not.
   */
  @property({ reflect: true })
  emphasis?: 'subtle'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-progress': HelixProgress
  }
}
