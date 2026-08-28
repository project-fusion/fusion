import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessVideoPlaylistItem } from '@fusion.dev/helix-headless/video-playlist'
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
 * @category media
 * @documentation https://helix.fusion.dev/components/video-playlist
 *
 * @cssproperty --video-playlist-item-background-color - Fill behind a row.
 * @cssproperty --video-playlist-media-size - Width of the thumbnail column.
 */
@customElement('helix-video-playlist-item')
export class HelixVideoPlaylistItem extends HelixHeadlessVideoPlaylistItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-video-playlist-item': HelixVideoPlaylistItem
  }
}
