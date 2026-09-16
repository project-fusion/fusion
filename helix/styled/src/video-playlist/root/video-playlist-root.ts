import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessVideoPlaylist } from '@fusion.dev/helix-headless/video-playlist'
import type { CSSResultGroup } from 'lit'
import { styles } from './video-playlist-root.css.js'

/**
 * @summary A set of clips and the one player they take turns in.
 *
 * @description
 * Presentation only: the arrangement of the two regions and the scroller the
 * entries sit in. Everything about which clip is current is the base class.
 *
 * @since 0.1.0
 * @status experimental
 * @category media
 * @aliases Playlist, Queue, Up next
 * @documentation https://fusion.dev/helix/components/video-playlist
 *
 * @cssproperty --video-playlist-layout - Columns for the player and the list.
 * @cssproperty --video-playlist-size - How tall the list gets before it scrolls.
 */
@customElement('helix-video-playlist')
export class HelixVideoPlaylist extends HelixHeadlessVideoPlaylist {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-video-playlist': HelixVideoPlaylist
  }
}
