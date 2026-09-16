import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessVideo } from '@fusion.dev/helix-headless/video'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import '../../icon/index.js'
import '../../menu/index.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './video-root.css.js'

/**
 * @summary Plays a video, with controls this library draws rather than the
 * browser's.
 *
 * @description
 * The player is the headless tier's. What this adds is the bar: where it sits, when
 * it is there, and what the two ranges look like, which is the whole reason to
 * replace a control set that cannot be styled.
 *
 * **The bar is over the picture, not under it.** A bar in the layout would move
 * everything below the video by its own height and would leave a strip of page
 * color under a picture that is meant to be the whole of it. Over it, the
 * video is the component's size and the controls belong to it.
 *
 * **It goes when nobody is using it, and comes back for the keyboard.** Hidden
 * once a playing video has gone `idle-delay` without being touched, shown again
 * the moment the pointer moves, and shown whenever anything inside it has
 * focus, which is what keeps it reachable without a pointer. A paused video
 * keeps its bar, because a reader who stopped it is deciding what to do next.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @documentation https://fusion.dev/helix/components/video
 *
 * @cssproperty --video-accent-color - The played part of the scrubber.
 * @cssproperty --video-aspect-ratio - The shape of the box. Defaults to the
 * video's own once known, and `16 / 9` until then.
 * @cssproperty --video-controls-color - The ink on the bar.
 * @cssproperty --video-radius - The corner it is cut to.
 * @cssproperty --video-speed-size - How wide the playback speed control is
 * held, so the row does not move when the number changes.
 * @cssproperty --video-start-size - Width of the mark that starts it.
 * @cssproperty --video-well-color - Behind the picture, and in the letterbox bars.
 */
@customElement('helix-video')
export class HelixVideo extends HelixHeadlessVideo {
  /**
   * How the control bar sits on the picture.
   *
   * `separation` and not `emphasis`: all three states say what the bar sits on,
   * which is where it separates from the picture, rather than how loud it is.
   *
   * Absent is the default and is what a player looks like, and what the
   * platform's own controls do: they float on a gradient that fades up into the
   * picture, dark enough to read them against a bright frame and gone entirely
   * a little higher up. The picture runs edge to edge behind them. It has no
   * name because it is the resting treatment.
   *
   * `filled` gives the controls a bar of their own, which is what a video
   * embedded in a document usually wants, where the player is a component on a
   * page rather than the page itself. It stays put rather than fading, because
   * a bar that is part of the frame would leave a strip of the well behind it.
   *
   * `plain` is neither: the controls sit straight on the picture with nothing
   * behind them. For a consumer who knows their footage, or who is putting
   * their own ground there.
   *
   * A presentation property, so it lives on this tier. The headless element renders
   * the same bar for all three.
   *
   * **Optional rather than defaulted, which is not a style preference.** A
   * reflecting property with a default writes its attribute onto every host the
   * moment the element upgrades, including the ones a consumer rendered and did
   * not touch, and React reads that as a hydration mismatch. The absent
   * attribute *is* the shadow, which the stylesheet reads as the base rule, so
   * only the departure has to be named.
   */
  @property({ reflect: true })
  separation?: 'filled' | 'plain'

  static override tier = 'helix-'

  static override styles: CSSResultGroup = [glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-video': HelixVideo
  }
}
