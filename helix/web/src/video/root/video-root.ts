import { customElement } from '@helix-io/core'
import { HelixBaseVideo } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import '../../icon/index.js'
import { styles } from './video-root.css.js'

/**
 * @summary Plays a video, with controls this library draws rather than the
 * browser's.
 *
 * @description
 * The player is the base tier's. What this adds is the bar: where it sits, when
 * it is there, and what the two ranges look like, which is the whole reason to
 * replace a control set that cannot be styled.
 *
 * **The bar is over the picture, not under it.** A bar in the layout would move
 * everything below the video by its own height and would leave a strip of page
 * colour under a picture that is meant to be the whole of it. Over it, the
 * video is the component's size and the controls belong to it.
 *
 * **It goes when nobody is using it, and comes back for the keyboard.** Hidden
 * while playing and untouched, shown on hover, and shown whenever anything
 * inside it has focus, which is what keeps it reachable without a pointer. A
 * paused video keeps its bar, because a reader who stopped it is deciding what
 * to do next.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @documentation https://helix.fusion.dev/components/video
 *
 * @property appearance - Whether the bar floats on the picture or sits on its own ground.
 *
 * @cssproperty --video-aspect-ratio - The shape of the box. Defaults to the
 * video's own once known, and `16 / 9` until then.
 * @cssproperty --video-well-color - Behind the picture, and in the letterbox bars.
 * @cssproperty --video-radius - The corner it is cut to.
 * @cssproperty --video-controls-color - The ink on the bar.
 * @cssproperty --video-accent-color - The played part of the scrubber.
 */
@customElement('helix-video')
export class HelixVideo extends HelixBaseVideo {
  /**
   * How the control bar sits on the picture.
   *
   * `transparent` is the default and is what a player looks like: the controls
   * float on a gradient that darkens the frame just enough to read them, and
   * the picture runs edge to edge behind them. `solid` gives them a bar of
   * their own, which is what a video embedded in a document usually wants,
   * where the player is a component on a page rather than the page itself.
   *
   * A presentation property, so it lives on this tier. The base element renders
   * the same bar either way.
   */
  @property({ reflect: true })
  appearance: 'solid' | 'transparent' = 'transparent'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-video': HelixVideo
  }
}
