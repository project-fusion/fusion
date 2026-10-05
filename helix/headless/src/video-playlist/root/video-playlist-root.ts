import { customElement, HelixElement, MixinControllerActive } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessVideoPlaylistItem } from '../item/video-playlist-item.js'

/**
 * @summary A list of video clips that play one after another in a single player.
 *
 * @description
 * **You slot the player**, so it keeps your appearance, extra controls,
 * captions, and poster treatment. `Sandbox` takes its preview and `Menu` its
 * trigger the same way.
 *
 * **Entries are markup.** React skips properties it would set imperatively
 * during hydration, so an array property on a custom element is missing on the
 * first paint of a server-rendered page. `using-the-elements.mdx` has the
 * measurement. Markup also makes each entry a real button with its name inside.
 *
 * **The playlist does not play media.** It sets `src` on the player and tracks
 * which entry is current. The current entry moves when:
 *
 * - an entry is pressed,
 * - the player dispatches `helix-next` or `helix-previous`, or
 * - the player reaches the end.
 *
 * On `ended` the playlist advances and the next clip starts playing, because
 * the user already pressed play once.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Playlist, Queue, Up next
 * @documentation https://fusion.dev/helix/components/video-playlist
 *
 * @slot - The entries.
 * @slot player - The player that plays the entries.
 *
 * @event {HelixActivateEvent} helix-activate - The current entry changed. The playlist already holds the new entry when this is sent.
 * @event {HelixBeforeActivateEvent} helix-before-activate - The current entry is about to change. Cancelable: cancel it to keep the current entry.
 *
 * @csspart items - The list of entries.
 * @csspart player - The region that holds the player.
 */
@customElement('helix-headless-video-playlist')
export class HelixHeadlessVideoPlaylist extends MixinControllerActive(HelixElement) {
  /**
   * The list's name, read by screen readers.
   */
  @property()
  label = 'Playlist'

  /**
   * The entries, in the order the consumer wrote them.
   *
   * **Found by tag and filtered on the property, never on `[value]`.** React
   * assigns a matching property rather than an attribute, so a playlist written
   * in JSX carries no `value` attribute anywhere and `querySelectorAll('[value]')`
   * returns nothing: every entry vanishes from the list, the active one
   * included, and nothing throws, an empty playlist being a legal playlist.
   *
   * Reading `one.value` answers the same question the same way whether the
   * consumer wrote markup or set a property, which is the only form that works
   * for both.
   */
  private get items(): HelixHeadlessVideoPlaylistItem[] {
    /* By identity rather than by tag, the reason Splitter writes out at
       `findOuter`: a tag list names one tier's element from the other's
       package, and misses any third tag, which is what subclassing an entry
       produces. The entry then vanishes from the playlist with nothing
       reported. */
    return [...this.querySelectorAll('*')].filter(
      (one): one is HelixHeadlessVideoPlaylistItem =>
        one instanceof HelixHeadlessVideoPlaylistItem && one.value !== '',
    )
  }

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

  /**
   * The player, whichever tag the consumer slotted.
   *
   * Asked of the slot rather than matched by tag name: each tier registers its
   * own player under its own name, and a consumer bringing a third should still
   * be driven. What is needed of it is `src`, which is the whole of the
   * contract.
   */
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

       `stopImmediatePropagation`, not `stopPropagation`. The consumer's listener
       is on this same element, and stopping propagation only keeps an event off
       the *next* node: every listener already bound here still runs, so the
       entry's selection reaches them anyway. Command carries the longer note. */
    event.stopImmediatePropagation()
    /* **And only if the choice stood.** `helix-select` is cancelable and both
       the entry and the menu document it as refusable, the menu saying in its
       own words that stopping the item's event and re-announcing it from the
       host is what makes `preventDefault()` refuse the selection in one place.
       Nothing read the flag, so refusing it did nothing at all: the same shape
       `Menu` and `SpeedDial` each record having fixed, a documented veto with
       no reader.

       Read here and not a microtask later, which is the difference from those
       two. Theirs run in capture, ahead of a consumer's listener on the same
       host; this one is a bubble listener and the event comes from a
       descendant, so every listener on the entry or the menu has already run by
       the time it arrives. A consumer on this element cannot refuse, which is
       the line above rather than this one, and their veto is
       `helix-before-activate`. */
    if (event.defaultPrevented) {
      return
    }
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

  private readonly handleEnded = (event: Event): void => {
    /* Only the player's own end: media somewhere inside it may end too. */
    if (event.target !== this.player) {
      return
    }
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
       has no reference to.

       **In the capture phase.** The player relays `ended` as the platform sends
       it, without bubbling, so a listener here in the bubble phase never heard
       it and the playlist stopped at the end of the first clip. Capture reaches
       every ancestor whether the event bubbles or not. */
    this.addEventListener('ended', this.handleEnded, true)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelect)
    this.removeEventListener('helix-next', this.handleNext)
    this.removeEventListener('helix-previous', this.handlePrevious)
    this.removeEventListener('ended', this.handleEnded, true)
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
    'helix-headless-video-playlist': HelixHeadlessVideoPlaylist
  }
}
