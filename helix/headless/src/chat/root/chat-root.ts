import {
  customElement,
  HelixBeforePinEvent,
  HelixElement,
  hostAria,
  MixinCollection,
  requestChange,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixHeadlessChatMessage } from '../message/chat-message.js'

/**
 * The regions a consumer fills, in the order they are rendered.
 *
 * Named once because two things read the list: the manual assignment that puts
 * a child in the region its `slot` names, and the emptiness each region is
 * hidden on. Written out twice they go out of step.
 */
const REGIONS = ['header', 'actions', 'resume', 'status', 'composer'] as const

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
 * within `threshold` of the bottom, and let go the moment they leave it.
 *
 * @since 0.1.0
 * @status experimental
 * @category feedback
 * @aliases Conversation, Transcript, Thread, Messages
 * @documentation https://helix.fusion.dev/components/chat
 *
 * @slot - The turns, as `helix-chat-message` children.
 * @slot actions - Beside the header: what can be done to the conversation itself.
 * @slot composer - Below the transcript, where the reader writes.
 * @slot header - Above the transcript: what this conversation is.
 * @slot resume - The way back to the bottom, shown while the reader has scrolled away.
 * @slot status - Beside the composer: somebody typing, connection lost.
 *
 * @event {HelixBeforePinEvent} helix-before-pin - Fired when the reader pins or unpins the transcript by scrolling. Cancelable.
 *
 * @csspart actions - The controls for the conversation, at the header's trailing edge.
 * @csspart composer - The region the composer sits in.
 * @csspart empty - Shown when the conversation has no turns.
 * @csspart header - The region above the transcript.
 * @csspart loading - Shown while the history is still on its way.
 * @csspart log - The transcript, which is the thing that scrolls.
 * @csspart resume - The affordance offered while the reader is away from the bottom.
 * @csspart status - The status region, which is not part of the log.
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

  /**
   * Whether to open pinned, where nothing declared it.
   */
  @property({ attribute: 'default-pinned', type: Boolean })
  defaultPinned = true

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
   * not left.
   */
  @property({ type: Number })
  threshold = 48

  @state()
  private pinnedState: boolean | undefined = undefined

  /** Watches for turns arriving, since a manual slot hears nothing about them. */
  private watcher: MutationObserver | undefined = undefined

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
   * It serves every region and the first assignment on the client settles them,
   * which is a shadow-root attribute rather than a host one and so is nothing a
   * consumer's hydration compares.
   */
  @state()
  private filled: ReadonlySet<string> | undefined = undefined

  /** Whether a region has something in it, taking unknown for yes. */
  private has(name: string): boolean {
    return this.filled?.has(name) ?? true
  }

  /** The turns declared as children, in the order they are written. */
  get messages(): HelixHeadlessChatMessage[] {
    /* `?? []` is the server: Lit's element shim carries attributes and not a
       tree, so `children` is undefined there and spreading it throws. */
    return [...(this.children ?? [])].filter(
      (child): child is HelixHeadlessChatMessage =>
        'isChatMessage' in child && child.isChatMessage === true,
    )
  }

  /** The element that scrolls, once there is one. */
  private get log(): HTMLElement | null {
    return this.renderRoot?.querySelector?.<HTMLElement>('[part="log"]') ?? null
  }

  /** Whether the reader is within `threshold` of the bottom right now. */
  private get atBottom(): boolean {
    const log = this.log
    if (!log) {
      return true
    }
    return log.scrollHeight - log.scrollTop - log.clientHeight <= Math.max(0, this.threshold)
  }

  /**
   * Puts the transcript back at its most recent turn.
   *
   * Public because the way back is a slot, so the control offering it is the
   * consumer's and needs something to call. Pins again on the way, which is what
   * a reader asking to go to the bottom means.
   */
  resume(): void {
    const log = this.log
    if (log) {
      log.scrollTop = log.scrollHeight
    }
    this.requestPinned(true)
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
    const messages = this.messages
    log.assign(...messages)
    const filled = new Set<string>()
    for (const name of REGIONS) {
      const given = [...this.children].filter((child) => child.getAttribute('slot') === name)
      root?.querySelector?.<HTMLSlotElement>(`slot[name="${name}"]`)?.assign?.(...given)
      if (given.length > 0) {
        filled.add(name)
      }
    }
    /* Compared before it is set, because this runs from `updated` and a new Set
       every render is a new value every render, which is a render loop. */
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
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.watcher?.disconnect()
    this.watcher = undefined
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label || 'Conversation', role: 'region' })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.assign()
    /* After the render that added the turn, because the scroll height it is
       being sent to does not exist until then. */
    if (this.pinned) {
      const log = this.log
      if (log) {
        log.scrollTop = log.scrollHeight
      }
    }
  }

  private readonly handleSlotChange = (): void => {
    this.assign()
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
   */
  private readonly handleScroll = (): void => {
    const wanted = this.atBottom
    if (wanted !== this.pinned) {
      this.requestPinned(wanted)
    }
  }

  protected override render(): TemplateResult {
    const away = !this.pinned
    /* The header stands while either half of it is filled: a conversation with
       no title and a single control still needs the row that control sits in. */
    const titled = this.has('header') || this.has('actions')
    return html`<div part="header" ?hidden=${!titled}>
        <slot name="header"></slot>
        <span part="actions" ?hidden=${!this.has('actions')}>
          <slot name="actions"></slot>
        </span>
      </div>
      <div
        part="log"
        role="log"
        aria-live="polite"
        aria-label=${this.label || 'Conversation'}
        aria-busy=${this.loading ? 'true' : nothing}
        @scroll=${this.handleScroll}
      >
        <slot name="messages" @slotchange=${this.handleSlotChange}></slot>
        ${this.renderStatus(this.messages.length > 0)}
      </div>
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
