import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessProgress } from '@fusion.dev/helix-headless/progress'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './progress-root.css.js'

/**
 * @summary A bar or ring that shows how far along a task is.
 *
 * @description
 * A track and the part of it that is done. The height comes from a token, like
 * control sizes elsewhere in the library, so you can set `--progress-size` once
 * on a region.
 *
 * The fill transitions between values. Progress often arrives in large steps,
 * and a fill that moves between them shows one task advancing.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @groups charts
 * @aliases Progress bar, Loading bar
 * @documentation https://fusion.dev/helix/components/progress
 *
 * @slot label - A visible label, above a bar and under a ring. Its words name it in place of `label`.
 *
 * @cssproperty --progress-color - Fill of the part that is done.
 * @cssproperty --progress-label-color - Color of a slotted label.
 * @cssproperty --progress-label-gap - Space between a slotted label and the bar.
 * @cssproperty --progress-label-size - Type size of a slotted label.
 * @cssproperty --progress-ring-size - Diameter of the ring.
 * @cssproperty --progress-ring-width - Thickness of the ring's stroke.
 * @cssproperty --progress-size - Thickness of the bar.
 * @cssproperty --progress-track-color - Fill of the part that is not done.
 * @cssproperty --progress-transition-duration - How long the fill takes to move to a new value. `0s` moves it at once.
 */
@customElement('helix-progress')
export class HelixProgress extends HelixHeadlessProgress {
  /**
   * How strongly the bar is drawn.
   *
   * `subtle` is the bar as a wash of its own color: still legible, no longer
   * the loudest thing in the region. The case is a background task, which has to
   * be visible and must not compete with what the reader is actually looking at.
   *
   * **One value of the five.** `ghost` would leave a track with nothing in
   * it, which is not a quiet reading but an absent one. `muted` is the quiet
   * ink `Text` takes and a bar draws a fill rather than ink, so `subtle` is the
   * whole of what quiet means here. `outlined` is the
   * interesting refusal: `BarChart` earns it by keeping the area and fading it
   * toward the page, so an outlined column still encodes its value and stands as
   * a *different kind of fact* from the series beside it (a forecast, a target,
   * a budget). A progress bar is alone in its region and has nothing to differ
   * from, so an outline there costs legibility and buys no distinction. `solid`
   * is the resting state and is written by not writing it, per the rule that a
   * reflected property takes no default.
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
