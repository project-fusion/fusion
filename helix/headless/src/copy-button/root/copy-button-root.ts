import { CopyController, customElement } from '@helix-io/core'
import { check, copy } from '@helix-io/icons'
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
 * no feedback at all. A press that copies and looks identical to a press that
 * failed is a control nobody trusts, so they press it again, and the second
 * press is indistinguishable from the first.
 *
 * **Announced after the write, never before.** A clipboard write is a
 * permission the browser may refuse, and it is refused for real reasons: an
 * insecure origin, a document that is not focused, a user agent that requires a
 * gesture this press did not qualify as. So the confirmation and the event both
 * wait for the promise, and a refusal leaves the button exactly as it was.
 * `HelixCopyEvent` is not cancelable for the same reason: by the time there is
 * anything to say, it has already happened.
 *
 * **An icon button, extending IconButton.** Both of this button's faces are
 * icons and it never carries a word, so it is the square control rather than a
 * text button that happens to hold a glyph: it inherits the square box, and
 * with it the rule that an icon-only control must be named. `label` is not
 * optional here for the same reason it is not optional there, and the two
 * faces make it sharper: the accessible name has to describe the press, not
 * whichever picture is showing when a reader arrives.
 *
 * `data-copied`, not a reflected `copied`. State never reflects here: a
 * serialized `copied` attribute would come back from a paste as a button
 * claiming to have copied something it never held.
 *
 * @since 0.1.0
 * @status experimental
 * @category actions
 * @aliases Copy, Copy to clipboard
 * @documentation https://helix.fusion.dev/components/copy-button
 *
 * @slot - The resting icon. Falls back to a clipboard.
 * @slot copied - What replaces it once the write succeeds. Falls back to a check.
 *
 * @event {HelixCopyEvent} helix-copy - Fired after the clipboard write succeeds.
 *
 * @csspart button - The inner button.
 * @csspart mark - The clipboard glyph, and the confirmation that replaces it.
 * @csspart tooltip - The bubble, forwarded from the tooltip inside.
 */
@customElement('helix-headless-copy-button')
export class HelixHeadlessCopyButton extends HelixHeadlessIconButton {
  /** What goes on the clipboard. */
  @property()
  value = ''

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
   * What it is called, and says, after one.
   *
   * `attribute` written out, because Lit lowercases a property name rather than
   * dash-casing it, and `copiedlabel` is not what anyone would type.
   */
  @property({ attribute: 'copied-label' })
  copiedLabel = 'Copied'

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

  /*
   * Whether the confirmation is showing.
   *
   * `@state`, so it is the component's and not API: a consumer setting this
   * would be claiming a copy happened, which is the one thing this element
   * exists to be honest about.
   */
  /**
   * The write, the confirmation, the timer and the event, all of them shared.
   *
   * **This was a second implementation of `CopyController` with the hard half
   * left out.** It reached straight for `navigator.clipboard.writeText` and had
   * no `execCommand` fallback, so it was inert in a sandboxed iframe without
   * `allow-same-origin`, which is the sandbox every example on the docs site
   * runs in: the guard on the API existing does not help there, because the
   * object exists and the write rejects. A copy button that does nothing is
   * indistinguishable from a broken one, and this one was doing nothing in the
   * one place a reader is most likely to try it.
   *
   * The controller also carries the two things this had wrong on its own terms:
   * it checks the host is still connected after the await, because writing is
   * asynchronous and `hostDisconnected` clears a timer that does not exist yet,
   * and it registers itself so the timer is released without an override here.
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
    return html`<${this.tag('tooltip')} content=${this.says} exportparts="tooltip">
      ${control}
    </${this.tag('tooltip')}>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-copy-button': HelixHeadlessCopyButton
  }
}
