import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessVideoPlaylist } from '@fusion.dev/helix-headless/video-playlist'
import type { CSSResultGroup } from 'lit'
import { styles } from './video-playlist-root.css.js'

/**
 * @summary A list of video clips that play one after another in a single player.
 *
 * @description
 * Styles the layout of the two regions and the scroller that holds the entries.
 * The base class tracks which clip is current.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Playlist, Queue, Up next
 * @documentation https://fusion.dev/helix/components/video-playlist
 *
 * @cssproperty --video-playlist-gap - The space between the player and the list.
 * @cssproperty --video-playlist-items-gap - The space between the entries.
 * @cssproperty --video-playlist-layout - The grid columns for the player and the list.
 * @cssproperty --video-playlist-size - The height the list reaches before it scrolls.
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
