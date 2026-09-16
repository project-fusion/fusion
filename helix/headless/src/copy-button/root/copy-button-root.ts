import { CopyController, customElement } from '@fusion.dev/helix-core'
import { check, copy } from '@fusion.dev/helix-icons'
import { nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
import { HelixHeadlessIconButton } from '../../icon-button/root/icon-button-root.js'
import '../../tooltip/index.js'

/** How long the confirmation stands before the button goes back to itself. */
const CONFIRM = 1600

/**
 * @summary A button that puts a string on the clipboard and says it did.
 *
 * @description
 * **The confirmation is the component.** Writing to the clipboard is three
 * lines; what makes this worth an element is that the platform gives a reader
 * no feedback at all, so a press that copies looks identical to one that
 * failed.
 *
 * **Announced after the write, never before.** A clipboard write is a
 * permission the browser may refuse, for real reasons: an insecure origin, a
 * document that is not focused, a gesture that did not qualify. The
 * confirmation and the event both wait for the promise, and a refusal leaves
 * the button exactly as it was.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Copy, Copy to clipboard
 * @documentation https://fusion.dev/helix/components/copy-button
 *
 * @slot - The resting icon. Falls back to a clipboard.
 * @slot copied - What replaces it once the write succeeds. Falls back to a check.
 *
 * @event {HelixCopyEvent} helix-copy - Fired after the clipboard write succeeds.
 *
 * @csspart button - The inner button.
 * @csspart mark - The clipboard glyph, and the confirmation that replaces it.
 * @csspart tooltip - The bubble, forwarded from the tooltip inside.
 * @csspart tooltip-arrow - The point, resting against the trigger.
 * @csspart tooltip-arrow-bottom - The point while the bubble is below the button, so on its top edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The point while the bubble is left of the button, so on its right edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The point while the bubble is right of the button, so on its left edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The point while the bubble is above the button, so on its bottom edge, beside `tooltip-arrow`.
 * @csspart tooltip-bottom - The bubble while it is below the button, beside `tooltip`.
 * @csspart tooltip-left - The bubble while it is left of the button, beside `tooltip`.
 * @csspart tooltip-right - The bubble while it is right of the button, beside `tooltip`.
 * @csspart tooltip-top - The bubble while it is above the button, beside `tooltip`.
 */
@customElement('helix-headless-copy-button')
export class HelixHeadlessCopyButton extends HelixHeadlessIconButton {
  /**
   * What it is called, and says, after one.
   *
   * `attribute` written out, because Lit lowercases a property name rather than
   * dash-casing it, and `copiedlabel` is not what anyone would type.
   */
  @property({ attribute: 'copied-label' })
  copiedLabel = 'Copied'

  /**
   * What it is called, and says, before a press.
   *
   * Defaulted rather than left empty. An icon-only control must be named, and
   * the name of this one is not a judgment call: every copy button in the
   * world is called Copy. A consumer with a better word still sets it.
   */
  @property()
  override label = 'Copy'

  /**
   * What goes on the clipboard.
   *
   * **Narrows `Button.value`, which is the submit value, and the two agree.**
   * A copy button is `type="button"` and never submits, so the inherited
   * meaning has nothing to act on; where a consumer changes the type, what it
   * submits is what it copies, which is the reading anybody would expect of one
   * property called `value`. Declared here rather than inherited because the
   * clipboard is what this component is about and its own page should say so.
   */
  @property()
  override value = ''

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
    return this.copied ? this.copiedLabel : this.label
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
  private readonly clipboard = new CopyController(this, { after: CONFIRM })

  private get copied(): boolean {
    return this.clipboard.copied
  }

  private readonly handleCopy = async (): Promise<void> => {
    if (this.isDisabled) {
      return
    }
    await this.clipboard.copy(this.value)
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
    return this.renderTooltip(
      html`<button
      part="button"
      type="button"
      aria-label=${this.says}
      data-copied=${this.copied ? '' : nothing}
      ?disabled=${this.isDisabled}
      @click=${this.handleCopy}
    >
      ${this.renderCopiedIcon()} ${this.renderCopyIcon()}
      </button>`,
    )
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
    return html`<slot ?hidden=${this.copied}>${HelixHeadlessCopyButton.icon(copy)}</slot>`
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
    return html`<${this.tag('tooltip')} content=${this.says} persist
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
