import {
  customElement,
  HelixElement,
  HelixSendEvent,
  hostAria,
  relativeTime,
  slotFilled,
  TONE_MARKS,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One turn in a conversation, and what has happened to it.
 *
 * @description
 * **The states are the component.** Bubbles are paint; what a chat message has
 * to carry is whether it is on its way, arrived, still arriving, or failed, and
 * a failed message needs a retry that is a real action rather than a toast the
 * reader has to catch.
 *
 * `streaming` is the state everything else is arranged around. A message
 * arriving token by token changes height on every frame, so it is marked
 * `aria-busy` while it arrives and announced once when it settles: a screen
 * reader reading a stream character by character is unusable, and announcing on
 * completion is the only version of this that works.
 *
 * @since 0.1.0
 * @status experimental
 * @category feedback
 * @aliases Message, Bubble, Turn
 * @documentation https://helix.fusion.dev/components/chat
 *
 * @slot - What was said.
 * @slot actions - What can be done with it: copy, retry, react.
 * @slot avatar - Who said it.
 * @slot sources - What it was said from: citations, documents, a retrieved page.
 *
 * @event {HelixSendEvent} helix-send - Fired when the reader asks to send a failed message again, and cancelable.
 *
 * @csspart actions - The controls offered on the turn, beside its time.
 * @csspart avatar - The leading slot's box.
 * @csspart body - What was said, and the line under it.
 * @csspart content - The consumer's own markup.
 * @csspart mark - The status glyph beside a failure.
 * @csspart message - The whole turn.
 * @csspart meta - The line under a turn: its time, its state, and its controls.
 * @csspart retry - The control offered on a failed message.
 * @csspart sources - What the turn was drawn from, under it and outside the bubble.
 * @csspart state - What has happened to it, where that is worth saying.
 * @csspart time - When it was said.
 */
@customElement('helix-headless-chat-message')
export class HelixHeadlessChatMessage extends HelixElement {
  /**
   * Who said it.
   *
   * Free text rather than a two-value union, because a conversation is not
   * always two-sided: a transcript with a system turn, a tool call and three
   * participants is the ordinary case for anything worth building this for.
   * `me` and `them` are the conventional values and the stylesheet knows them;
   * anything else is a name the consumer styles.
   */
  /* **No initializer, because a reflected default is an attribute.** An empty
     string does not write nothing: Lit writes `author=""`, and a consumer who
     server-renders this gets an attribute React never sent. Undefined reflects
     nothing at all, which is what the resting state should be. The stylesheet
     only ever selects `[author="me"]`. */
  @property({ reflect: true })
  author?: string

  /**
   * What has happened to it.
   *
   * Reflected, because every one of the four is a visual state and a stylesheet
   * has no other way to know. Absent is a settled message with nothing to
   * report, which is what most of a transcript is, and it is the absence of the
   * attribute rather than a value of it: there is no initializer, so nothing is
   * reflected until something happens.
   */
  @property({ reflect: true })
  state?: 'failed' | 'sending' | 'sent' | 'streaming'

  /**
   * When it was said, as anything `Date` parses.
   */
  @property()
  at = ''

  /**
   * Locale for the timestamp.
   *
   * Empty is the runtime's own.
   */
  @property()
  locale = ''

  /**
   * What to call each state, for a reader who cannot see it.
   */
  @property({ attribute: 'sending-label' })
  sendingLabel = 'Sending'

  /**
   * @internal
   */
  @property({ attribute: 'failed-label' })
  failedLabel = 'Not sent'

  /**
   * Label for the control offered on a failed message.
   */
  @property({ attribute: 'retry-label' })
  retryLabel = 'Try again'

  /**
   * @internal Read by the transcript to identify its children across the light
   * DOM, which is cheaper than `instanceof`. Not a consumer's to read or set.
   */
  readonly isChatMessage = true

  @state()
  private clock: number | undefined = undefined

  /** The timestamp, or nothing where there is not one to read. */
  private get moment(): Date | undefined {
    if (this.at === '') {
      return undefined
    }
    const parsed = new Date(this.at)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (changed.has('at')) {
      this.clock = Date.now()
    }
    /* `article` rather than `listitem`, because the transcript is a `log` and a
       log's children are not list items: a turn is a self-contained thing a
       reader can be moved to, which is what an article is for.

       `aria-busy` while it arrives is the whole of the streaming contract on
       this side: the live region above it holds its announcement until the flag
       clears, so the message is read once, whole, rather than per token. */
    hostAria(this.internals, { role: 'article' })
    this.toggleAttribute('aria-busy', this.state === 'streaming')
  }

  private renderTime(): TemplateResult | typeof nothing {
    const moment = this.moment
    if (!moment) {
      return nothing
    }
    const { text } = relativeTime(this.locale)(moment, new Date(this.clock ?? Date.now()))
    return html`<time part="time" datetime=${moment.toISOString()}>${text}</time>`
  }

  /**
   * The status glyph, behind a seam so a tier can draw its own.
   *
   * `TONE_MARKS.danger` rather than a glyph chosen here: the library has one
   * status vocabulary, `Callout`, `Toast.Item` and `Announcement` all read from
   * it, and a reader meets these four marks in a passage, in a message and now
   * on a turn and has to read them as the same four things. It carries the
   * accessible name with it, which is the half that matters: `danger` is the
   * word the API uses and "Error" is the word a reader understands.
   */
  protected renderMark(): TemplateResult {
    const { icon, label } = TONE_MARKS.danger
    return html`<svg
      part="mark"
      fill="currentColor"
      viewBox=${icon.viewBox}
      role="img"
      aria-label=${label}
    >
      ${unsafeSVG(icon.content)}
    </svg>`
  }

  /**
   * What has happened to it, in words, and the way back from a failure.
   *
   * A seam of its own, because the styled tier draws a failure as an icon and a
   * consumer may want neither. `sent` says nothing: every settled message is
   * sent, and a transcript that labels each one is a transcript of the word
   * "sent".
   */
  protected renderState(): TemplateResult | typeof nothing {
    if (this.state === 'sending') {
      return html`<span part="state">${this.sendingLabel}</span>`
    }
    if (this.state !== 'failed') {
      return nothing
    }
    /* **The mark, and not because color needs a second carrier here.** "Not
       sent" is words, so the meaning survives without it. It is here because a
       failure is the one state that has to be *found* rather than noticed, and a
       shape is what a reader scanning a transcript finds. */
    return html`<span part="state"
      >${this.renderMark()} ${this.failedLabel}
      <button part="retry" type="button" @click=${this.handleRetry}>${this.retryLabel}</button>
    </span>`
  }

  /**
   * Says on each region whether anything is in it.
   *
   * Three of them need the answer and no selector can give it: a slot's assigned
   * nodes are not its DOM children, so `:empty` and `:has(*)` both describe the
   * fallback rather than the fill. `sources` and `actions` are regions that cost
   * a gap when they are boxes at all, which most turns should not pay. `content`
   * is the one that is not about space: a turn that is `streaming` with nothing
   * in it yet is what the typing indicator is drawn for, and "nothing in it yet"
   * is exactly this question.
   */
  private markEmpty(): void {
    for (const name of ['content', 'sources', 'actions'] as const) {
      const region = this.renderRoot?.querySelector<HTMLElement>(`[part="${name}"]`)
      const slot =
        name === 'content'
          ? this.renderRoot?.querySelector<HTMLSlotElement>('slot:not([name])')
          : this.renderRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
      const empty = !slotFilled(slot)
      region?.toggleAttribute('data-empty', empty)
      /* `content` keeps its box when empty, because the typing indicator is
         painted into it. The other two are gaps nobody asked for. */
      if (name !== 'content') {
        region?.toggleAttribute('hidden', empty)
      }
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
  }

  /**
   * The turn: who said it, what was said, what it was drawn from, and its line.
   *
   * **`sources` and `actions` are inside the body rather than beside it.**
   * `actions` as a third grid column puts a copy control on a fifteen-word turn
   * at the container's trailing edge, a hundred and fifty pixels of nothing
   * between it and the bubble it acts on, on both sides of the conversation. As
   * a column of its own inside the body it is no better: a bubble spanning two
   * auto tracks inflates both, so the controls land under the middle of the
   * turn.
   *
   * So they are inside `meta`, which is the line under a turn rather than only
   * its timestamp, and that line is one flex row: time, state, controls, all
   * hugging whichever edge the turn is against. Nothing has to be sized against
   * anything else for that to hold at every width.
   */
  protected override render(): TemplateResult {
    return html`<div part="message">
      <span part="avatar"><slot name="avatar"></slot></span>
      <div part="body">
        <div part="content"><slot @slotchange=${this.handleFill}></slot></div>
        <div part="sources"><slot name="sources" @slotchange=${this.handleFill}></slot></div>
        <span part="meta"
          >${this.renderTime()} ${this.renderState()}
          <span part="actions"><slot name="actions" @slotchange=${this.handleFill}></slot></span>
        </span>
      </div>
    </div>`
  }

  /**
   * A turn's own content arrives and changes no property here.
   *
   * It is the streaming case that needs this rather than a tidiness one: the
   * first token of an answer is a light-DOM child appearing under an element
   * nothing else told to look again, and it is exactly the moment the typing
   * indicator has to stop being drawn.
   */
  private readonly handleFill = (): void => {
    this.markEmpty()
  }

  /**
   * Retry is `helix-send` again, from the message rather than the composer.
   *
   * **Not an event of its own**, because a retry is the same request: the reader
   * is offering what they wrote, and the only difference is which element is
   * offering it. A listener that wants to tell them apart has `event.target`,
   * which is the message on a retry and the composer on a first send, and that
   * is a distinction the DOM already makes without a second name for it.
   */
  private readonly handleRetry = (event: Event): void => {
    event.stopPropagation()
    this.dispatchEvent(new HelixSendEvent({ value: this.textContent?.trim() ?? '' }))
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-chat-message': HelixHeadlessChatMessage
  }
}
