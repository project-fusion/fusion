import {
  customElement,
  HelixElement,
  HelixEndEvent,
  MixinControllerActive,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessVideoPlaylistItem } from '../item/video-playlist-item.js'
import { playOrder, type Repeat, stepTo } from '../order.js'

/**
 * What the playlist asks of the player it drives, whichever tag it is.
 *
 * `play` may answer with a promise, as a media element's does, and the playlist
 * waits on nothing it returns: a refused play leaves the player paused on the
 * chosen entry, which is the correct thing to be looking at.
 */
type Player = HTMLElement & {
  currentTime?: number
  label: string
  play: () => Promise<void> | void
  poster: string
  src: string
  updateComplete?: Promise<unknown>
}

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
 * the user already pressed play once. `repeat` decides what happens at the
 * end: `one` plays the same entry again, and `all` goes from the last entry
 * back to the first. Without it, the playlist stops on the last entry and
 * sends `helix-end`. `shuffle` plays the entries in a random order, starting
 * from the one that is current, and `previous` retraces that order.
 *
 * **Keyboard.** Each entry is a button in the tab order, and Enter or Space
 * plays it. The current entry carries `aria-current`. While focus is on the
 * player, the player's own keys work, and `Video` lists them. Its previous
 * and next controls move through the entries in the same order the playlist
 * does.
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
 * @event {HelixActivateEvent} helix-activate - The current entry changed. The playlist already holds the new entry when this is sent, and `detail.previous` is the entry it left.
 * @event {HelixBeforeActivateEvent} helix-before-activate - The current entry is about to change. Cancelable: cancel it to keep the current entry.
 * @event {HelixEndEvent} helix-end - The last entry finished playing, and the playlist stopped there. Not sent while `repeat` is set.
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
   * What happens when an entry ends with no next one to go to. `one` plays the
   * same entry again, and `all` goes from the last entry back to the first.
   * Absent, the playlist stops on the last entry and sends `helix-end`.
   *
   * `all` also lets the next and previous controls go round, so next on the
   * last entry is the first. `one` changes only what an ending does: next and
   * previous still move, being a reader asking for another entry.
   */
  @property()
  repeat?: Repeat

  /**
   * Whether the entries play in a random order. The order starts from the
   * entry that is current, and holds until shuffle is turned off or an entry
   * arrives or leaves, so previous goes back through what has played.
   */
  @property({ type: Boolean })
  shuffle = false

  /**
   * The shuffled order of the entries' values, while `shuffle` is on.
   *
   * Held rather than drawn on each step, so previous retraces the way next
   * came. Dropped when shuffle turns off, so turning it on again deals a new
   * order from wherever the reader is.
   */
  private dealt: string[] | undefined

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
  private get player(): Player | null {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="player"]')
    return (slot?.assignedElements()[0] as Player | undefined) ?? null
  }

  /**
   * The entry a step of `by` lands on, in the order the playlist plays in, or
   * `undefined` past an end. Disabled entries are not in the order, so a step
   * passes over them.
   */
  private following(by: number): { current: string | undefined; next: string | undefined } {
    const items = this.items.filter((one) => !one.disabled)
    const values = items.map((one) => one.value)
    const current = this.resolveActive(items)?.value
    this.dealt = this.shuffle ? playOrder(values, true, this.dealt, current) : undefined
    const order = this.dealt ?? values
    return { current, next: stepTo(order, current, by, this.repeat === 'all') }
  }

  /**
   * Moves by one in the playing order and plays what it lands on. At an end it
   * stays, unless `repeat` is `all`.
   *
   * A move a consumer refuses with `helix-before-activate` plays nothing, and
   * leaves nothing behind to play on a later change.
   */
  private step(by: number): void {
    const { current, next } = this.following(by)
    if (next === undefined) {
      return
    }
    if (next === current) {
      this.replay()
      return
    }
    this.chased = true
    if (!this.requestActive(next)) {
      this.chased = false
    }
  }

  /**
   * Plays the current entry again from its start, which is what an ending
   * under `repeat="one"` asks for, and a list of one under `repeat="all"`.
   */
  private replay(): void {
    const player = this.player
    if (!player) {
      return
    }
    player.currentTime = 0
    void Promise.resolve(player.play()).catch(() => {})
  }

  /**
   * Moves to the next entry and plays it, as the player's next control does.
   * Follows `shuffle`, goes round under `repeat="all"`, and stays on the last
   * entry otherwise.
   */
  next(): void {
    this.step(1)
  }

  /**
   * Moves to the previous entry and plays it, as the player's previous control
   * does. Under `shuffle` it goes back through the order that played.
   */
  previous(): void {
    this.step(-1)
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
    this.next()
  }

  private readonly handlePrevious = (): void => {
    this.previous()
  }

  /**
   * An entry ended: the same one again under `repeat="one"`, the next one in
   * the order, or, past the last, `helix-end`.
   *
   * **A notification with no class of its own**, sent as a plain event and
   * carrying nothing: the playlist is still on the last entry, and `active`
   * says which. Not sent under `repeat`, where a list never runs out.
   */
  private readonly handleEnded = (event: Event): void => {
    /* Only the player's own end: media somewhere inside it may end too. */
    if (event.target !== this.player) {
      return
    }
    if (this.repeat === 'one') {
      this.replay()
      return
    }
    if (this.following(1).next === undefined) {
      this.dispatchEvent(new HelixEndEvent())
      return
    }
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

  /** A shuffle turned off forgets its order, so the next one is new. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (changed.has('shuffle') && !this.shuffle) {
      this.dealt = undefined
    }
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
        void player.updateComplete?.then(() => player.play()).catch(() => {})
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
