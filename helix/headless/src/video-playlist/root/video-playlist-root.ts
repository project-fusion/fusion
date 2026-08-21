import { customElement, HelixElement, MixinControllerActive } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { HelixBaseVideoPlaylistItem } from '../item/video-playlist-item.js'

/**
 * @summary A set of clips and the one player they take turns in.
 *
 * @description
 * **The player is slotted, never rendered here.** A consumer's player carries
 * their appearance, their extra controls, their captions and their poster
 * treatment, and a playlist that rendered its own would either lose all of that
 * or grow a property for each of them. `Sandbox` takes its preview and `Menu`
 * its trigger the same way.
 *
 * **The entries are markup rather than an array property.** A list of objects
 * would be the shorter API and it does not survive the trip: React skips every
 * property it would have to apply imperatively while hydrating, so an array
 * handed to a custom element is missing on the first paint of every
 * server-rendered page. `using-the-elements.mdx` carries the measurement. Markup
 * is also what makes each entry a real button with a real name in it.
 *
 * **Nothing here plays anything.** It sets `src` on the player and lets the
 * player be a player. What the playlist owns is which entry is current, and it
 * moves that on three signals: an entry pressed, `helix-next` or
 * `helix-previous` from the player, and the player reaching the end.
 *
 * `ended` advances without asking, because a set of clips that stopped between
 * each one is a set the reader has to nurse. The clip that follows starts where
 * the last one left off, which is `autoplay` in the only sense that matters
 * here: the reader already pressed play once.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Playlist, Queue, Up next
 * @documentation https://helix.fusion.dev/components/video-playlist
 *
 * @slot - The entries.
 * @slot player - The `helix-video` they play in.
 *
 * @csspart player - The region holding the player.
 * @csspart items - The list of entries.
 *
 * @event {HelixChangeEvent} helix-change - Fired before the current entry changes, and cancelable.
 */
@customElement('helix-base-video-playlist')
export class HelixBaseVideoPlaylist extends MixinControllerActive(HelixElement) {
  /** Accessible name for the list, which usually has no visible heading. */
  @property()
  label = 'Playlist'

  /** The entries, in the order the consumer wrote them. */
  private get items(): HelixBaseVideoPlaylistItem[] {
    return [...this.querySelectorAll<HelixBaseVideoPlaylistItem>('[value]')].filter((one) =>
      one.matches('helix-video-playlist-item, helix-base-video-playlist-item'),
    )
  }

  /*
   * The player, whichever tag the consumer slotted.
   *
   * Asked of the slot rather than matched by tag name: the headless tier's
   * player is `helix-base-video` and the styled tier's is `helix-video`, and a
   * consumer bringing a third under either name should still be driven. What is
   * needed of it is `src`, which is the whole of the contract.
   */
  /**
   * Whether the entry changed because somebody moved through the playlist.
   *
   * All three ways it moves are the reader going somewhere: pressing an entry,
   * pressing next or previous, or a clip ending and the next one following it.
   * Every one of those means play, and the one case that does not is the first
   * render, where the playlist is simply pointing the player at its opening
   * entry and nobody has asked for anything yet.
   *
   * A press is also what makes the play legal. Autoplay is refused when nothing
   * the reader did asked for it, so starting here works because this is inside
   * the gesture that chose the entry, and where it is refused anyway the player
   * shows its start control and waits.
   */
  private chased = false

  private get player():
    | (HTMLElement & {
        label: string
        play: () => void
        poster: string
        src: string
        updateComplete?: Promise<unknown>
      })
    | null {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="player"]')
    const first = slot?.assignedElements()[0]
    return (
      (first as
        | (HTMLElement & {
            label: string
            play: () => void
            poster: string
            src: string
            updateComplete?: Promise<unknown>
          })
        | undefined) ?? null
    )
  }

  /** Moves by one, and does nothing at either end. */
  private step(by: number): void {
    const items = this.items.filter((one) => !one.disabled)
    const at = items.findIndex((one) => one.value === this.resolveActive(items)?.value)
    const next = items[at + by]
    if (next) {
      this.requestActive(next.value)
    }
  }

  private readonly handleSelect = (event: Event): void => {
    /* Stopped and not relayed. The entry says it was chosen, this element says
       what is playing, and a consumer hearing both would hear one press twice
       under two names.
     *
     * `stopImmediatePropagation`, not `stopPropagation`. The consumer's listener
     * is on this same element, and stopping propagation only keeps an event off
     * the *next* node: every listener already bound here still runs, so the
     * entry's selection reached them anyway. Command carries the longer note,
     * and the spec below is what caught this one. */
    event.stopImmediatePropagation()
    this.chased = true
    this.requestActive((event as CustomEvent<{ value: string }>).detail.value)
  }

  private readonly handleNext = (): void => {
    this.chased = true
    this.step(1)
  }

  private readonly handlePrevious = (): void => {
    this.chased = true
    this.step(-1)
  }

  private readonly handleEnded = (): void => {
    this.chased = true
    this.step(1)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelect)
    this.addEventListener('helix-next', this.handleNext)
    this.addEventListener('helix-previous', this.handlePrevious)
    /* `ended` is a media event and does not compose out of the player's shadow
       root on its own. The player relays it, which is why listening here works
       at all, and why this listens on the element rather than on a `<video>` it
       has no reference to. */
    this.addEventListener('ended', this.handleEnded)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelect)
    this.removeEventListener('helix-next', this.handleNext)
    this.removeEventListener('helix-previous', this.handlePrevious)
    this.removeEventListener('ended', this.handleEnded)
  }

  /**
   * Points the player at the current entry, and tells the entries which is on.
   *
   * In `updated` rather than in the handlers, so the three signals that move the
   * current entry all arrive at one place that applies it. The server never runs
   * this, which is correct: the entries are light DOM it cannot see, and what it
   * renders is the player with whatever `src` the consumer wrote.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    const items = this.items
    const current = this.resolveActive(items)
    for (const item of items) {
      item.current = item === current
    }
    const player = this.player
    if (!player || !current) {
      return
    }
    /* Only on a change. Writing `src` with the value it already holds reloads
       the resource in every engine, so a playlist that assigned on each update
       would restart the clip whenever anything else about it rendered. */
    if (player.src !== current.src) {
      player.src = current.src
      player.poster = current.poster
      player.label = current.text
      if (this.chased) {
        /* After the player has rendered, not now. `src` here is the element's
           property, and the `<video>` inside it only takes the new source on
           its next render: playing at this point plays the outgoing clip for an
           instant and the load that follows stops it again. Measured, and the
           reading was a player left paused on the entry that had just been
           chosen.

           A microtask later is still inside the press that got us here, so the
           platform still counts it as asked for. */
        void player.updateComplete?.then(() => {
          player.play()
        })
      }
    }
    this.chased = false
  }

  protected override render(): TemplateResult {
    return html`<div part="player"><slot name="player"></slot></div>
      <div part="items" role="list" aria-label=${this.label}>
        <slot></slot>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-video-playlist': HelixBaseVideoPlaylist
  }
}
