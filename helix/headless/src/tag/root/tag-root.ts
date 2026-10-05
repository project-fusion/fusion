import { customElement, HelixElement, MixinDismissible, slottedWords } from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary A short label that adds metadata to content.
 *
 * @description
 * A label that people can optionally remove. `dismissible` is the difference
 * from a badge: a badge shows a state that people cannot change, and a tag
 * names something they can remove.
 *
 * The remove button sends `helix-dismiss`. The tag does not remove itself,
 * because your code owns the list it is in, so remove it in your handler. A
 * listener can cancel `helix-dismiss`, and `dismiss()` then returns `false`.
 * When the handler removes a tag whose remove button has focus, focus moves to
 * the next tag's remove button, or to the previous one's after the last tag.
 *
 * The remove button is named for its tag, such as "Remove Apple", so a list of
 * buttons says which tag each one removes. Write `{label}` in `dismiss-label`
 * to put the tag's words somewhere else, such as `dismiss-label="{label}
 * entfernen"`.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Chip, Pill, Label
 * @documentation https://fusion.dev/helix/components/tag
 *
 * @slot - The tag's label.
 * @slot start - The category the label belongs to, shown before it in a heavier weight.
 *
 * @event {HelixDismissEvent} helix-dismiss - The remove button was pressed. The tag does not remove itself, so remove it in response. Cancelable.
 *
 * @csspart dismiss - The button that removes the tag.
 * @csspart dismiss-mark - The icon on the remove button.
 * @csspart label - The label, which the styled tag trims to its capitals and baseline so the letters sit at the middle in any font.
 * @csspart start - The category before the label.
 */
@customElement('helix-headless-tag')
export class HelixHeadlessTag extends MixinDismissible(HelixElement) {
  /* "Remove" rather than the mixin's "Dismiss". A tag is taken out of a set,
     which is a different act from closing a message, and the control's name is
     what a screen-reader user hears. */
  override dismissLabel = 'Remove'

  /**
   * The remove button's name: `dismissLabel` with the tag's own words.
   *
   * **Named for its tag**, because a set of tags each named "Remove" is a list
   * of buttons that says nothing about which tag each one takes away. The
   * words are the tag's slotted text, its category first, and `{label}` in
   * `dismissLabel` says where they go. Without it they follow the verb, unless
   * the label already holds them, which is what a page naming each button by
   * hand wrote.
   *
   * Read from the children, so empty on a server and while hydrating, where
   * the name is the verb alone until the update after.
   */
  private get removeName(): string {
    const words = this.childrenKnown ? slottedWords(this, ['start', '']) : ''
    if (this.dismissLabel.includes('{label}')) {
      return this.dismissLabel.replace('{label}', words).trim()
    }
    return words === '' || this.dismissLabel.includes(words)
      ? this.dismissLabel
      : `${this.dismissLabel} ${words}`
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* On the root, so the template the server spec reads is unchanged: a
       `slotchange` bubbles to it from either slot, and new words rename the
       button. */
    this.renderRoot.addEventListener('slotchange', () => this.requestUpdate())
    this.finishHydration()
  }

  protected override render(): TemplateResult {
    return html`<slot name="start" part="start"></slot>
      <slot part="label"></slot>
      ${
        this.dismissible
          ? html`<button
            part="dismiss"
            type="button"
            aria-label=${this.removeName}
            @click=${() => this.dismiss()}
          >
            <svg part="dismiss-mark" fill="currentColor" viewBox=${x.viewBox} aria-hidden="true">
              ${unsafeSVG(x.content)}
            </svg>
          </button>`
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tag': HelixHeadlessTag
  }
}
