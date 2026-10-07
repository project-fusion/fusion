import {
  customElement,
  drawStatus,
  formatWords,
  HelixElement,
  HelixEndEvent,
  inlineStep,
  MixinControllerActive,
  StatusController,
  words,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
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
  paused?: boolean
  label: string
  mediaTitle?: string
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
 * the user already pressed play once. `no-advance` turns that off, and the
 * playlist stays on the entry that ended. `repeat` decides what happens at the
 * end: `one` plays the same entry again, and `all` goes from the last entry
 * back to the first. Without it, the playlist stops on the last entry and
 * sends `helix-end`. `shuffle` plays the entries in a random order, starting
 * from the one that is current, and `previous` retraces that order.
 *
 * **`helix-before-activate` says why the playlist is moving**, in
 * `detail.cause`: `press` for an entry or a menu choice, `next` and
 * `previous` for the player's controls and the methods, `ended` at the end of
 * a clip, and `removed` when the current entry leaves the playlist. Cancel an
 * `ended` move to show your own "Up next" countdown, then call `next()`.
 *
 * **Removing the current entry moves the playlist on**, to the entry after it,
 * or to the one before it when it was the last. A clip that was playing keeps
 * playing in the entry that takes its place.
 *
 * **The player is named by the current entry**, and the device's own media
 * controls show the entry as the title. A player you gave a `label` keeps
 * your name, and only the title follows the entry.
 *
 * **Keyboard.** The entries take one stop in the tab order: the entry you
 * last focused, or the current entry before you have focused one. Enter or
 * Space plays it. The arrow keys move focus to the entry before or after, and
 * Home and End to the first and the last, passing over disabled entries. The
 * current entry carries `aria-current`. While focus is on the player, the
 * player's own keys work, and `Video` lists them, and Shift with N or P plays
 * the next or the previous entry. The player's previous and next controls
 * move through the entries in the same order the playlist does.
 *
 * **What a screen reader hears.** A list named by `label`, with a button for
 * each entry. When the playlist moves to another entry, by a press, by the
 * player's controls, or at the end of a clip, a live region says
 * `playing-label`, "Now playing" and the entry's name.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Playlist, Queue, Up next
 * @documentation https://fusion.dev/helix/components/video-playlist
 *
 * @slot - The entries.
 * @slot empty - Shown while the playlist has no entries. Defaults to `empty-label`.
 * @slot player - The player that plays the entries.
 *
 * @event {HelixActivateEvent} helix-activate - The current entry changed. The playlist already holds the new entry when this is sent, and `detail.previous` is the entry it left. `currentEntry` is the entry itself, with its `src`, `poster` and name.
 * @event {HelixBeforeActivateEvent} helix-before-activate - The current entry is about to change, and `detail.cause` says why: `press`, `next`, `previous`, `ended`, or `removed`. Cancelable: cancel it to keep the current entry.
 * @event {HelixEndEvent} helix-end - The last entry finished playing, and the playlist stopped there. Not sent while `repeat` is set.
 *
 * @csspart empty - The box that holds the `empty` slot, drawn while there are no entries.
 * @csspart items - The list of entries.
 * @csspart live - A live region that says which entry plays after the playlist moves.
 * @csspart player - The region that holds the player.
 *
 * @cssstate ended - The last entry finished and the playlist stopped there, until an entry plays again.
 */
@customElement('helix-headless-video-playlist')
export class HelixHeadlessVideoPlaylist extends MixinControllerActive(HelixElement) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-video-playlist': { label: 'Wiedergabeliste' } })`.
   */
  static words = 'helix-video-playlist'

  /**
   * What the playlist says while it has no entries. The `empty` slot replaces it.
   */
  @words
  @property({ attribute: 'empty-label' })
  emptyLabel = 'No videos'

  /**
   * The list's name, read by screen readers.
   */
  @words
  @property()
  label = 'Playlist'

  /**
   * Stays on an entry when its clip ends, where the playlist would otherwise
   * play the next one. The player's controls, a press, and `next()` still
   * move. `repeat="one"` still plays the entry again.
   */
  @property({ attribute: 'no-advance', type: Boolean })
  noAdvance = false

  /**
   * What the live region says when the playlist moves to another entry.
   * `{title}` is the entry's name.
   *
   * **A move a reader did not make is said.** At the end of a clip the
   * playlist starts the next one, and the only other trace of that is the
   * `aria-current` on a button the reader is not on.
   */
  @words
  @property({ attribute: 'playing-label' })
  playingLabel = 'Now playing {title}'

  /** The live region, rendered from the first move. */
  private readonly status = new StatusController(this)

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
   * The entries' values in the order of the last update, and the one that was
   * current then. Read when entries leave, to find the neighbor of a current
   * entry that has gone.
   */
  private known: { current: string | undefined; values: string[] } = {
    current: undefined,
    values: [],
  }

  /**
   * The entry that holds the list's tab stop: the one a reader last focused.
   * Before they focus one, the current entry holds it.
   */
  private stop: string | undefined

  /** Hears entries arrive and leave, which change no property here. */
  private watcher: MutationObserver | undefined

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
  private step(by: number, cause: 'ended' | 'next' | 'previous'): void {
    const { current, next } = this.following(by)
    if (next === undefined) {
      return
    }
    if (next === current) {
      this.replay()
      return
    }
    this.chased = true
    if (!this.requestActive(next, cause)) {
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
   * The entry that is current, with the `src`, `poster`, `value` and name the
   * player was given, or `undefined` in an empty playlist.
   *
   * Read it in a `helix-activate` listener for the clip the playlist moved to,
   * which Web Awesome's change event carries: the event says which entry by
   * value, and this is the entry.
   */
  get currentEntry(): HelixHeadlessVideoPlaylistItem | undefined {
    return this.resolveActive(this.items)
  }

  /**
   * Moves to the next entry and plays it, as the player's next control does.
   * Follows `shuffle`, goes round under `repeat="all"`, and stays on the last
   * entry otherwise.
   */
  next(): void {
    this.step(1, 'next')
  }

  /**
   * Moves to the previous entry and plays it, as the player's previous control
   * does. Under `shuffle` it goes back through the order that played.
   */
  previous(): void {
    this.step(-1, 'previous')
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
    this.requestActive((event as CustomEvent<{ value: string }>).detail.value, 'press')
  }

  /** An entry that takes focus takes the tab stop with it. */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    const entry = event.target
    if (entry instanceof HelixHeadlessVideoPlaylistItem && this.items.includes(entry)) {
      this.stop = entry.value
      this.placeStop(this.items)
    }
  }

  /**
   * Entries arrived or left. Where the current entry left, the playlist moves
   * to the entry after it, or to the one before it when it was the last, and
   * keeps playing where it was playing.
   */
  private readonly handleEntries = (): void => {
    const { current, values } = this.known
    const items = this.items
    const present = new Set(items.filter((one) => !one.disabled).map((one) => one.value))
    if (current !== undefined && !items.some((one) => one.value === current)) {
      const at = values.indexOf(current)
      const next =
        values.slice(at + 1).find((value) => present.has(value)) ??
        values
          .slice(0, at)
          .reverse()
          .find((value) => present.has(value))
      if (next !== undefined) {
        this.chased = this.player?.paused === false
        if (!this.requestActive(next, 'removed')) {
          this.chased = false
        }
      }
    }
    this.requestUpdate()
  }

  /**
   * Gives one entry the tab stop and takes it from the rest: the entry last
   * focused, then the current entry, then the first that can be chosen.
   */
  private placeStop(items: HelixHeadlessVideoPlaylistItem[]): void {
    const enabled = items.filter((one) => !one.disabled)
    const holder =
      enabled.find((one) => one.value === this.stop) ??
      enabled.find((one) => one.current) ??
      enabled[0]
    for (const item of items) {
      item.focusable = item === holder
    }
  }

  /**
   * The arrow keys, Home and End on an entry move focus to another one.
   *
   * **The entries the keys reach are the enabled ones**, because a disabled
   * button cannot take focus and a key that landed on one would leave focus
   * where it was. Up and Left go back, Down and Right go on, and Left and
   * Right swap on a right-to-left page, so a list laid out in a row moves the
   * way it reads.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const from = event.target
    if (this.takePlayerKey(event)) {
      return
    }
    if (
      !(from instanceof HelixHeadlessVideoPlaylistItem) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return
    }
    const reachable = this.items.filter((one) => !one.disabled)
    const at = reachable.indexOf(from)
    const step =
      event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : inlineStep(this, event.key)
    const to =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? reachable.length - 1
          : step !== 0 && at !== -1
            ? Math.min(Math.max(at + step, 0), reachable.length - 1)
            : undefined
    if (to === undefined) {
      return
    }
    event.preventDefault()
    reachable[to]?.focus()
  }

  /** The player playing again, after the end or anywhere, means the list has not ended. */
  private readonly handlePlay = (event: Event): void => {
    if (event.target === this.player) {
      this.toggleState('ended', false)
    }
  }

  /**
   * Shift with N plays the next entry and Shift with P the previous one, while
   * focus is on the player, the keys a reader knows from the common players.
   * Not inside a field the player holds, where they are letters.
   */
  private takePlayerKey(event: KeyboardEvent): boolean {
    const player = this.player
    if (
      !player ||
      event.target !== player ||
      event.defaultPrevented ||
      !event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.key !== 'N' && event.key !== 'P')
    ) {
      return false
    }
    const origin = event.composedPath()[0] as HTMLElement | undefined
    if (origin?.tagName === 'INPUT' || origin?.isContentEditable) {
      return false
    }
    event.preventDefault()
    this.step(event.key === 'N' ? 1 : -1, event.key === 'N' ? 'next' : 'previous')
    return true
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
      this.toggleState('ended', true)
      this.dispatchEvent(new HelixEndEvent())
      return
    }
    if (!this.noAdvance) {
      this.step(1, 'ended')
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('helix-select', this.handleSelect)
    this.addEventListener('keydown', this.handleKeydown)
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
    this.addEventListener('play', this.handlePlay, true)
    if (typeof MutationObserver !== 'undefined') {
      this.watcher ??= new MutationObserver(this.handleEntries)
      this.watcher.observe(this, { childList: true, subtree: true })
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.watcher?.disconnect()
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('helix-select', this.handleSelect)
    this.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('helix-next', this.handleNext)
    this.removeEventListener('helix-previous', this.handlePrevious)
    this.removeEventListener('ended', this.handleEnded, true)
    this.removeEventListener('play', this.handlePlay, true)
  }

  /** Asks for the render after a hydration, which can see the entries. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
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
    this.known = { current: current?.value, values: items.map((one) => one.value) }
    this.placeStop(items)
    const player = this.player
    if (!player || !current) {
      return
    }
    /* Only on a change. Writing `src` with the value it already holds reloads
       the resource in every engine, so a playlist that assigned on each update
       would restart the clip whenever anything else about it rendered. */
    if (player.src !== current.src) {
      this.toggleState('ended', false)
      player.src = current.src
      player.poster = current.poster
      player.mediaTitle = current.text
      /* The consumer's own name for the player stands. Only a player named by
         nobody takes the entry's words as its name. */
      if (!player.hasAttribute('label')) {
        player.label = current.text
      }
      if (this.chased) {
        this.status.say(formatWords(this, 'playingLabel', { title: current.text }))
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
    /* Only where the entries can be known: a server and a hydrating render
       cannot see them, and an empty state drawn because nobody has looked yet
       is the one an empty state must never be. */
    const empty = this.childrenKnown && this.items.length === 0
    return html`<div part="player"><slot name="player"></slot></div>
      <div part="items" role="list" aria-label=${this.label}>
        <slot></slot>
      </div>
      ${empty ? html`<div part="empty"><slot name="empty">${this.emptyLabel}</slot></div>` : nothing}
      ${drawStatus(this.status)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-video-playlist': HelixHeadlessVideoPlaylist
  }
}
