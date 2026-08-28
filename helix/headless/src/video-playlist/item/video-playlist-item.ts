import { customElement, HelixElement, HelixSelectEvent } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One entry in a video playlist.
 *
 * @description
 * **It holds what the player needs and nothing about playing.** A source, a
 * poster and a name: the entry knows which file it stands for, and the playlist
 * is what hands that to a player. Nothing here touches a `<video>`, which is
 * what keeps a playlist usable with a player the consumer configured
 * themselves.
 *
 * **A real `<button>`, in a `listitem`.** A playlist is a list of things to
 * choose, and the list roles are the honest ones: `list` and `listitem` say how
 * many there are and where you are in them, which `listbox` would too, at the
 * cost of the pattern a listbox obliges. `Option` records that trap in full,
 * that a listbox has to keep focus elsewhere and say which item is current with
 * `aria-activedescendant`. Nothing here needs that, because focus really moves
 * to the button.
 *
 * `aria-current` rather than `aria-selected`, which belongs to the roles that
 * have a selection. What is true of the entry playing now is that it is the one
 * the player is on.
 *
 * @since 0.1.0
 * @status experimental
 * @category media
 * @documentation https://helix.fusion.dev/components/video-playlist
 *
 * @slot - The entry's name.
 * @slot media - A thumbnail. Falls back to an image of `poster`.
 * @slot meta - After the name. A duration, or a date.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the entry is chosen.
 *
 * @csspart container - The `listitem`, which the button sits in.
 * @csspart item - The row, which is a button.
 * @csspart label - The name and whatever follows it.
 * @csspart media - The leading column.
 * @csspart thumbnail - The image `poster` falls back to.
 */
@customElement('helix-headless-video-playlist-item')
export class HelixHeadlessVideoPlaylistItem extends HelixElement {
  /**
   * What identifies the entry, and what `active` is compared against.
   */
  @property()
  value = ''

  /**
   * The file this entry plays.
   */
  @property()
  src = ''

  /**
   * What covers the picture before this entry plays, and the row's thumbnail.
   *
   * One property doing both, because they are the same picture: the frame that
   * stands for the clip stands for it in the list too. It is the `media` slot's
   * fallback rather than something drawn beside it, which is this library's rule
   * for a content property, so a consumer with something better to show slots it
   * and the two can never both appear.
   */
  @property()
  poster = ''

  /**
   * Whether the entry can be chosen.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether the player is on this entry.
   *
   * Written by the playlist rather than by the entry, the way an option's
   * selection is: an entry that made itself current would be a second answer to
   * which one is playing.
   */
  @property({ attribute: false })
  current = false

  /**
   * The entry's name, which is the words and not everything in it.
   *
   * `textContent` was what this used, and it takes the whole subtree: a row with
   * a duration in `meta` reported "His Girl Friday0:06", and that string went to
   * the player and on to the lock screen. Only the nodes the consumer left
   * unslotted are the name; anything named is a column beside it.
   *
   * Light DOM rather than `assignedNodes`, so it answers on the server too,
   * where there is no slot to ask. `Option.text` reads its own the same way.
   */
  get text(): string {
    return [...this.childNodes]
      .filter((node) => !(node instanceof Element) || !node.hasAttribute('slot'))
      .map((node) => node.textContent ?? '')
      .join('')
      .trim()
  }

  private readonly choose = (): void => {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  /**
   * What stands for the row: a thumbnail where there is one, and nothing where
   * there is not.
   *
   * A seam rather than inline, so a tier can draw a duration badge over it or
   * a placeholder in its place without reimplementing the row. A consumer
   * slots `media` for the same reasons and neither has to know about the other.
   */
  protected renderMedia(): TemplateResult {
    return html`<slot name="media">
      ${
        // `alt=""`, because the row's own words already name it and a
        // thumbnail repeating them is the same thing said twice.
        this.poster === '' ? nothing : html`<img part="thumbnail" alt="" src=${this.poster} />`
      }
    </slot>`
  }

  protected override render(): TemplateResult {
    /* `aria-current="true"`, and absent rather than `"false"` otherwise. A
       reader is told which one is playing; being told about each of the others
       that it is not playing is the same fact eleven times. */
    return html`<div part="container" role="listitem">
      <button
        part="item"
        type="button"
        aria-current=${this.current ? 'true' : nothing}
        ?disabled=${this.disabled}
        @click=${this.choose}
      >
        <span part="media">${this.renderMedia()}</span>
        <span part="label">
          <slot></slot>
          <slot name="meta"></slot>
        </span>
      </button>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-video-playlist-item': HelixHeadlessVideoPlaylistItem
  }
}
