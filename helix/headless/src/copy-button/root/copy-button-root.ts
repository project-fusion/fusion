import {
  CopyController,
  customElement,
  HelixCopyErrorEvent,
  type Placement,
  words,
} from '@fusion.dev/helix-core'
import { check, copy, x } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
import { HelixHeadlessIconButton } from '../../icon-button/root/icon-button-root.js'
import { readFrom } from '../from.js'
import '../../tooltip/index.js'

/**
 * @summary A button that copies a string to the clipboard and confirms the copy.
 *
 * @description
 * Copies text to the clipboard and confirms the copy. The platform gives no
 * feedback for a clipboard write, so without a confirmation a press that copies
 * looks the same as one that fails.
 *
 * The confirmation and the event wait for the write to finish. The browser can
 * refuse a clipboard write, for example on an insecure origin, in a document
 * that is not focused, or after a gesture that does not qualify. A refused
 * write, or nothing to copy, names the button with `error-label` for the same
 * moment a copy shows `copied-label`, draws a cross, and sends
 * `helix-copy-error`.
 *
 * `from` copies from another element on the page: its text, an attribute
 * written `id[attribute]`, or a property written `id.property`, read at the
 * press. It takes the place of `value`.
 *
 * It replaces Button's render and its press, so it never submits a form or
 * sends a command: `type`, `command`, `commandfor` and the `form*` overrides
 * have no effect, and the `start` and `end` slots and the `text` part are not
 * rendered. An `aria-label` on the element names it before a copy, in place of
 * `label`.
 *
 * **Keyboard.** Enter and Space copy, as they press a native button.
 *
 * The button is named `label`, or the host's `aria-label`, and its name
 * changes to `copied-label` or `error-label` for the moment after a press. The
 * same words are said in a live region, so a screen reader hears the result,
 * and the tooltip shows them. The tooltip does not also describe the button,
 * since its words are the button's name.
 *
 * **The tooltip.** It shows the name on hover and focus and the result after a
 * press. `tooltip="copy"` shows it only for the result, and `tooltip="none"`
 * draws none, as Web Awesome's copy button offers. `tooltip-placement` is the
 * side it prefers, and it moves to another side where that one does not fit.
 *
 * **Words on the button.** `show-label` draws the name beside the icon, and
 * the result in its place after a press. The button is as wide as the longest
 * of the three, so a press does not resize it.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Copy, Copy to clipboard
 * @documentation https://fusion.dev/helix/components/copy-button
 *
 * @slot - The icon shown before a copy. Defaults to a clipboard.
 * @slot copied - The icon shown after a successful copy. Defaults to a check mark.
 * @slot failed - The icon shown after a copy that put nothing on the clipboard. Defaults to a cross.
 *
 * @event {HelixCopyEvent} helix-copy - Fired after the clipboard write succeeds.
 * @event {HelixCopyErrorEvent} helix-copy-error - Fired when a press put nothing on the clipboard: the browser did not allow the write, or there was nothing to copy.
 *
 * @csspart button - The inner button.
 * @csspart live - The live region that says `copied-label` or `error-label` after a press, and `pending-label` when the button becomes pending under focus. It is rendered from the first time it says anything.
 * @csspart mark - The clipboard icon, and the confirmation icon that replaces it.
 * @csspart spinner - The ring a pending button turns, an empty element the styled button draws over the icon. It is rendered only while the button is pending.
 * @csspart text - The words beside the icon, under `show-label`. It holds all three, `label`, `copied-label` and `error-label`, with all but the current one hidden.
 * @csspart tooltip - The tooltip bubble, forwarded from the tooltip inside the button.
 * @csspart tooltip-arrow - The tooltip's arrow, which points at the button.
 * @csspart tooltip-arrow-bottom - The arrow while the bubble is below the button, on the bubble's top edge. Set together with `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The arrow while the bubble is left of the button, on the bubble's right edge. Set together with `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The arrow while the bubble is right of the button, on the bubble's left edge. Set together with `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The arrow while the bubble is above the button, on the bubble's bottom edge. Set together with `tooltip-arrow`.
 * @csspart tooltip-bottom - The bubble while it is below the button. Set together with `tooltip`.
 * @csspart tooltip-left - The bubble while it is left of the button. Set together with `tooltip`.
 * @csspart tooltip-right - The bubble while it is right of the button. Set together with `tooltip`.
 * @csspart tooltip-top - The bubble while it is above the button. Set together with `tooltip`.
 *
 * @cssstate copied - The moment after a successful copy, while `copied-label` names the button.
 * @cssstate failed - The moment after a press that put nothing on the clipboard, while `error-label` names the button.
 *
 * @withheld slot end - Button's, which this does not render.
 * @withheld slot start - Button's, which this does not render.
 */
@customElement('helix-headless-copy-button')
export class HelixHeadlessCopyButton extends HelixHeadlessIconButton {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-copy-button': { copiedLabel: 'Kopiert' } })`.
   */
  static override words = 'helix-copy-button'

  /**
   * The button's name and tooltip text after a copy.
   *
   * `attribute` written out, because Lit lowercases a property name rather than
   * dash-casing it, and `copiedlabel` is not what anyone would type.
   */
  @words
  @property({ attribute: 'copied-label' })
  copiedLabel = 'Copied'

  /**
   * The button's name and tooltip text after a press that put nothing on the
   * clipboard.
   */
  @words
  @property({ attribute: 'error-label' })
  errorLabel = 'Could not copy'

  /**
   * How long the confirmation or the failure stands, in milliseconds, before
   * the button goes back to `label`.
   */
  @property({ attribute: 'feedback-duration', type: Number })
  feedbackDuration = 1600

  /**
   * The element to copy from, by its id: `key` for its text, `key[value]` for
   * an attribute, and `key.value` for a property. Read at the press, and used
   * in place of `value`. An element that is not there copies nothing, which is
   * a failed copy.
   */
  @property()
  from = ''

  /**
   * The button's name and tooltip text before a copy.
   *
   * Defaulted rather than left empty. An icon-only control must be named, and
   * the name of this one is not a judgment call: every copy button in the
   * world is called Copy. A consumer with a better word still sets it.
   */
  @words
  @property()
  override label = 'Copy'

  /**
   * Draws the name as words beside the icon, and the result in their place
   * after a press. The button stays as wide as the longest of them.
   */
  @property({ attribute: 'show-label', reflect: true, type: Boolean })
  showLabel = false

  /**
   * When the tooltip shows: `full` on hover and focus and after a press,
   * `copy` only after a press, to show the result, and `none` never, for a
   * button whose result shows another way, such as under `show-label`.
   *
   * Unset is `full`, and the attribute stays absent until you write it.
   */
  @property()
  tooltip?: 'copy' | 'full' | 'none'

  /**
   * The side the tooltip prefers. It moves to another side where this one
   * does not fit.
   */
  @property({ attribute: 'tooltip-placement' })
  tooltipPlacement: Placement = 'top'

  /**
   * The text copied to the clipboard.
   *
   * It replaces `Button.value`, the submit value: a copy button never submits,
   * whatever its `type`. Declared here so its own page says what it holds.
   */
  @property()
  override value = ''

  /* **Button's own members, which a copy button never uses.** A press copies
     and does nothing else: no command is sent, no form is submitted or reset,
     and nothing is disclosed. Each is declared `@internal` so the manifest
     leaves it off this element's page. `declare` writes no field, so the
     member Button defines is still the one at runtime. */

  /** @internal A copy button sends no command. */
  declare command: string

  /** @internal A copy button sends no command. */
  declare commandFor: string

  /** @internal A copy button discloses nothing. */
  declare expanded?: boolean

  /** @internal A copy button submits no form. */
  declare formAction: string

  /** @internal A copy button submits no form. */
  declare formEnctype: string

  /** @internal A copy button submits no form. */
  declare formMethod: string

  /** @internal A copy button submits no form. */
  declare formNoValidate: boolean

  /** @internal A copy button submits no form. */
  declare formTarget: string

  /** @internal A copy button opens nothing. */
  declare popup?: 'dialog' | 'grid' | 'listbox' | 'menu' | 'tree'

  /** @internal A copy button never submits or resets, whatever its `type`. */
  declare type: 'button' | 'submit' | 'reset'

  /**
   * The words for the state it is in, used twice on purpose.
   *
   * The tooltip is the visible confirmation and the accessible name is the
   * spoken one, and they have to be the same words. A tooltip that changes to
   * Copied while the accessible name stays Copy tells a sighted reader it
   * worked and leaves a screen reader user pressing a button that never
   * acknowledges anything. Changing the name of the focused element is what
   * makes the announcement happen at all.
   */
  private get says(): string {
    if (this.failed) {
      return this.errorLabel
    }
    return this.copied ? this.copiedLabel : this.namedBy || this.label
  }

  /**
   * @internal The host's `aria-label`, observed so a new one renders, as
   * `MixinField` observes it. Not reflected: the attribute is the consumer's.
   */
  @property({ attribute: 'aria-label' })
  protected namedBy: string | null = null

  /**
   * @internal The name is written here, from `aria-label` too, so it can
   * change to `copiedLabel`: carried down as well, a host `aria-label` would
   * cover the confirmation.
   */
  protected override get forwardsLabel(): boolean {
    return false
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('copied', this.copied)
    this.toggleState('failed', this.failed)
  }

  /** Whether the last render showed a result, so `tooltip="copy"` opens and closes on the change. */
  private showedResult = false

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const result = this.copied || this.failed
    if (result === this.showedResult) {
      return
    }
    this.showedResult = result
    if (this.tooltip !== 'copy') {
      return
    }
    const tip = this.renderRoot.querySelector<HTMLElement & { hide(): void; show(): void }>(
      '[data-copy-tooltip]',
    )
    if (result) {
      tip?.show()
    } else {
      tip?.hide()
    }
  }

  /** @internal A copy button never submits, so it is no form's default button. */
  protected override get submitsForm(): boolean {
    return false
  }

  /**
   * The write, the confirmation, the timer and the event, all of them shared.
   *
   * **Never reach for `navigator.clipboard.writeText` directly.** It is inert in
   * a sandboxed iframe without `allow-same-origin`, which is the sandbox every
   * example on the docs site runs in, and guarding on the API existing does not
   * help there: the object exists and the write rejects. A copy button that does
   * nothing is indistinguishable from a broken one.
   *
   * The controller carries the `execCommand` fallback, checks the host is still
   * connected after the await (writing is asynchronous, so `hostDisconnected`
   * can run before there is a timer to clear), and registers itself so the timer
   * is released without an override here.
   */
  /* A function, so the controller reads `feedback-duration` at each press. */
  private readonly clipboard = new CopyController(this, { after: () => this.feedbackDuration })

  private get copied(): boolean {
    return this.clipboard.copied
  }

  private get failed(): boolean {
    return this.clipboard.failed
  }

  /** What a press copies: the text `from` names, or `value`. */
  private get text(): string {
    return this.from === '' ? this.value : (readFrom(this.from, this) ?? '')
  }

  private readonly handleCopy = async (event: Event): Promise<void> => {
    if (this.pending) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    if (this.isDisabled) {
      return
    }
    const copying = this.clipboard.copy(this.text)
    this.announcePress(event)
    const wrote = await copying
    if (!this.isConnected) {
      return
    }
    /* Said in the live region as well as by the new name, which a screen reader
       reads only when it reads a name change on the focused button at all. */
    this.sayStatus(wrote ? this.copiedLabel : this.errorLabel)
    if (!wrote) {
      this.dispatchEvent(new HelixCopyErrorEvent())
    }
  }

  /**
   * Both faces, drawn rather than demanded.
   *
   * Slot fallback, which is this library's answer for content a component has a
   * sensible default for: a copy button with no icons is not a copy button, and
   * making every consumer slot the same clipboard is asking them to supply the
   * one thing the component is sure about. Slotting anything replaces it, at
   * assignment time, with no property to set and nothing for the server and the
   * client to disagree about.
   */
  private static icon(glyph: typeof copy): TemplateResult {
    return html`<svg part="mark" fill="currentColor" viewBox=${glyph.viewBox} aria-hidden="true">
      ${unsafeSVG(glyph.content)}
    </svg>`
  }

  protected override render(): TemplateResult {
    /* `tabindex` is carried over from `Button`'s render, which this one
       replaces. A toolbar keeps one tab stop across its children by writing
       `focusable` onto each of them, and it writes onto whatever it holds: a
       copy button that rendered no stop stayed at its own, so a row containing
       one had two places the keyboard could land and the arrow keys moved
       between the others. Nothing said so, the property reading back false
       either way.

       The rest of what `Button` renders is deliberately not carried over.
       `aria-expanded` describes a disclosure and this is not one, and `command`
       is sent from a click handler this component replaces with the copy. */
    return html`${this.renderTooltip(
      html`<button
      part="button"
      type="button"
      aria-busy=${this.pending ? 'true' : nothing}
      aria-disabled=${this.pending ? 'true' : nothing}
      aria-label=${this.says}
      data-copied=${this.copied ? '' : nothing}
      data-failed=${this.failed ? '' : nothing}
      tabindex=${this.focusable ? nothing : '-1'}
      ?disabled=${this.isDisabled}
      @click=${this.handleCopy}
      @keydown=${this.notePress}
      @pointerdown=${this.notePress}
    >
      ${this.renderCopiedIcon()} ${this.renderFailedIcon()} ${this.renderCopyIcon()}${this.renderSpinner()}${this.renderText()}
      </button>`,
    )}${this.renderLive()}`
  }

  /**
   * The mark for the resting state, behind a seam a tier can move.
   *
   * Two seams and not one taking the state, because the two marks are two
   * decisions: a tier changing the clipboard for a house glyph has no reason to
   * touch the confirmation, and the stylesheet already treats them separately,
   * the check holding its green through a hover where this one does not.
   */
  protected renderCopyIcon(): TemplateResult {
    return html`<slot ?hidden=${this.copied || this.failed}
      >${HelixHeadlessCopyButton.icon(copy)}</slot
    >`
  }

  /**
   * The mark for the moment after a press, behind a seam of its own.
   *
   * Both slots render and CSS shows one, which is why this is a slot rather
   * than a branch: swapping which slot exists would unassign the consumer's
   * content on every press, and an element that leaves and re-enters the tree
   * loses focus with it, so the button a reader just pressed would stop being
   * the focused element mid-press.
   */
  protected renderCopiedIcon(): TemplateResult {
    return html`<slot name="copied" ?hidden=${!this.copied}
      >${HelixHeadlessCopyButton.icon(check)}</slot
    >`
  }

  /** The mark for a press that put nothing on the clipboard, behind a seam of its own. */
  protected renderFailedIcon(): TemplateResult {
    return html`<slot name="failed" ?hidden=${!this.failed}
      >${HelixHeadlessCopyButton.icon(x)}</slot
    >`
  }

  /**
   * The words beside the icon, under `show-label`, behind a seam of its own.
   *
   * All three are drawn and only the current one shows, so the button is as
   * wide as the longest of them and a press does not resize it. Hidden from a
   * screen reader, which hears the same words as the button's name.
   */
  protected renderText(): TemplateResult | typeof nothing {
    if (!this.showLabel) {
      return nothing
    }
    const resting = !this.copied && !this.failed
    return html`<span part="text" aria-hidden="true"
      ><span ?hidden=${!resting}>${this.namedBy || this.label}</span
      ><span ?hidden=${!this.copied}>${this.copiedLabel}</span
      ><span ?hidden=${!this.failed}>${this.errorLabel}</span
    ></span>`
  }

  /**
   * The bubble the control sits inside, behind a seam.
   *
   * It takes the control rather than rendering it, because this one wraps: a
   * tier above overriding it can drop the tooltip entirely and return the
   * button, put something else around it, or keep the tooltip and change only
   * how it is anchored, and every one of those is a normal thing to want.
   * Rendering the button here as well would make all three a rewrite.
   */
  protected renderTooltip(control: TemplateResult): TemplateResult {
    /* `persist`, because this bubble is the confirmation rather than a hint
       about it. Without it the tooltip hid on the same click that swapped its
       content to Copied, so the words this component takes such care over were
       written and then taken off screen in the same frame. */
    if (this.tooltip === 'none') {
      return control
    }
    /* Under `copy` the bubble has no words at rest, so hover and focus have
       nothing to show, and `updated` opens it on a result. */
    const content = this.tooltip === 'copy' && !this.copied && !this.failed ? '' : this.says
    return html`<${this.tag('tooltip')} content=${content} persist
    data-copy-tooltip placement=${this.tooltipPlacement}
    exportparts="arrow: tooltip-arrow, arrow-bottom: tooltip-arrow-bottom,
      arrow-left: tooltip-arrow-left, arrow-right: tooltip-arrow-right,
      arrow-top: tooltip-arrow-top, tooltip, tooltip-bottom, tooltip-left, tooltip-right,
      tooltip-top">
      ${control}
    </${this.tag('tooltip')}>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-copy-button': HelixHeadlessCopyButton
  }
}
