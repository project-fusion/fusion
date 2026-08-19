import { customElement } from '@helix-io/core'
import { HelixBaseVideoPlaylistItem } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './video-playlist-item.css.js'

/**
 * @summary One entry in a video playlist.
 *
 * @description
 * Presentation only: the row, its thumbnail column, and the mark on the one
 * playing. The base class holds what the entry is and what it announces.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @documentation https://helix.fusion.dev/components/video-playlist
 *
 * @cssproperty --video-playlist-item-background-color - Fill behind a row.
 * @cssproperty --video-playlist-media-size - Width of the thumbnail column.
 */
@customElement('helix-video-playlist-item')
export class HelixVideoPlaylistItem extends HelixBaseVideoPlaylistItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-video-playlist-item': HelixVideoPlaylistItem
  }
}
