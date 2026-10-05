import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessVideoPlaylistMenu } from '@fusion.dev/helix-headless/video-playlist'
import type { CSSResultGroup } from 'lit'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './video-playlist-menu.css.js'
import '../../menu/index.js'

/**
 * @summary The playlist's entries, as a menu inside the player's control bar.
 *
 * @description
 * Styles the trigger as a control-bar button like the ones beside it, and opens
 * the menu over the video. The base class holds the link to the playlist, the
 * entries, and what a screen reader announces when you choose one.
 *
 * The trigger repeats the declarations of `Video`'s control rule,
 * `[part="controls"] :where(a, button)`. That rule is inside `Video`'s shadow
 * root, and this element is in its light DOM. A shadow rule reaches a slotted
 * node only through `::slotted()` and never reaches into that node's own shadow
 * root, so the rule cannot style this button. Shared tokens keep the two
 * buttons consistent.
 *
 * Color is inherited from the control bar. To set a different color, use
 * `--video-playlist-menu-color`.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Episode Menu, Queue Menu, Up Next
 * @documentation https://fusion.dev/helix/components/video-playlist
 *
 * @cssproperty --video-playlist-menu-color - The color of the trigger. Defaults to the control bar's color.
 * @cssproperty --video-playlist-menu-poster - The width of an entry's poster image.
 * @cssproperty --video-playlist-menu-size - The size of the trigger's icon.
 */
@customElement('helix-video-playlist-menu')
export class HelixVideoPlaylistMenu extends HelixHeadlessVideoPlaylistMenu {
  /* `glyphStyles` first, and it is not optional. `drawIcon` renders a bare
     `<svg data-glyph>` with no size of its own, and the only rule that sizes
     one lives in the icon family's sheet. Without it the glyph came out 24x24
     inside a 24x24 button, filling it edge to edge beside a 16x16 fullscreen
     icon: right color, right button, right position, and half again too big.
     Nothing failed, because a missing rule is not an error. */
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-video-playlist-menu': HelixVideoPlaylistMenu
  }
}
