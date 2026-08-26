import { customElement, HelixElement, HelixSendEvent, hostAria } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

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
 * @status experimental
 * @category forms
 * @aliases Message box, Prompt input
 * @documentation https://helix.fusion.dev/components/chat
 *
 * @slot start - Before the field: attachments, a model picker.
 * @slot end - After the field, beside the send control.
 *
 * @csspart composer - The whole row.
 * @csspart start - The leading slot's box.
 * @csspart field - The text field.
 * @csspart end - The trailing slot's box.
 * @csspart send - The control that offers the turn.
 *
 * @event {HelixSendEvent} helix-send - Fired when the reader offers their turn, and cancelable.
 */
@customElement('helix-headless-chat-composer')
export class HelixHeadlessChatComposer extends HelixElement {
  /** What the reader has written. Read it, or set it to seed a draft. */
  @property()
  value = ''

  /** Shown in an empty field. */
  @property()
  placeholder = ''

  /**
   * What sends: pressing Enter, or only the control.
   *
   * `enter` is the messaging convention and makes Shift+Enter the line break.
   * `button` is what a composer holding several paragraphs wants, where Enter
   * has to mean a new line and nothing else.
   */
  @property({ attribute: 'submit-on' })
  submitOn: 'button' | 'enter' = 'enter'

  /** Whether the composer refuses input, while a turn is in flight say. */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /** Accessible name for the field. */
  @property()
  label = 'Message'

  /** Label for the control that sends. */
  @property({ attribute: 'send-label' })
  sendLabel = 'Send'

  /** How many rows the field opens at. It grows from there. */
  @property({ type: Number })
  rows = 1

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

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'group' })
  }

  protected override render(): TemplateResult {
    return html`<div part="composer">
      <span part="start"><slot name="start"></slot></span>
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
      <span part="end"><slot name="end"></slot></span>
      <button part="send" type="button" ?disabled=${this.disabled} @click=${this.handleSend}>
        ${this.sendLabel}
      </button>
    </div>`
  }

  private readonly handleInput = (event: Event): void => {
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
