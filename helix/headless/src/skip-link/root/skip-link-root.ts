import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary The first stop on a page, which moves the reader past everything
 * repeated on every page.
 *
 * @description
 * A keyboard reader arriving on a page tabs through the whole header before
 * reaching anything the page is about, and does it again on the next page. This
 * is the control that skips it: first in the document, and pointed at the
 * content.
 *
 * **It moves focus, not only the scroll position.** An in-page link on its own
 * scrolls to its target and leaves focus behind, so the next Tab goes to
 * whatever followed the link, which is the header it was meant to skip. Pressed,
 * this focuses the target. A target that cannot take focus, which is most of
 * them, since `<main>` cannot, is given `tabindex="-1"` for as long as it holds
 * focus and has it taken off again when focus leaves, so the page ends up as the
 * consumer wrote it.
 *
 * **The address is left alone.** The press is handled rather than followed, so
 * no `#main` lands in the URL and no history entry is added, which matters to a
 * router reading the hash. The anchor is still a real anchor with a real
 * `href`, so before any script has run the link does what a plain link does:
 * it scrolls there and moves the point the next Tab starts from.
 *
 * **Hidden until focused is the styled tier's**, being a decision about paint,
 * and on this tier the link is simply a link. A headless consumer hides
 * `::part(link)` while the host is not `:focus-within` and shows it when it is.
 * Hiding with `display: none` or `visibility: hidden` takes it out of the tab
 * order as well, and a skip link nobody can reach is the most common way one is
 * broken.
 *
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @aliases Skip navigation, Skip to content
 * @documentation https://helix.fusion.dev/components/skip-link
 *
 * @csspart link - The anchor, which is what takes focus.
 *
 * @slot - The link's words. Falls back to `label`.
 */
@customElement('helix-headless-skip-link')
export class HelixHeadlessSkipLink extends HelixElement {
  /** Focus goes to the anchor inside, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    delegatesFocus: true,
  }

  /**
   * Where the reader is sent, as an in-page fragment.
   *
   * `#main` by default, because that is the id the content region almost always
   * has; a page whose content is somewhere else says so. Anything that is not a
   * fragment naming an element on the page is left to the browser, as a plain
   * link.
   */
  @property()
  href = '#main'

  /**
   * The link's words, for the common case of plain text.
   *
   * The fallback of the default slot, so slotted content replaces it rather than
   * appearing beside it.
   */
  @property()
  label = 'Skip to content'

  /** The element `href` names, looked up in the tree this link sits in. */
  private get target(): HTMLElement | null {
    if (!this.href.startsWith('#') || this.href.length < 2) {
      return null
    }
    const id = decodeURIComponent(this.href.slice(1))
    const root = this.getRootNode() as Document | ShadowRoot
    return (root.getElementById?.(id) ?? document.getElementById(id)) as HTMLElement | null
  }

  /**
   * Focuses the target, lending it a `tabindex` only if it needs one.
   *
   * Tried without one first, so a target that can already take focus, a heading
   * with its own `tabindex` or a control, is never given an attribute it did
   * not have. The loan is repaid on `blur` rather than on the next press: a
   * `tabindex` left on `<main>` makes every click inside it focus the whole
   * region.
   */
  private readonly skip = (event: MouseEvent): void => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    const target = this.target
    if (!target) {
      return
    }
    event.preventDefault()
    target.focus()
    if ((target.getRootNode() as Document | ShadowRoot).activeElement === target) {
      return
    }
    target.setAttribute('tabindex', '-1')
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true })
    target.focus()
  }

  protected override render(): TemplateResult {
    return html`<a part="link" href=${this.href} @click=${this.skip}><slot>${this.label}</slot></a>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-skip-link': HelixHeadlessSkipLink
  }
}
