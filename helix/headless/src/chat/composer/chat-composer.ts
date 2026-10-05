import {
  customElement,
  DelayController,
  HelixFormElement,
  HelixSendEvent,
  HelixTypingEvent,
  hostAria,
  markRegion,
} from '@fusion.dev/helix-core'
import { arrowElbowDownLeft } from '@fusion.dev/helix-icons'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { live } from 'lit/directives/live.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary A field for writing a turn in a conversation.
 *
 * @description
 * The composer is a separate element so you can replace it. If you need
 * attachments, slash commands, or a model picker, replace the composer and keep
 * the transcript.
 *
 * By default, Enter sends and Shift+Enter starts a new line, the convention in
 * messaging apps. Document editors mostly use the opposite, so `submit-on`
 * takes `enter` or `button`. Use `button` for a long-form composer.
 *
 * The composer clears only when no listener cancels the send, so the text is
 * kept when you cancel a send that failed.
 *
 * **In a form, the draft is the composer's value**, submitted under `name`. A
 * form reset puts back the `value` the markup declared, and a `<fieldset
 * disabled>` turns the composer off. Sending is still `helix-send`, and it
 * does not submit the form.
 *
 * **`typing` says whether the user is writing**, and `helix-typing` is sent
 * each time it changes: when they start, and when they send or stop for
 * `typing-timeout` milliseconds. Pass it on to show "is typing" to the other
 * side.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Message box, Prompt input
 * @documentation https://fusion.dev/helix/components/chat
 *
 * @slot end - Content under the field, beside the send button.
 * @slot start - Content under the field at the leading edge, such as an attachment button or a model picker.
 *
 * @event {HelixSendEvent} helix-send - Fired when the user sends their turn, and cancelable.
 * @event {HelixTypingEvent} helix-typing - The user started or stopped writing, with `typing` saying which, as the composer's `typing` does.
 * @event {Event} input - The user changed the text. Read it from `value`, for a typing indicator or a saved draft. Sent on the composer and does not bubble.
 *
 * @csspart composer - The whole composer.
 * @csspart end - The box around the `end` slot.
 * @csspart field - The text field.
 * @csspart mark - The icon inside the send button.
 * @csspart send - The send button.
 * @csspart start - The box around the `start` slot.
 * @csspart tools - The row under the field.
 */
@customElement('helix-headless-chat-composer')
export class HelixHeadlessChatComposer extends HelixFormElement {
  /**
   * The field's name, read by screen readers.
   */
  @property()
  label = 'Message'

  /**
   * Placeholder text shown in an empty field.
   */
  @property()
  placeholder = ''

  /**
   * How many rows the field opens at.
   *
   * It grows from there.
   */
  @property({ type: Number })
  rows = 1

  /**
   * Label for the send button.
   */
  @property({ attribute: 'send-label' })
  sendLabel = 'Send'

  /**
   * What sends the turn: `enter` for the Enter key, or `button` for the send
   * button only.
   *
   * `enter` is the messaging convention and makes Shift+Enter the line break.
   * `button` is what a composer holding several paragraphs wants, where Enter
   * has to mean a new line and nothing else.
   */
  @property({ attribute: 'submit-on' })
  submitOn: 'button' | 'enter' = 'enter'

  /**
   * How long after the last keystroke the user still counts as typing, in
   * milliseconds.
   */
  @property({ attribute: 'typing-timeout', type: Number })
  typingTimeout = 3000

  /**
   * The text the user has written.
   *
   * It follows typing, so reading it gives the draft. Set it to seed a draft or
   * to replace the one in the field, and set it to `''` to clear it.
   */
  @property()
  value = ''

  /**
   * @internal Read by the transcript to find the composer among its children.
   */
  readonly isChatComposer = true

  /** Whether the user is writing, which `helix-typing` announces. */
  private writing = false

  /** The pause after which the user has stopped writing. */
  private readonly pause = new DelayController(this, { renders: false })

  /**
   * Whether the user is writing: true from their first keystroke until they
   * send, clear the field, or pause for `typing-timeout` milliseconds.
   */
  get typing(): boolean {
    return this.writing
  }

  /** Records whether the user is writing, and says so when that changed. */
  private markTyping(typing: boolean): void {
    if (typing) {
      this.pause.start(Math.max(0, this.typingTimeout), () => this.markTyping(false))
    } else {
      this.pause.cancel()
    }
    if (typing === this.writing) {
      return
    }
    this.writing = typing
    this.dispatchEvent(new HelixTypingEvent({ typing }))
  }

  /**
   * Sends what is written, and returns whether the send went through.
   *
   * Public because a consumer's own send control is as likely to ask as this
   * element's is, and because a keyboard shortcut somewhere else on the page is
   * a reasonable way to send.
   */
  send(): boolean {
    const value = this.value.trim()
    if (value === '' || this.isDisabled) {
      return false
    }
    if (!this.dispatchEvent(new HelixSendEvent({ value }))) {
      return false
    }
    /* Cleared only here, after nobody refused. A composer that empties itself
       first and hears about the failure afterwards has thrown away the only copy
       of what the reader wrote. */
    this.value = ''
    this.markTyping(false)
    return true
  }

  /**
   * The value the markup declared, which a form reset and an empty restore go
   * back to. `value` does not reflect, so its attribute stays as written.
   */
  private get declared(): string {
    return this.getAttribute('value') ?? ''
  }

  /** Puts back the draft the markup declared when the form is reset. */
  override formResetCallback(): void {
    super.formResetCallback()
    this.value = this.declared
  }

  /** Brings back the draft when the browser restores the form. */
  formStateRestoreCallback(state: string | File | FormData | null): void {
    this.value = typeof state === 'string' ? state : this.declared
  }

  /**
   * Says on each tool box whether anything is in it.
   *
   * They are boxes in a flex row, so an empty one still takes the gap beside it
   * and the send control drifts inward by one for every slot a consumer left
   * alone. No selector can ask this: a slot's assigned nodes are not its DOM
   * children, so `:empty` describes the fallback rather than the fill.
   */
  private markEmpty(): void {
    for (const name of ['start', 'end'] as const) {
      markRegion(this.renderRoot, name, [name])
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
    /* Nothing where nothing is written, so an empty composer submits no entry
       rather than a blank one. */
    if (changed.has('value')) {
      this.internals.setFormValue(this.value === '' ? null : this.value)
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'group' })
  }

  /**
   * The control that offers the turn, behind a seam so a tier can draw its own.
   *
   * **A glyph with the label as its accessible name, rather than the label as
   * text.** The word "Send" beside a field is the widest thing in the row and
   * says nothing a return key does not. The return glyph is the mark because
   * Enter is what actually sends, which `submit-on` says out loud: the control
   * and the key are one affordance and should look like it. `send-label` is the
   * accessible name rather than a visible one, so a screen reader still hears
   * the word.
   *
   * **Not mirrored on a right-to-left page**, where every caret meaning next
   * is. It pictures a key rather than a way to go, like the arrows `Kbd`
   * draws, and a picture of a key is not turned round with the text.
   */
  protected renderSend(): TemplateResult {
    return html`<button
      part="send"
      type="button"
      aria-label=${this.sendLabel}
      ?disabled=${this.isDisabled}
      @click=${this.handleSend}
    >
      <svg
        part="mark"
        fill="currentColor"
        viewBox=${arrowElbowDownLeft.viewBox}
        aria-hidden="true"
      >
        ${unsafeSVG(arrowElbowDownLeft.content)}
      </svg>
    </button>`
  }

  /**
   * The field, and a row of tools under it.
   *
   * **The tools take a line of their own rather than sharing the field's.** On
   * one line every tool a consumer adds takes width away from the thing being
   * typed into; under it, the field spans the whole composer at every width and
   * the tools have room to grow along.
   *
   * Send is at the trailing end of that line rather than in the field, which is
   * the same corner and costs no overlay: a control positioned inside a
   * scrolling textarea either covers the last line of a long draft or scrolls
   * away with it.
   */
  protected override render(): TemplateResult {
    return html`<div part="composer">
      <textarea
        part="field"
        .value=${live(this.value)}
        aria-label=${this.label}
        placeholder=${this.placeholder}
        rows=${this.rows}
        ?disabled=${this.isDisabled}
        @input=${this.handleInput}
        @keydown=${this.handleKey}
      ></textarea>
      <div part="tools">
        <span part="start"><slot name="start"></slot></span>
        <span part="end"><slot name="end"></slot></span>
        ${this.renderSend()}
      </div>
    </div>`
  }

  /**
   * Takes what was typed into `value`, and says so from this element.
   *
   * **The textarea's own `input` is stopped and this element sends one.**
   * `input` is composed by specification, so the `<textarea>` in this shadow
   * root sent its own past this host with a target a consumer cannot reach.
   * The one sent here comes from the composer, whose `value` already holds
   * the text, which is what a typing indicator or a saved draft reads.
   *
   * **The text is `value` and nothing beside it.** A private draft read before
   * `value` sent a seed the reader had deleted, since an empty draft fell back
   * to it, and left `value` reading empty while the field held a whole draft.
   */
  private readonly handleInput = (event: Event): void => {
    event.stopPropagation()
    this.value = (event.target as HTMLTextAreaElement).value
    /* On the composer alone, without bubbling, the way a media element sends
       its events. A transcript speaks for the controls it holds, and a bubbling
       `input` from the composer slotted into one was the transcript speaking in
       another element's name. A listener on the composer hears it, and so does
       a React `onInput`, which `HelixElement` binds for an event that does not
       bubble. */
    this.dispatchEvent(new Event('input'))
    this.markTyping(this.value !== '')
  }

  private readonly handleSend = (): void => {
    this.send()
  }

  /**
   * Enter sends where that is what `submit-on` says, and never mid-composition.
   *
   * **`isComposing` is the part that is easy to leave out and breaks a whole
   * writing system.** A reader typing Japanese, Chinese or Korean presses Enter
   * to accept the candidate their input method is offering, and a composer that
   * reads it as send fires off a half-finished word every time. The flag is on
   * the event for exactly this and costs one condition.
   */
  private readonly handleKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' || this.submitOn !== 'enter') {
      return
    }
    if (event.shiftKey || event.isComposing) {
      return
    }
    event.preventDefault()
    this.send()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-chat-composer': HelixHeadlessChatComposer
  }
}
