import {
  AriaForwardController,
  customElement,
  drawIcon,
  HelixFormElement,
  holdCaret,
  MixinControllerValue,
  MixinField,
  MixinTokens,
  restoreValue,
} from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** A token that answers a request to go, which is what `Tag` is. */
type DismissibleToken = Element & { dismiss(): boolean }

/** Whether a slotted token can be asked to remove itself. */
const asksToGo = (node: Element | undefined): node is DismissibleToken =>
  typeof (node as Partial<DismissibleToken> | undefined)?.dismiss === 'function'

/**
 * @summary A field that narrows something else, beside what is already narrowing it.
 *
 * @description
 * **The tokens are the consumer's own elements, slotted.** What a filter narrows
 * by belongs to the consumer's model rather than to this element: a facet with a
 * prefix, a saved query, a range. So they are slotted rather than rendered from
 * a list of strings, and removing one is a request this element makes rather
 * than a change it applies. Combobox is the other way round, and that is the
 * difference between the two: its tokens are a view of a selection it owns,
 * drawn from options it was handed.
 *
 * **`value` is the text being typed, not the tokens**, which is what makes this
 * a field a consumer can listen to. Every keystroke announces `input` with the
 * text on the element, so a table narrows as the reader types. The tokens need
 * no reporting back, being markup the consumer already holds.
 *
 * Backspace on an empty field asks the last token to go, through the same
 * `helix-dismiss` its own remove control fires, so a consumer who handled the
 * pointer has already handled the keyboard.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases SearchField, FacetInput, TokenInput
 * @documentation https://helix.fusion.dev/components/filter-input
 *
 * @slot end - After the text, for a count or a control.
 * @slot start - Before the text, for a search icon.
 * @slot tags - What is already narrowing the results, as `Tag`s.
 *
 * @event {Event} change - Relayed from the input once the reader has finished.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired as the text changes, and cancelable.
 * @event {Event} input - Announced once the text has moved.
 *
 * @csspart clear - The button that empties the field.
 * @csspart control - The input itself.
 * @csspart feedback - What is wrong with it.
 * @csspart field - The box holding everything.
 * @csspart hint - Help under the field, while nothing is wrong.
 * @csspart label - The question, over the field.
 * @csspart rest - How many tokens did not fit. A `<button>` with `expandable`, a `<span>` without it.
 * @csspart tags - The row the tokens sit in.
 */
@customElement('helix-headless-filter-input')
export class HelixHeadlessFilterInput extends MixinTokens(
  MixinControllerValue(MixinField(HelixFormElement)),
) {
  /* The description names ids in the consumer's tree and the control is in this
     shadow root, so it is carried down as an element. See `Input`. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.renderRoot?.querySelector<HTMLElement>('[part="control"]') ?? null,
  })

  /** Typed, so every keystroke is announced. See `announcesInput`. */
  protected override readonly announcesInput = true

  /**
   * Whether the field offers a button that empties it.
   *
   * The text only. The tokens are the consumer's markup and this element is not
   * entitled to take them out of the document, which is the same reason
   * `hideOverflow` marks the ones over the cap `hidden` rather than removing
   * them.
   */
  @property({ type: Boolean })
  clearable = false

  /**
   * What the clear button is called, since an icon has no name of its own.
   */
  @property({ attribute: 'clear-label' })
  clearLabel = 'Clear'

  /**
   * Shown while the field is empty.
   *
   * Not a label: it goes when typing starts.
   */
  @property()
  placeholder = ''

  /** How many tokens did not fit, which is what the row's count renders. */
  @state()
  private over = 0

  /**
   * The caret, held across a value the consumer wrote rather than the reader.
   *
   * Set in `willUpdate` and spent in `updated`, because Lit's `.value` binding
   * lands between the two and takes the selection with it. See `holdCaret`.
   */
  private releaseCaret: (() => void) | undefined

  /** Focus is delegated to the input, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  private get control(): HTMLInputElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>('[part="control"]')
  }

  private get tokens(): HTMLSlotElement | null {
    return this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="tags"]') ?? null
  }

  /** Whether there is a clear button on screen right now. */
  private get showsClear(): boolean {
    return this.clearable && this.value !== '' && !this.isDisabled
  }

  /**
   * Every keystroke, cancelable, and put back where it is refused.
   *
   * Stopped for the reason `Input` gives: `input` is composed, so the inner
   * control's own would arrive beside the one the mixin announces and a consumer
   * would hear one keystroke twice, once carrying the value from before it.
   */
  private readonly handleInput = (event: Event): void => {
    event.stopPropagation()
    const control = event.target as HTMLInputElement
    this.requestValue(control.value)
    restoreValue(control, this.value)
  }

  /** Relayed, because `change` does not cross a shadow boundary on its own. */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: false }))
  }

  /**
   * Empties the text and gives the caret back.
   *
   * Focus returns to the input rather than staying on a button that is about to
   * disappear, which would otherwise land on the body.
   */
  private readonly handleClear = (): void => {
    this.requestValue('')
    const control = this.control
    if (control) {
      restoreValue(control, this.value)
      control.focus()
    }
  }

  /* `value` rather than the control's own text, which is what the mixin's note
     about passing `typed` is for: here the two agree, and saying which one is
     meant keeps it true if that ever stops being so. */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    this.tokenKeydown(event, this.value)
  }

  /** The row again, whenever what is in it changes. */
  private readonly handleTokens = (): void => {
    this.over = this.hideOverflow(this.tokens)
  }

  /**
   * Asks the last token to go, rather than taking it.
   *
   * `dismiss()` is the tag's own, so this is the code path its remove control
   * already runs on a press: the consumer hears one `helix-dismiss`, cancels it
   * or removes the element, and never learns which of the two asked. A slotted
   * node that is not a `Tag` has no such method and is left alone, because
   * hiding a consumer's element on Backspace would be this element deciding
   * something it was never given.
   */
  protected override removeLastToken(): void {
    const last = this.tokens?.assignedElements({ flatten: true }).at(-1)
    if (asksToGo(last)) {
      last.dismiss()
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Never before the first update, which is the one the server does: there is
       no render root to query there. See `Input`. */
    if (!this.hasUpdated) {
      return
    }
    const control = this.control
    if (changed.has('value') && control && this.shadowRoot?.activeElement === control) {
      this.releaseCaret = holdCaret(control)
    }
    /* **The row is settled before this render, not after it.** `slotchange`
       reports the assignment moving and nothing else, so a cap that changed
       would otherwise leave the count saying what the old one allowed. Doing it
       here puts the new number in the render already under way; doing it in
       `updated` would need a second one, and a consumer who awaited
       `updateComplete` would read the count from before the change. */
    this.handleTokens()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* The first assignment, which `willUpdate` could not see: there was no
       render root to query until this render made one. */
    this.handleTokens()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.releaseCaret?.()
    this.releaseCaret = undefined
    this.internals.setFormValue(this.value)
  }

  /** Puts the caret in the field, the way a label pointing at one would. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  protected override render(): TemplateResult {
    /* The row is always rendered, unlike Combobox's, because a slot that is not
       in the tree assigns nothing: guarding it on a count would mean the count
       could never leave zero. It costs no box either way, `[part="tags"]` being
       `display: contents` with an empty slot inside it. */
    return html`${this.renderLabel()}
    <div part="field">
      <slot name="start"></slot>
      ${this.renderTokenRow(
        html`<slot name="tags" @slotchange=${this.handleTokens}></slot>`,
        this.over,
      )}
      <input
        part="control"
        id="control"
        type="text"
        .value=${this.value}
        name=${this.name || nothing}
        placeholder=${this.placeholder || nothing}
        aria-describedby=${this.describedBy ?? nothing}
        ?disabled=${this.isDisabled}
        ?required=${this.required}
        @input=${this.handleInput}
        @change=${this.handleChange}
        @keydown=${this.handleKeydown}
      />
      <slot name="end"></slot>
      ${
        this.showsClear
          ? html`<button
              part="clear"
              type="button"
              aria-label=${this.clearLabel}
              @click=${this.handleClear}
            >
              ${drawIcon(x)}
            </button>`
          : nothing
      }
    </div>
    ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-filter-input': HelixHeadlessFilterInput
  }
}
