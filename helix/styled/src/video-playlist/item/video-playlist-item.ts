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
 * @cssproperty --video-playlist-item-color - The color of an entry's name.
 * @cssproperty --video-playlist-item-current-background-color - The fill behind the entry that is playing.
 * @cssproperty --video-playlist-item-current-mark-color - The color of the bar beside the entry that is playing.
 * @cssproperty --video-playlist-item-gap - The space between the thumbnail and the name.
 * @cssproperty --video-playlist-item-hover-background-color - The fill behind a row under the pointer.
 * @cssproperty --video-playlist-item-meta-color - The color of the content in the `meta` slot.
 * @cssproperty --video-playlist-item-padding-block - The space above and below a row's content.
 * @cssproperty --video-playlist-item-padding-inline-end - The space after a row's content.
 * @cssproperty --video-playlist-item-padding-inline-start - The space before a row's content, where the bar beside the playing entry sits.
 * @cssproperty --video-playlist-item-radius - The corner radius of a row.
 * @cssproperty --video-playlist-media-aspect-ratio - The shape of the thumbnail column.
 * @cssproperty --video-playlist-media-radius - The corner radius of the thumbnail.
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
