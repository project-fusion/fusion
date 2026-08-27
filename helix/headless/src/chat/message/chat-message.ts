import { customElement, HelixElement, HelixSendEvent, hostAria, relativeTime } from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

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
 * @slot avatar - Who said it.
 * @slot actions - What can be done with it: copy, retry, react.
 *
 * @csspart message - The whole turn.
 * @csspart avatar - The leading slot's box.
 * @csspart body - What was said, and the line under it.
 * @csspart content - The consumer's own markup.
 * @csspart meta - The time and the state together.
 * @csspart time - When it was said.
 * @csspart state - What has happened to it, where that is worth saying.
 * @csspart retry - The control offered on a failed message.
 * @csspart actions - The trailing slot's box.
 *
 * @event {HelixSendEvent} helix-send - Fired when the reader asks to send a failed message again, and cancelable.
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
  /* **No initialiser, because a reflected default is an attribute.**
     `check:reflected-defaults` permits an empty string on the stated grounds
     that it "writes nothing", which is measurably untrue: Lit writes
     `author=""`, and a consumer who server-renders this gets an attribute React
     never sent. Undefined reflects nothing at all, which is what the resting
     state should be. The stylesheet only ever selects `[author="me"]`, so
     nothing downstream moves. */
  @property({ reflect: true })
  author?: string

  /**
   * What has happened to it.
   *
   * Reflected, because every one of the four is a visual state and a stylesheet
   * has no other way to know. Empty is a settled message with nothing to report,
   * which is what most of a transcript is.
   */
  /* The same, and for the same reason. Empty was "a settled message with
     nothing to report", which is the resting state and so is the absence of the
     attribute rather than a value of it. */
  @property({ reflect: true })
  state?: 'failed' | 'sending' | 'sent' | 'streaming'

  /** When it was said, as anything `Date` parses. */
  @property()
  at = ''

  /** Locale for the timestamp. Empty is the runtime's own. */
  @property()
  locale = ''

  /** What to call each state, for a reader who cannot see it. */
  @property({ attribute: 'sending-label' })
  sendingLabel = 'Sending'

  /** @internal */
  @property({ attribute: 'failed-label' })
  failedLabel = 'Not sent'

  /** Label for the control offered on a failed message. */
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
    return html`<span part="state"
      >${this.failedLabel}
      <button part="retry" type="button" @click=${this.handleRetry}>${this.retryLabel}</button>
    </span>`
  }

  protected override render(): TemplateResult {
    return html`<div part="message">
      <span part="avatar"><slot name="avatar"></slot></span>
      <div part="body">
        <div part="content"><slot></slot></div>
        <span part="meta">${this.renderTime()} ${this.renderState()}</span>
      </div>
      <span part="actions"><slot name="actions"></slot></span>
    </div>`
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
