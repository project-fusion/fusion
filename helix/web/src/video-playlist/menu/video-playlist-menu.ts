import { customElement } from '@helix-io/core'
import { HelixBaseVideoPlaylistMenu } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './video-playlist-menu.css.js'
import '../../icon/index.js'
import '../../menu/index.js'

/**
 * @summary The playlist's entries, as a menu inside the player's control bar.
 *
 * @description
 * Presentation only: a control-bar button drawn like the ones beside it, and a
 * menu that opens over the picture rather than under it. The base class holds
 * where the playlist is, what the entries are, and what choosing announces.
 *
 * The trigger's declarations are `Video`'s control rule written out a second
 * time, which is not duplication that could be avoided. That rule is
 * `[part="controls"] :where(a, button)` inside `Video`'s shadow root, and this
 * element sits in its light DOM: a shadow rule reaches an assigned node only
 * through `::slotted()` and never reaches into the node's own shadow root at
 * all. So the button here is two boundaries away from the rule that styles
 * every button beside it, and the same tokens are what make the two agree.
 *
 * Colour is inherited rather than named, so the bar's own colour arrives on
 * its own. `--video-playlist-menu-color` is there for the case where it should
 * not.
 *
 * @since 0.1.0
 * @status experimental
 * @category media
 * @aliases Episode Menu, Queue Menu, Up Next
 * @documentation https://helix.fusion.dev/components/video-playlist
 *
 * @cssproperty --video-playlist-menu-color - Colour of the trigger, defaulting to the control bar's.
 * @cssproperty --video-playlist-menu-size - Size of the trigger's glyph.
 */
@customElement('helix-video-playlist-menu')
export class HelixVideoPlaylistMenu extends HelixBaseVideoPlaylistMenu {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-video-playlist-menu': HelixVideoPlaylistMenu
  }
}
