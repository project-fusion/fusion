import {
  customElement,
  HelixBeforePinEvent,
  HelixElement,
  HelixHistoryEvent,
  hostAria,
  MixinCollection,
  type Rendered,
  requestChange,
  VirtualizeController,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { keyed } from 'lit/directives/keyed.js'
import { repeat } from 'lit/directives/repeat.js'
/* `static-html`'s `html`, because a turn fed as data is drawn with the tier's
   own message tag, and an interpolated tag is a static value. */
import { html } from 'lit/static-html.js'
import { FAILED_LABEL, type HelixHeadlessChatMessage } from '../message/chat-message.js'

/**
 * The regions a consumer fills, in the order they are rendered.
 *
 * Named once because two things read the list: the manual assignment that puts
 * a child in the region its `slot` names, and the emptiness each region is
 * hidden on. Written out twice they go out of step.
 */
const REGIONS = ['header', 'actions', 'resume', 'status', 'composer'] as const

/** One turn handed over as data, which is what `turns` holds. */
export interface ChatTurn {
  /** When it was said, as anything `Date` parses. */
  at?: string
  /** Who said it: `me`, `them`, or a name the consumer styles. */
  author?: string
  /**
   * What identifies it across changes to the set.
   *
   * Without one a turn is known by the object it is, which holds while the
   * consumer keeps its objects and fails the moment it maps a fresh set from a
   * response: history then loads under the reader rather than above them.
   */
  key?: string
  /** What has happened to it, as on `helix-chat-message`. */
  state?: 'failed' | 'sending' | 'sent' | 'streaming'
  /** What was said, as text. */
  text: string
}

/**
 * What a fed turn's parts are called a second time, while the turn is one a
 * stylesheet draws apart: `<part>-<state>`, as a state drawn on a part is, for
 * each part the styled tier draws differently from inside the message.
 *
 * **Only `me` has a name.** `author` is free text, so the plain names are
 * everyone else's.
 *
 * **Literal `inner: outer` lists**, because `helix component` reads them here
 * to hold each name to its prefix and its `@csspart`, and a name put together
 * from pieces is one no rule can read.
 */
const SECOND_NAMES = {
  author: {
    me: 'avatar: message-avatar-mine, body: message-body-mine, content: message-content-mine, message: message-mine, meta: message-meta-mine',
  },
  state: {
    failed: 'meta: message-meta-failed',
    sending: 'content: message-content-sending',
    streaming: 'content: message-content-streaming',
  },
} as const

/**
 * The names `key` adds from `table`, as the tail of an `exportparts` list.
 *
 * Own keys only: `author` is free text, and a turn by `constructor` would
 * otherwise forward the source of a function.
 */
const secondNames = (table: Readonly<Record<string, string>>, key: string | undefined): string =>
  key !== undefined && Object.hasOwn(table, key) ? `, ${table[key]}` : ''

/** A turn as the announcer reads it, whichever way it was handed over. */
interface Heard {
  author: string | undefined
  failed: string
  id: unknown
  state: string | undefined
  text: string
}

/** Whether a turn has finished arriving, which is when it is worth saying. */
const settled = (turn: Heard): boolean => turn.state !== 'sending' && turn.state !== 'streaming'

/**
 * Whether a turn is news to the reader.
 *
 * Their own words are not, since they have just written them, unless those
 * words did not send: a failure is the one thing about their own turn a reader
 * has to be told.
 */
const newsworthy = (turn: Heard): boolean => turn.author !== 'me' || turn.state === 'failed'

/** What a turn says, without the controls and sources slotted beside it. */
const spoken = (message: Element): string =>
  [...message.childNodes]
    .filter((node) => !(node.nodeType === 1 && (node as Element).hasAttribute('slot')))
    .map((node) => node.textContent ?? '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * @summary A conversation: the turns, and where the reader is in them.
 *
 * @description
 * **It has no opinion about where it sits.** A chat is asked for as a floating
 * button, a page, a palette, a sidebar, a modal and an inline block, and none
 * of those is a variant of a conversation: they are containers, and the
 * containers already exist. Nothing here is positioned, nothing has a backdrop,
 * and nothing owns a trigger. If a form factor needs a mode on this element,
 * the split is wrong.
 *
 * **Scroll ownership is the behavior everything else depends on.** A transcript
 * that grows wants to stay at the bottom, except when the reader has scrolled
 * up to read, where pinning is hostile. The rule: pin while the reader is
 * within `threshold` of the bottom, and let go the moment they leave it. A turn
 * growing under a pinned reader is not the reader leaving, so a streamed answer
 * is followed to its last line.
 *
 * **History loads upward, under a reader who does not move.** With `history`
 * set to `more`, reaching the top fires `helix-history`; the consumer sets
 * `loading` while it fetches and prepends the older turns, and the turn the
 * reader was looking at stays where it was on screen while the room above it
 * grows.
 *
 * **A turn is announced once, when it settles**, and not by the log. A log
 * that is a live region reads what enters it, which is every token of a stream
 * where `aria-busy` is not honored, every page of history as it loads, and
 * every window of a long transcript as the reader scrolls through it. So the
 * log is `aria-live="off"`, and a status region of its own says each new turn
 * when it has finished arriving: never the reader's own words unless they
 * failed to send, never a turn loaded above the ones already there, and never
 * what was in the transcript when it opened.
 *
 * **Turns are markup children or data, not both.** Children serve whole from a
 * server and are what most conversations want. `turns` is for the transcript
 * too long to hold as elements: it is drawn a window at a time, measured as it
 * goes, and the log needs a block size of its own for that to mean anything.
 *
 * **A fed turn is styled through this element, not its own.** Its message is
 * drawn in this shadow root, where `[author="me"]` cannot reach it, so every
 * fed turn's parts are forwarded as `message-*`, and the ones that change with
 * the turn a second time while it holds: `-mine` for a turn by `me`, and
 * `message-meta-failed`, `message-content-sending` and
 * `message-content-streaming` for its state. Every other author has the plain
 * names only, so a conversation styling each participant apart passes its
 * turns as children.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Conversation, Transcript, Thread, Messages
 * @documentation https://fusion.dev/helix/components/chat
 *
 * @slot - The turns, as `helix-chat-message` children.
 * @slot actions - Beside the header: what can be done to the conversation itself.
 * @slot composer - Below the transcript, where the reader writes.
 * @slot header - Above the transcript: what this conversation is.
 * @slot resume - The way back to the bottom, shown while the reader has scrolled away.
 * @slot status - Beside the composer: somebody typing, connection lost.
 *
 * @event {HelixBeforePinEvent} helix-before-pin - Fired when the reader pins or unpins the transcript by scrolling. Cancelable.
 * @event {HelixHistoryEvent} helix-history - Fired when the reader reaches the oldest turn while `history` is `more`, reporting where they are rather than asking.
 * @event {HelixSendEvent} helix-send - A turn offered from the composer, or a failed one asked to go again, dispatched inside and heard here because the conversation is what a consumer holds. Cancelable: refusing it takes the decision and nothing is sent.
 *
 * @csspart actions - The controls for the conversation, at the header's trailing edge.
 * @csspart after - The room the turns below the window would take. Data only.
 * @csspart before - The room the turns above the window would take. Data only.
 * @csspart composer - The region the composer sits in.
 * @csspart empty - Shown when the conversation has no turns.
 * @csspart header - The region above the transcript.
 * @csspart history - Shown at the top of the transcript while older turns are on their way.
 * @csspart live - Where each settled turn is said, for a reader who cannot see it arrive.
 * @csspart loading - Shown while the history is still on its way.
 * @csspart log - The transcript, which is the thing that scrolls.
 * @csspart message - A turn fed as data: the message drawn for it, forwarded whole.
 * @csspart message-actions - The controls offered on a fed turn, beside its time.
 * @csspart message-avatar - A fed turn's leading slot's box.
 * @csspart message-avatar-mine - The leading slot's box on a fed turn by `me`.
 * @csspart message-body - What a fed turn said, and the line under it.
 * @csspart message-body-mine - What a fed turn by `me` said, and the line under it.
 * @csspart message-content - A fed turn's text.
 * @csspart message-content-mine - The text of a fed turn by `me`.
 * @csspart message-content-sending - A fed turn's text while it is `sending`.
 * @csspart message-content-streaming - A fed turn's text while it is `streaming`.
 * @csspart message-indicator - A fed turn's default wait.
 * @csspart message-mark - The status glyph beside a fed turn's failure.
 * @csspart message-meta - The line under a fed turn: its time, its state, and its controls.
 * @csspart message-meta-failed - The line under a fed turn that `failed`, which says so.
 * @csspart message-meta-mine - The line under a fed turn by `me`.
 * @csspart message-mine - A fed turn by `me`: the message drawn for it.
 * @csspart message-retry - The control offered on a fed turn that failed.
 * @csspart message-sources - What a fed turn was drawn from.
 * @csspart message-state - What has happened to a fed turn, where that is worth saying.
 * @csspart message-time - When a fed turn was said.
 * @csspart resume - The affordance offered while the reader is away from the bottom.
 * @csspart status - The status region, which is not part of the log.
 * @csspart turn - One turn fed as data, around the message drawn for it.
 */
@customElement('helix-headless-chat')
export class HelixHeadlessChat extends MixinCollection(HelixElement) {
  /**
   * Nothing is assigned by name, so the turns land in the log and the rest does not.
   *
   * The messages are ordinary children a consumer writes with no `slot`, and a
   * `role="log"` whose turns are somewhere else is a log of nothing. Manual
   * assignment is the only way to wrap them without editing the consumer's
   * markup, which is a change a React consumer's hydration reports and does not
   * patch up.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    slotAssignment: 'manual',
  }

  /** How tall a turn is assumed to be before it has been drawn, in pixels. */
  static readonly ESTIMATE = 72

  /**
   * Whether to open pinned, where nothing declared it.
   */
  @property({ attribute: 'default-pinned', type: Boolean })
  defaultPinned = true

  /**
   * Whether there are older turns than the ones here, and whether they are coming.
   *
   * `more` makes reaching the top fire `helix-history`, once per arrival;
   * `loading` draws `history-text` above the oldest turn and fires nothing; empty
   * says this is the start of the conversation. The consumer owns it, because
   * only the consumer knows whether the server has anything older.
   */
  @property()
  history: '' | 'loading' | 'more' = ''

  /**
   * What to say while older turns are on their way.
   */
  @property({ attribute: 'history-text' })
  historyText = 'Loading earlier messages'

  /**
   * Accessible name for the conversation.
   */
  @property()
  label = ''

  /**
   * Whether the transcript follows new turns to the bottom.
   *
   * The reader's scrolling asks first: `helix-before-pin` is cancelable, so a
   * consumer refusing it takes the decision and assigns their own value.
   * `default-pinned` seeds the state this element then owns, and it defaults to
   * pinned because a conversation opens at its most recent turn.
   *
   * **Not reflected, and the default is why.** A reflected property that
   * defaults to true writes its attribute on upgrade whether or not the
   * consumer wrote one, so the server serves `<helix-chat label="x">` and the
   * client turns it into `<helix-chat label="x" pinned>`: a hydration mismatch a
   * React consumer reports and does not patch up. Nothing needs the attribute
   * either, because the one thing that changes with the pin is the way back, and
   * that is a part inside the shadow tree where a stylesheet can already reach
   * it. Measured rather than assumed: `label, pinned` after upgrade against
   * `label` from the server.
   */
  @property({ type: Boolean })
  get pinned(): boolean {
    return this.pinnedState ?? this.defaultPinned
  }

  set pinned(next: boolean) {
    const previous = this.pinned
    this.pinnedState = next
    this.requestUpdate('pinned', previous)
  }

  /**
   * How near the bottom still counts as being at it, in pixels.
   *
   * A hook rather than a constant, because the right number depends on how tall
   * a turn is: a transcript of one-line replies wants a smaller threshold than
   * one of paragraphs, and a reader who has scrolled up by half a message has
   * not left. The same distance from the top is what counts as reaching the
   * history.
   */
  @property({ type: Number })
  threshold = 48

  /**
   * The turns as data, for a transcript too long to hold as elements.
   *
   * Drawn a window at a time, so the log needs a block size. Set it or declare
   * children, not both: while it holds anything the children are not drawn.
   *
   * **Read, never written**, and replaced rather than mutated: a streamed turn
   * is a new array with the last turn's text longer, which is what tells this
   * element to look again.
   */
  @property({ attribute: false })
  turns: readonly ChatTurn[] = []

  @state()
  private pinnedState: boolean | undefined = undefined

  /** The last thing said, and how many times something has been. */
  @state()
  private announcement = ''

  @state()
  private said = 0

  /** Watches for turns arriving, since a manual slot hears nothing about them. */
  private watcher: MutationObserver | undefined = undefined

  /** Watches the turns' own `state`, which is when one of them settles. */
  private settling: MutationObserver | undefined = undefined

  /** Watches the turns and the log for size, which scrolling does not report. */
  private grower: ResizeObserver | undefined = undefined

  /** What `grower` is watching, so a render that changed nothing re-observes nothing. */
  private watched: readonly Element[] = []

  /** The scroll offset this element last set, which the reader has not moved from. */
  private stuckAt = -1

  /** The turn at the top of the reader's view, and how far below the top it sat. */
  private anchor: { id: unknown; offset: number } | undefined = undefined

  /** Whether `helix-history` has been fired for this arrival at the top. */
  private asked = false

  /**
   * Until the first frame, what is in the transcript is what it opened with, and
   * its box is not yet the box it will have.
   */
  private opening = true

  /** The newest turn already accounted for, and the turns still arriving. */
  private newest: unknown = undefined
  private pending = new Set<unknown>()

  /* No `overscan`: the controller's four is a frame of fast scrolling, and a
     turn is taller than the row that number was chosen for. */
  private readonly virtualize = new VirtualizeController(this, {
    container: () => (this.fed ? this.log : null),
    count: () => this.turns.length,
    estimate: () => HelixHeadlessChat.ESTIMATE,
    rows: () => (this.fed ? this.drawn() : []),
  })

  /**
   * Which regions were given something, or undefined where nobody has counted.
   *
   * **A slot that is assigned by hand has no children, so no stylesheet can ask
   * whether it was filled.** `[part="header"]:not(:has(> slot:has(*)))` is the
   * rule every other collection here hides an empty region with, and `:has()`
   * walks the DOM tree: with `slotAssignment: 'manual'` the assigned elements
   * are children of this host and never of the slot, so the test was false for
   * a filled header exactly as often as for an empty one and the rule never
   * matched. Measured on a chat with nothing slotted at all: the header was 25
   * pixels tall and drew its hairline under nothing, and so did the composer.
   *
   * Undefined rather than empty on the way in, for `MixinCollection`'s reason:
   * the server has no children to count, and an unknown answer is not "empty".
   * It serves every region and the first update on the client settles them,
   * which is a shadow-root attribute rather than a host one and so is nothing a
   * consumer's hydration compares.
   */
  @state()
  private filled: ReadonlySet<string> | undefined = undefined

  /** Whether a region has something in it, taking unknown for yes. */
  private has(name: string): boolean {
    return this.filled?.has(name) ?? true
  }

  /** Whether the turns are data rather than children. */
  private get fed(): boolean {
    return this.turns.length > 0
  }

  /** The turns declared as children, in the order they are written. */
  get messages(): HelixHeadlessChatMessage[] {
    /* What a render may know: nothing on a server, whose shim has no tree, and
       nothing while hydrating what one sent. */
    return this.knownChildren.filter(
      (child): child is HelixHeadlessChatMessage =>
        'isChatMessage' in child && child.isChatMessage === true,
    )
  }

  /** The element that scrolls, once there is one. */
  private get log(): HTMLElement | null {
    return this.partNamed('log')
  }

  /** Whether the reader is within `threshold` of the bottom right now. */
  private get atBottom(): boolean {
    const log = this.log
    if (!log) {
      return true
    }
    return log.scrollHeight - log.scrollTop - log.clientHeight <= Math.max(0, this.threshold)
  }

  /** What identifies a turn fed as data: its key, or the object it is. */
  private identity(turn: ChatTurn | undefined): unknown {
    return turn?.key ?? turn
  }

  /**
   * The turns fed as data that are drawn, each with its place in the whole set.
   *
   * Read off `data-index` rather than counted, for the reason the table gives:
   * the controller asks before `updated`, while the previous window is drawn.
   */
  private drawn(): Rendered[] {
    return [...(this.renderRoot?.querySelectorAll?.<HTMLElement>('[part="turn"]') ?? [])].map(
      (element) => ({ element, index: Number(element.dataset.index) }),
    )
  }

  /** The turns on screen, in order, each with what identifies it. */
  private rendered(): { element: Element; id: unknown }[] {
    if (this.fed) {
      return this.drawn().map(({ element, index }) => ({
        element,
        id: this.identity(this.turns[index]),
      }))
    }
    return this.messages.map((element) => ({ element, id: element }))
  }

  /** Every turn as the announcer reads it. */
  private heard(): Heard[] {
    if (this.fed) {
      return this.turns.map((turn) => ({
        author: turn.author,
        failed: FAILED_LABEL,
        id: this.identity(turn),
        state: turn.state,
        text: turn.text,
      }))
    }
    return this.messages.map((message) => ({
      author: message.author,
      failed: message.failedLabel,
      id: message,
      state: message.state,
      text: spoken(message),
    }))
  }

  /**
   * Puts the transcript back at its most recent turn.
   *
   * Public because the way back is a slot, so the control offering it is the
   * consumer's and needs something to call. Pins again on the way, which is what
   * a reader asking to go to the bottom means.
   */
  resume(): void {
    this.stick()
    this.requestPinned(true)
  }

  /** Scrolls to the bottom, and remembers where that was. */
  private stick(): void {
    const log = this.log
    if (log) {
      log.scrollTop = log.scrollHeight
      this.stuckAt = log.scrollTop
    }
  }

  /**
   * Asks to pin or unpin, and reports whether the request stood.
   *
   * Announced before it is applied, so a consumer owning the pin hears the
   * reader's scroll and decides. `property` names it, which is what
   * `helix-before-pin`'s detail is for: a listener switching on the name is
   * switching on something with one meaning.
   */
  private requestPinned(next: boolean): boolean {
    if (next === this.pinned) {
      return false
    }
    return requestChange({
      apply: (value) => {
        const previous = this.pinned
        this.pinnedState = value
        this.requestUpdate('pinned', previous)
      },
      event: (value) => new HelixBeforePinEvent({ value: String(value) }),
      host: this,
      next,
    })
  }

  private assign(): void {
    const root = this.renderRoot
    const log = root?.querySelector?.<HTMLSlotElement>('slot[name="messages"]')
    if (!log?.assign) {
      return
    }
    /* Hydrating a server's root, which routes by name: each turn is sent to
       the log, and the regions need nothing, their children already naming
       them. */
    if (this.assignsByName) {
      for (const turn of this.fed ? [] : this.messages) {
        this.route(turn, 'messages')
      }
      return
    }
    log.assign(...(this.fed ? [] : this.messages))
    for (const name of REGIONS) {
      root?.querySelector?.<HTMLSlotElement>(`slot[name="${name}"]`)?.assign?.(...this.given(name))
    }
  }

  /** The children a region is assigned, by the `slot` each one names. */
  private given(name: string): Element[] {
    return [...(this.children ?? [])].filter((child) => child.getAttribute('slot') === name)
  }

  /**
   * Notes which regions were given something, before the render that hides the
   * rest.
   *
   * From the children rather than the slots, so the first render has the
   * answer: the slots exist only once a render has made them. Not on the
   * server, where `children` is undefined, so `filled` stays unknown there, and
   * not while hydrating what a server sent, which renders the same unknown.
   */
  private countRegions(): void {
    if (this.children === undefined || this.hydrating) {
      return
    }
    const filled = new Set<string>(REGIONS.filter((name) => this.given(name).length > 0))
    /* Compared before it is set, or every update would report `filled` as
       changed. */
    const previous = this.filled
    if (
      !previous ||
      previous.size !== filled.size ||
      [...filled].some((name) => !previous.has(name))
    ) {
      this.filled = filled
    }
  }

  /**
   * Notes which turn is at the top of the reader's view, and where.
   *
   * A binary search, because the turns are in order down the log: a transcript
   * of five hundred scrolled to its end costs nine measurements, not five
   * hundred, and this runs on every scroll.
   */
  private remember(): void {
    const log = this.log
    const turns = this.rendered()
    if (!log || turns.length === 0) {
      this.anchor = undefined
      return
    }
    const top = log.getBoundingClientRect().top
    let low = 0
    let high = turns.length - 1
    while (low < high) {
      const middle = (low + high) >> 1
      if ((turns[middle]?.element.getBoundingClientRect().bottom ?? 0) > top) {
        high = middle
      } else {
        low = middle + 1
      }
    }
    const found = turns[low]
    this.anchor = found
      ? { id: found.id, offset: found.element.getBoundingClientRect().top - top }
      : undefined
  }

  /**
   * Puts the turn the reader was looking at back where they saw it.
   *
   * **By the turn, not by the offset.** History arriving above adds room the
   * reader never scrolled through, so the offset they were at is now an older
   * turn; what they were reading is the one fixed point. It is also idempotent,
   * which is what lets it run beside the browser's own scroll anchoring where
   * there is some: a turn the browser already put back has not moved.
   */
  private restore(): void {
    const log = this.log
    const anchor = this.anchor
    if (!log || !anchor) {
      return
    }
    const found = this.rendered().find((turn) => turn.id === anchor.id)
    if (!found) {
      return
    }
    const moved =
      found.element.getBoundingClientRect().top - log.getBoundingClientRect().top - anchor.offset
    if (Math.abs(moved) >= 1) {
      log.scrollTop += moved
    }
  }

  /** Fires `helix-history` once for each time the reader reaches the top. */
  private reachHistory(): void {
    const log = this.log
    if (this.opening || this.history !== 'more' || !log) {
      return
    }
    if (log.scrollTop > Math.max(0, this.threshold)) {
      this.asked = false
      return
    }
    if (!this.asked) {
      this.asked = true
      this.dispatchEvent(new HelixHistoryEvent())
    }
  }

  /**
   * Says the turns that have settled since the last time it looked.
   *
   * **New means after the newest turn already accounted for.** Turns loaded
   * above it are history and are not said; if the newest turn is gone, the set
   * was replaced rather than added to, and nothing is said either. A single turn
   * arriving in an empty transcript is a conversation starting and is said;
   * several at once is a transcript loading and is not.
   *
   * A turn still `sending` or `streaming` waits, and is said when it settles.
   */
  private announce(): void {
    const turns = this.heard()
    if (this.opening) {
      this.newest = turns.at(-1)?.id
      this.pending = new Set(turns.filter((turn) => !settled(turn)).map((turn) => turn.id))
      return
    }
    const fresh = this.arrived(turns)
    const words: string[] = []
    for (const turn of turns) {
      if (this.pending.has(turn.id) && settled(turn) && !fresh.includes(turn)) {
        this.pending.delete(turn.id)
        if (newsworthy(turn)) {
          words.push(this.phrase(turn))
        }
      }
    }
    for (const turn of fresh) {
      if (!settled(turn)) {
        this.pending.add(turn.id)
      } else if (newsworthy(turn)) {
        words.push(this.phrase(turn))
      }
    }
    if (this.pending.size > 0) {
      const present = new Set(turns.map((turn) => turn.id))
      this.pending = new Set([...this.pending].filter((id) => present.has(id)))
    }
    this.newest = turns.at(-1)?.id
    if (words.length > 0) {
      this.announcement = words.join(' ')
      this.said += 1
    }
  }

  /** The turns after the newest one already accounted for, by the rules above. */
  private arrived(turns: Heard[]): Heard[] {
    if (this.newest === undefined) {
      return turns.length === 1 ? turns : []
    }
    const at = turns.findIndex((turn) => turn.id === this.newest)
    return at < 0 ? [] : turns.slice(at + 1)
  }

  private phrase(turn: Heard): string {
    return turn.state === 'failed' ? `${turn.failed}: ${turn.text}` : turn.text
  }

  /** Watches what is drawn for size, re-observing only when that changed. */
  private watchSizes(): void {
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const log = this.log
    const targets = [...(log ? [log] : []), ...this.rendered().map((turn) => turn.element)]
    if (
      targets.length === this.watched.length &&
      targets.every((target, index) => target === this.watched[index])
    ) {
      return
    }
    this.grower ??= new ResizeObserver(this.handleResize)
    this.grower.disconnect()
    for (const target of targets) {
      this.grower.observe(target)
    }
    this.watched = targets
  }

  /**
   * A turn or the log changed size, which moves nothing on its own.
   *
   * Pinned, the bottom is followed: this is a streamed answer growing a line at
   * a time, and it is the only notice of it, since growing content fires no
   * scroll. Unpinned, the reader's turn is put back, which is an image loading
   * above them in a browser without scroll anchoring.
   */
  private readonly handleResize = (): void => {
    if (this.pinned) {
      this.stick()
    } else {
      this.restore()
    }
    this.remember()
  }

  /**
   * A press anywhere in the way back takes the reader back.
   *
   * The control is slotted so the consumer picks the words, which on its own
   * leaves a button this element positions, lifts, shows and hides doing nothing
   * until somebody wires it. The region exists for exactly one purpose, so a
   * press inside it has exactly one meaning and this element is entitled to act
   * on it. `resume()` stays public for the other callers: a keyboard shortcut,
   * or a consumer's own control somewhere else on the page.
   */
  private readonly handleResume = (): void => {
    this.resume()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* **A turn that arrives after first paint reaches nothing on its own.**
       Slots are assigned by hand here, so appending a child assigns it to
       nothing, fires no `slotchange`, and schedules no render: the transcript
       went on showing "Nothing to show" over six children it already had, and
       the one thing a conversation does is grow. Measured with `assignedElements()`
       at zero against `children` at nine.

       `childList` and not `subtree`, which is the difference between watching a
       conversation and watching every token of it: a streaming turn rewrites its
       own text on every frame, and a subtree observer would re-render the whole
       transcript each time for a change inside a child that owns it. */
    this.watcher = new MutationObserver(this.handleSlotChange)
    this.watcher.observe(this, { childList: true })
    /* The one thing inside a turn worth hearing about, and `attributeFilter`
       keeps it to that: a subtree watch of `state` alone never sees a token. */
    this.settling = new MutationObserver(this.handleSettle)
    this.settling.observe(this, { attributeFilter: ['state'], subtree: true })
    /* Children a parser is still adding when this upgrades are the transcript
       it opened with, not turns arriving, and a frame is when parsing yields.

       **The top is not judged before then either.** Before the first frame the
       page's stylesheet may not have given the box its height, and a box with no
       height is a transcript that does not fill it: every turn fits, the reader
       is at the top, and the history is asked for at load. Measured on the
       history example, whose React side asked at mount while its HTML side, a
       frame later and styled, did not. */
    this.opening = true
    requestAnimationFrame(() => {
      this.opening = false
      this.reachHistory()
    })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.watcher?.disconnect()
    this.watcher = undefined
    this.settling?.disconnect()
    this.settling = undefined
    this.grower?.disconnect()
    this.watched = []
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label || 'Conversation', role: 'region' })
    this.countRegions()
    if (changed.has('history')) {
      this.asked = false
    }
    if (changed.has('turns')) {
      this.follow(changed.get('turns') as readonly ChatTurn[] | undefined)
    }
  }

  /**
   * Keeps the window on the same turns when the set changes around them.
   *
   * Turns added before the first one are history, and the controller is told
   * how many so every measurement moves with its turn. A first turn that is gone
   * means the set was trimmed or replaced, and a measurement that now names a
   * different turn is worse than the estimate.
   */
  private follow(previous: readonly ChatTurn[] | undefined): void {
    if (!previous?.length || this.turns.length === 0) {
      return
    }
    const first = this.identity(previous[0])
    const at = this.turns.findIndex((turn) => this.identity(turn) === first)
    if (at > 0) {
      this.virtualize.shift(at)
    } else if (at < 0) {
      this.virtualize.forget()
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.assign()
    /* After the render that added the turn, because the scroll height it is
       being sent to does not exist until then. */
    if (this.pinned) {
      this.stick()
    } else {
      this.restore()
    }
    if (this.fed) {
      this.virtualize.measure()
    }
    this.watchSizes()
    this.remember()
    this.reachHistory()
    this.announce()
  }

  private readonly handleSlotChange = (): void => {
    this.assign()
    this.requestUpdate()
  }

  private readonly handleSettle = (): void => {
    this.requestUpdate()
  }

  /**
   * The reader's own scrolling, which is the only thing that unpins.
   *
   * **Bound to the transcript in the template, and it has to be.** A listener on
   * the host never runs, in any phase, and capture does not rescue it: `scroll`
   * is not *composed*, so its propagation path stops at the shadow root and
   * never includes the host. Not bubbling is the red herring.
   *
   * Measured by dispatching both shapes at the transcript: with
   * `composed: false`, which is what the platform sends, the host saw zero and
   * `pinned` stayed true; with `composed: true` the host saw one and `pinned`
   * went false.
   *
   * **The scroll this element does itself must not unpin it**, which is the
   * subtle half: `scrollTop = scrollHeight` fires the same event a reader's
   * wheel does. Reading the position rather than counting events is what makes
   * that harmless, since after a programmatic scroll the position is the bottom
   * and the answer is the one that was already true.
   *
   * **Nor does the transcript growing under a reader who has not moved.** A
   * pinned reader who is suddenly far from the bottom while still at the offset
   * this element put them at has been left behind by a turn, not gone anywhere,
   * and is followed. Leaving is moving up from there.
   */
  private readonly handleScroll = (): void => {
    const log = this.log
    if (this.pinned && log && log.scrollTop >= this.stuckAt - 1 && !this.atBottom) {
      this.stick()
    } else {
      const wanted = this.atBottom
      if (wanted !== this.pinned) {
        this.requestPinned(wanted)
      }
    }
    this.remember()
    this.reachHistory()
  }

  /** The turns fed as data, a window of them, between the room the rest would take. */
  private renderTurns(): TemplateResult {
    const { after, before, first, last } = this.virtualize.window
    const message = this.tag('chat-message')
    /* `flex: none` inline, because the room is only room if it keeps its size:
       an empty flex item in a log that is a flex column shrinks to nothing, and
       with the spacers gone the window grew until it had drawn every turn. */
    return html`<div part="before" role="presentation" style="block-size: ${before}px; flex: none"></div>
      ${repeat(
        this.turns.slice(first, last),
        (turn, offset) => turn.key ?? first + offset,
        (turn, offset) =>
          html`<div part="turn" data-index=${first + offset}>
            <${message}
              exportparts="actions: message-actions, avatar: message-avatar, body: message-body,
                content: message-content, indicator: message-indicator, mark: message-mark, message,
                meta: message-meta, retry: message-retry, sources: message-sources,
                state: message-state, time: message-time${secondNames(SECOND_NAMES.author, turn.author)}${secondNames(SECOND_NAMES.state, turn.state)}"
              author=${turn.author ?? nothing}
              at=${turn.at ?? nothing}
              state=${turn.state ?? nothing}
            >${turn.text}</${message}>
          </div>`,
      )}
      <div part="after" role="presentation" style="block-size: ${after}px; flex: none"></div>`
  }

  protected override render(): TemplateResult {
    const away = !this.pinned
    const fed = this.fed
    /* The header stands while either half of it is filled: a conversation with
       no title and a single control still needs the row that control sits in. */
    const titled = this.has('header') || this.has('actions')
    const busy = this.loading || this.history === 'loading'
    return html`<div part="header" ?hidden=${!titled}>
        <slot name="header"></slot>
        <span part="actions" ?hidden=${!this.has('actions')}>
          <slot name="actions"></slot>
        </span>
      </div>
      <div
        part="log"
        role="log"
        aria-live="off"
        aria-label=${this.label || 'Conversation'}
        aria-busy=${busy ? 'true' : nothing}
        ?data-windowed=${fed}
        @scroll=${this.handleScroll}
      >
        ${
          this.history === 'loading'
            ? html`<p part="history" role="status">${this.historyText}</p>`
            : nothing
        }
        ${fed ? this.renderTurns() : nothing}
        <slot name="messages" @slotchange=${this.handleSlotChange}></slot>
        ${
          /* Not empty where nobody can know yet: a server, and the render that
             has to be the server's. */
          this.renderStatus(fed || this.messages.length > 0 || !this.childrenKnown)
        }
      </div>
      <span part="live" role="status">${keyed(this.said, this.announcement)}</span>
      <div part="resume" ?hidden=${!away || !this.has('resume')} @click=${this.handleResume}>
        <slot name="resume"></slot>
      </div>
      <div part="status" role="status" ?hidden=${!this.has('status')}>
        <slot name="status"></slot>
      </div>
      <div part="composer" ?hidden=${!this.has('composer')}>
        <slot name="composer"></slot>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-chat': HelixHeadlessChat
  }
}
