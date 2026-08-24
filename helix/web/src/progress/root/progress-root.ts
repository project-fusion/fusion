import { customElement } from '@helix-io/core'
import { HelixBaseProgress } from '@helix-io/headless/progress'
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
 * @documentation https://helix.fusion.dev/components/progress
 *
 * @cssproperty --progress-size - Thickness of the bar.
 * @cssproperty --progress-color - Fill of the part that is done.
 * @cssproperty --progress-track-color - Fill of the part that is not.
 *
 * @cssproperty --progress-ring-size - Diameter of the ring appearance.
 * @cssproperty --progress-ring-width - Thickness of its stroke.
 *
 */ @customElement('helix-progress')
export class HelixProgress extends HelixBaseProgress {
  /**
   * How much ink the bar claims.
   *
   * `subtle` is the bar as a wash of its own color: still legible, no longer
   * the loudest thing in the region. The case is a background task: something uploading while the reader is doing something else has to be visible and must not compete with what they are actually looking at.
   *
   * **One value and not the four, which is the judgment this axis asks for
   * rather than a partial sweep.** `ghost` would leave a track with nothing in
   * it, which is not a quiet reading but an absent one. `outlined` is the
   * interesting refusal: `BarChart` makes it work by keeping the area and fading
   * it toward the page, so an outlined column still encodes its value, and the
   * reason it earns the value there is that a chart has other series for the
   * outlined one to be a *different kind of fact from* (a forecast, a target,
   * a budget). A progress bar is alone in its region and has nothing to differ from, so an outline there costs legibility and buys no distinction. `solid` is the resting state and is written by not
   * writing it, per the rule that a reflected property takes no default.
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
