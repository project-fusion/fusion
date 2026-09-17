import {
  customElement,
  HelixElement,
  HelixSendEvent,
  hostAria,
  markRegion,
} from '@fusion.dev/helix-core'
import { arrowElbowDownLeft } from '@fusion.dev/helix-icons'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary Where the reader writes their turn.
 *
 * @description
 * **A separate element because it is separately replaceable.** A consumer with
 * attachments, slash commands or a model picker replaces the composer and keeps
 * the transcript, which is only possible if the two were never one component.
 *
 * **Enter sends and Shift+Enter opens a line, and it is configurable rather than
 * decided.** The convention is near-universal in messaging and near-inverted in
 * anything that is really a document editor, and a component that picks one
 * makes the other consumer reimplement the composer. `submit-on` takes `enter`
 * or `button`, and the second is what a long-form composer wants.
 *
 * The composer clears only when nobody refused the send, because a composer that
 * empties itself and then hears the request failed has thrown away the only copy
 * of what the reader wrote.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Message box, Prompt input
 * @documentation https://fusion.dev/helix/components/chat
 *
 * @slot end - Under the field, beside the send control.
 * @slot start - Under the field, at the leading edge: attachments, a model picker.
 *
 * @event {HelixSendEvent} helix-send - Fired when the reader offers their turn, and cancelable.
 *
 * @csspart composer - The whole composer.
 * @csspart end - The trailing slot's box.
 * @csspart field - The text field.
 * @csspart mark - The glyph inside the send control.
 * @csspart send - The control that offers the turn.
 * @csspart start - The leading slot's box.
 * @csspart tools - The row under the field.
 */
@customElement('helix-headless-chat-composer')
export class HelixHeadlessChatComposer extends HelixElement {
  /**
   * Whether the composer refuses input, while a turn is in flight say.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Accessible name for the field.
   */
  @property()
  label = 'Message'

  /**
   * Shown in an empty field.
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
   * Label for the control that sends.
   */
  @property({ attribute: 'send-label' })
  sendLabel = 'Send'

  /**
   * What sends: pressing Enter, or only the control.
   *
   * `enter` is the messaging convention and makes Shift+Enter the line break.
   * `button` is what a composer holding several paragraphs wants, where Enter
   * has to mean a new line and nothing else.
   */
  @property({ attribute: 'submit-on' })
  submitOn: 'button' | 'enter' = 'enter'

  /**
   * What the reader has written.
   *
   * Read it, or set it to seed a draft.
   */
  @property()
  value = ''

  @state()
  private draft = ''

  /**
   * @internal Read by the transcript to find the composer among its children.
   */
  readonly isChatComposer = true

  /** What is in the field, whoever last wrote it. */
  private get text(): string {
    return this.draft || this.value
  }

  /**
   * Offers what is written, and reports whether it stood.
   *
   * Public because a consumer's own send control is as likely to ask as this
   * element's is, and because a keyboard shortcut somewhere else on the page is
   * a reasonable way to send.
   */
  send(): boolean {
    const value = this.text.trim()
    if (value === '' || this.disabled) {
      return false
    }
    if (!this.dispatchEvent(new HelixSendEvent({ value }))) {
      return false
    }
    /* Cleared only here, after nobody refused. A composer that empties itself
       first and hears about the failure afterwards has thrown away the only copy
       of what the reader wrote. */
    this.draft = ''
    this.value = ''
    return true
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
      ?disabled=${this.disabled}
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
        .value=${this.text}
        aria-label=${this.label}
        placeholder=${this.placeholder}
        rows=${this.rows}
        ?disabled=${this.disabled}
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
   * Records the draft, and stops the textarea speaking in this element's name.
   *
   * **The stop is not incidental.** `input` is composed by specification, so the
   * `<textarea>` in this shadow root sent its own past this host and on through
   * whatever `<helix-chat>` it is slotted into, and neither element declares an
   * `input`: a consumer binding one on either received an undeclared event whose
   * target was a control they cannot reach. What a composer offers is
   * `helix-send`, once, when the reader is done.
   */
  private readonly handleInput = (event: Event): void => {
    event.stopPropagation()
    this.draft = (event.target as HTMLTextAreaElement).value
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
