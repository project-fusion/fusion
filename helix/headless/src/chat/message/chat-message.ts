import {
  customElement,
  HelixElement,
  HelixSendEvent,
  hostAria,
  markRegion,
  relativeTime,
  requestChange,
  TONE_MARKS,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { authorWords, TURN_WORDS, turnName } from '../naming.js'
import { RelativeClockController } from '../relative-clock.js'

/**
 * What a turn that did not send is called, where nobody said otherwise.
 *
 * Exported because the transcript says it too: a failure is announced in the
 * words the turn shows, and two defaults for one phrase are two phrases.
 */
export const FAILED_LABEL = 'Not sent'

/**
 * @summary One turn in a conversation, with its state, such as sending or failed.
 *
 * @description
 * A chat message carries its state: sending, arrived, streaming, or failed. A
 * failed message has a retry control in the message, which fires `helix-send`.
 *
 * `streaming` is the state the others are arranged around. A streaming message
 * changes height on every frame, so it is marked `aria-busy` while it arrives
 * and announced once when it settles. A screen reader cannot follow a stream
 * read out character by character.
 *
 * A screen reader names the turn by its author and its time, such as "You, 2
 * minutes ago". The author is `author-label`, or "You" for `me`, or the
 * `author` itself where it is a name; give a turn by `them` an `author-label`
 * to name it. The chat it sits in holds the sentence and the word for `me`, so
 * a page in another language sets them once there. The time moves on by
 * itself, so "now" becomes "1 minute ago" while the page is open.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Message, Bubble, Turn
 * @documentation https://fusion.dev/helix/components/chat
 *
 * @slot - The turn's content.
 * @slot actions - Controls for the turn, such as copy, retry, or react.
 * @slot avatar - The author's avatar.
 * @slot indicator - The indicator shown before the first token arrives.
 * Defaults to the typing indicator.
 * @slot sources - The turn's sources, such as citations, documents, or a retrieved page.
 *
 * @event {HelixSendEvent} helix-send - Fired when the user retries a failed message. Cancelable: if it is not canceled, the turn is sent again. Canceling it leaves the failure and the retry button as they were.
 *
 * @csspart actions - The controls on the turn, beside its time.
 * @csspart avatar - The box around the `avatar` slot.
 * @csspart body - The content and the line under it.
 * @csspart content - Your own markup.
 * @csspart indicator - The default indicator, drawn only when nothing is in the `indicator` slot.
 * @csspart mark - The status icon beside a failure.
 * @csspart message - The whole turn.
 * @csspart meta - The line under a turn, with its time, state, and controls.
 * @csspart retry - The retry button on a failed message.
 * @csspart sources - The turn's sources, under it and outside the bubble.
 * @csspart state - The text that names the turn's state, when there is one to show.
 * @csspart time - The turn's time.
 */
@customElement('helix-headless-chat-message')
export class HelixHeadlessChatMessage extends HelixElement {
  /**
   * The turn's time, in any format `Date` parses.
   */
  @property()
  at = ''

  /**
   * The turn's author.
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
   * The author's name, as a screen reader says it at the start of the turn,
   * such as "Support" or "Ada Lovelace".
   *
   * Empty reads "You" for `me`, the `author` itself where it is a name, and
   * nothing for `them`.
   */
  @property({ attribute: 'author-label' })
  authorLabel = ''

  /**
   * Label for a message that did not send.
   */
  @property({ attribute: 'failed-label' })
  failedLabel = FAILED_LABEL

  /**
   * Locale for the timestamp.
   *
   * Empty is the runtime's own.
   */
  @property()
  locale = ''

  /**
   * Label for the retry button on a failed message.
   */
  @property({ attribute: 'retry-label' })
  retryLabel = 'Try again'

  /**
   * The label shown while the message is sending.
   */
  @property({ attribute: 'sending-label' })
  sendingLabel = 'Sending'

  /**
   * The turn's state.
   *
   * Reflected, because every one of the four is a visual state and a stylesheet
   * has no other way to know. Absent is a settled message with nothing to
   * report, which is what most of a transcript is, and it is the absence of the
   * attribute rather than a value of it: there is no initializer, so nothing is
   * reflected until something happens.
   *
   * **The turn writes this once, on a retry nobody refused**, and `handleRetry`
   * holds the reason. Everything else that moves it is the consumer's.
   */
  @property({ reflect: true })
  state?: 'failed' | 'sending' | 'sent' | 'streaming'

  /**
   * @internal Set by the chat: the word for `me` and the sentence that names a
   * turn with both an author and a time, in the chat's language.
   */
  @property({ attribute: false })
  turnWords = TURN_WORDS

  /**
   * @internal Read by the transcript to identify its children across the light
   * DOM, which is cheaper than `instanceof`. Not a consumer's to read or set.
   */
  readonly isChatMessage = true

  /** The time the reading is drawn against, moved on when the words go stale. */
  private readonly clock = new RelativeClockController(this, {
    locale: () => this.locale,
    moment: () => this.moment,
  })

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
    if (changed.has('at') || changed.has('locale')) {
      this.clock.tick()
    }
    /* `article` rather than `listitem`, because the transcript is a `log` and a
       log's children are not list items: a turn is a self-contained thing a
       reader can be moved to, which is what an article is for.

       `aria-busy` while it arrives is the whole of the streaming contract on
       this side: the live region above it holds its announcement until the flag
       clears, so the message is read once, whole, rather than per token.

       **Through internals, like the role beside it, and this was an attribute.**
       `toggleAttribute('aria-busy', …)` put a flag on the host that a consumer
       never wrote, so a React page server-rendering a streaming turn sent
       `<helix-headless-chat-message state="streaming">` and got `aria-busy` added the
       moment the element upgraded: the mismatch React reports and does not patch
       up, which `Tree.chevronPlacement`, `Toast.placement` and `Image.status`
       were each caught by. Internals carry it to the accessibility tree and
       nothing to the markup, which is what `Skeleton`, `Loader` and `Orb`
       already do with this exact flag. */
    hostAria(this.internals, { label: this.name, role: 'article' })
    this.internals.ariaBusy = this.state === 'streaming' ? 'true' : null
  }

  /** The time as it reads now, or nothing where the turn has none. */
  private get reading(): string {
    const moment = this.moment
    return moment ? relativeTime(this.locale)(moment, new Date(this.clock.now)).text : ''
  }

  /**
   * What a screen reader calls the turn: who wrote it, and when.
   *
   * **The name of an `article` is never its content**, so without one a reader
   * moving through a transcript heard "article" for every turn and had to read
   * each to learn who wrote it.
   */
  private get name(): string {
    return turnName(
      authorWords(this.author, this.authorLabel, this.turnWords),
      this.reading,
      this.turnWords,
    )
  }

  private renderTime(): TemplateResult | typeof nothing {
    const moment = this.moment
    if (!moment) {
      return nothing
    }
    return html`<time part="time" datetime=${moment.toISOString()}>${this.reading}</time>`
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
   * The wait, for a consumer who slots nothing.
   *
   * **The slot and its fallback together, in a seam of its own**, because the
   * two answer different people: the slot lets a consumer put their own
   * indicator in the bubble, and the method lets the tier above replace what
   * they get when they do not, without reimplementing the template around it.
   * Headless draws a box and paints nothing on it.
   */
  protected renderIndicator(): TemplateResult | typeof nothing {
    return html`<slot name="indicator"><span part="indicator"></span></slot>`
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
    /* `content` keeps its box when empty, because the typing indicator is
       painted into it. The other two are gaps nobody asked for, and the default
       slot is the one the content region holds. */
    markRegion(this.renderRoot, 'content', [''], { hide: false })
    for (const name of ['sources', 'actions'] as const) {
      markRegion(this.renderRoot, name, [name])
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
        <div part="content">
          <slot @slotchange=${this.handleFill}></slot>
          ${this.renderIndicator()}
        </div>
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
   *
   * **Through `requestChange`, and the turn is what moves.** `helix-send` is
   * cancelable because the composer clears only when nobody refused, and this
   * dispatch had nothing behind it: the reader pressed the control, the turn sat
   * at "Not sent" with the same control still on it, and `preventDefault()`
   * refused a decision nobody here was about to take. A retry that stands is a
   * turn on its way, which is what `sending` means, so that is the default
   * action and refusing it leaves the failure exactly where it was. A consumer
   * who wants something else refuses and assigns `state` themselves, which is
   * how control is taken from every other stateful element in the library.
   */
  private readonly handleRetry = (event: Event): void => {
    event.stopPropagation()
    requestChange<'sending'>({
      apply: (next) => {
        this.state = next
      },
      /* The turn's words only. The whole `textContent` carried the controls
         and sources slotted beside them, so a retry sent "Where is my
         order?CopyOrder page". The transcript's announcer reads them the same
         way. */
      event: () =>
        new HelixSendEvent({
          value: [...this.childNodes]
            .filter((node) => !(node.nodeType === 1 && (node as Element).hasAttribute('slot')))
            .map((node) => node.textContent ?? '')
            .join('')
            .replace(/\s+/g, ' ')
            .trim(),
        }),
      host: this,
      next: 'sending',
    })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-chat-message': HelixHeadlessChatMessage
  }
}
