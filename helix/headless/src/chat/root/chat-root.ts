import {
  customElement,
  HelixChangeEvent,
  HelixElement,
  hostAria,
  MixinCollection,
  requestChange,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixHeadlessChatMessage } from '../message/chat-message.js'

/**
 * @summary A conversation: the turns, and where the reader is in them.
 *
 * @description
 * **It has no opinion about where it sits.** A chat is asked for as a floating
 * button, a page, a palette, a sidebar, a modal and an inline block, and none of
 * those is a variant of a conversation: they are containers a conversation is
 * put in, and the containers already exist. `Popover` and `SpeedDial` make the
 * floating one, `Drawer` the sidebar, `Dialog` the modal, `Command` the palette,
 * and a page is a page. Nothing here is positioned, nothing here has a backdrop,
 * and nothing here owns a trigger, because a trigger opens a container and
 * containers own their own. If a form factor needs a mode on this element, the
 * split is wrong.
 *
 * **Scroll ownership is the behavior everything else depends on, and it is the
 * most-got-wrong thing in the category.** A transcript that grows wants to stay
 * at the bottom, except when the reader has scrolled up to read, where pinning
 * is hostile. The rule: pin while the reader is within `threshold` of the
 * bottom, release the moment they leave it, and offer a way back. **Never scroll
 * a reader who is reading.**
 *
 * The element owns it, because it is the only party that knows a message arrived
 * and where the viewport was when it did. `pinned` is a controlled property like
 * any other, so a consumer who wants to own it can.
 *
 * **The live region announces on completion, not on arrival.** The transcript is
 * `role="log"` with `aria-live="polite"`, and a streaming message carries
 * `aria-busy` while it arrives: a screen reader reading a stream token by token
 * is unusable, and holding the announcement until the flag clears is the only
 * arrangement that works. Somebody typing is a separate status region, so it
 * never interleaves with what was said.
 *
 * **Not a client.** No transport, no protocol, no model. It renders a
 * conversation and reports what the reader did.
 *
 * @since 0.1.0
 * @status experimental
 * @category feedback
 * @aliases Conversation, Transcript, Thread, Messages
 * @documentation https://helix.fusion.dev/components/chat
 *
 * @slot - The turns, as `helix-chat-message` children.
 * @slot header - Above the transcript.
 * @slot composer - Below the transcript, where the reader writes.
 * @slot status - Beside the composer: somebody typing, connection lost.
 * @slot resume - The way back to the bottom, shown while the reader has scrolled away.
 *
 * @csspart header - The region above the transcript.
 * @csspart log - The transcript, which is the thing that scrolls.
 * @csspart resume - The affordance offered while the reader is away from the bottom.
 * @csspart status - The status region, which is not part of the log.
 * @csspart composer - The region the composer sits in.
 * @csspart empty - Shown when the conversation has no turns.
 * @csspart loading - Shown while the history is still on its way.
 *
 * @event {HelixChangeEvent} helix-change - Fired when the reader pins or unpins the transcript by scrolling. Cancelable.
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

  /** Accessible name for the conversation. */
  @property()
  label = ''

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

  /**
   * Whether the transcript follows new turns to the bottom.
   *
   * Set it and this element defers: the reader's scrolling fires `helix-change`
   * and moves nothing until a new value arrives. `default-pinned` seeds a state
   * this element then owns, and it defaults to pinned because a conversation
   * opens at its most recent turn.
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
   *
   *
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

  /** Whether to open pinned, where nothing declared it. */
  @property({ attribute: 'default-pinned', type: Boolean })
  defaultPinned = true

  @state()
  private pinnedState: boolean | undefined = undefined

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
   * `helix-change`'s detail is for: a listener switching on the name is
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
      event: (value) => new HelixChangeEvent({ property: 'pinned', value: String(value) }),
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
    for (const name of ['header', 'composer', 'status', 'resume']) {
      root
        ?.querySelector?.<HTMLSlotElement>(`slot[name="${name}"]`)
        ?.assign?.(...[...this.children].filter((child) => child.getAttribute('slot') === name))
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('scroll', this.handleScroll, { capture: true })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('scroll', this.handleScroll, { capture: true })
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
   * Captured on the host rather than bound in the template, because the element
   * that scrolls is in the shadow tree and `scroll` does not bubble: it reaches
   * a listener in the capture phase and nowhere else.
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
    return html`<div part="header"><slot name="header"></slot></div>
      <div
        part="log"
        role="log"
        aria-live="polite"
        aria-label=${this.label || 'Conversation'}
        aria-busy=${this.loading ? 'true' : nothing}
      >
        <slot name="messages" @slotchange=${this.handleSlotChange}></slot>
        ${this.renderStatus(this.messages.length > 0)}
      </div>
      <div part="resume" ?hidden=${!away}><slot name="resume"></slot></div>
      <div part="status" role="status"><slot name="status"></slot></div>
      <div part="composer"><slot name="composer"></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-chat': HelixHeadlessChat
  }
}
