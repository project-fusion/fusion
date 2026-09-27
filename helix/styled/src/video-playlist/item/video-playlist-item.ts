import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessVideoPlaylistItem } from '@fusion.dev/helix-headless/video-playlist'
import type { CSSResultGroup } from 'lit'
import { styles } from './video-playlist-item.css.js'

/**
 * @summary One entry in a video playlist.
 *
 * @description
 * Styles the row, its thumbnail column, and the marker on the playing entry.
 * The base class holds the entry's data and its accessibility semantics.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @documentation https://fusion.dev/helix/components/video-playlist
 *
 * @cssproperty --video-playlist-item-background-color - The fill behind a row.
 * @cssproperty --video-playlist-media-size - The width of the thumbnail column.
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
