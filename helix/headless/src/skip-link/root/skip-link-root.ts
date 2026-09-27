import { customElement, elementById, HelixElement } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A link at the start of a page that moves keyboard focus past the
 * header to the main content.
 *
 * @description
 * Without a skip link, keyboard users tab through the whole header on every
 * page before they reach the content. The skip link goes first in the document
 * and points at the content.
 *
 * Pressing it moves focus as well as the scroll position. An in-page link alone
 * scrolls but leaves focus behind, so the next Tab lands in the header. A
 * target that cannot take focus, such as `<main>`, gets `tabindex="-1"` while
 * it has focus, and the attribute is removed when focus leaves.
 *
 * The press is handled in script, so no `#main` is added to the URL and no
 * history entry is created, and a router that reads the hash is not affected.
 * The anchor has a real `href`, so before any script runs it works as a plain
 * link: it scrolls to the target and moves the point the next Tab starts from.
 *
 * The styled tier hides the link until it has focus. On this tier the link is
 * always visible. To hide it yourself, hide `::part(link)` while the host is
 * not `:focus-within`. Do not use `display: none` or `visibility: hidden`,
 * because they also remove the link from the tab order.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Skip navigation, Skip to content
 * @documentation https://fusion.dev/helix/components/skip-link
 *
 * @slot - The link's text. Defaults to `label`.
 *
 * @csspart link - The anchor. It takes the focus.
 */
@customElement('helix-headless-skip-link')
export class HelixHeadlessSkipLink extends HelixElement {
  /** Focus goes to the anchor inside, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    delegatesFocus: true,
  }

  /**
   * The in-page fragment the link moves focus to, such as `#main`.
   *
   * `#main` by default, because that is the id the content region almost always
   * has; a page whose content is somewhere else says so. Anything that is not a
   * fragment naming an element on the page is left to the browser, as a plain
   * link.
   */
  @property()
  href = '#main'

  /**
   * The link's text, when it is plain text.
   *
   * The fallback of the default slot, so slotted content replaces it rather than
   * appearing beside it.
   */
  @property()
  label = 'Skip to content'

  /**
   * The element `href` names, looked up the way the browser would.
   *
   * `orDocument`, which no other caller of `elementById` passes and which that
   * option is written for: a press handled here has to land where following the
   * anchor would, and the platform resolves a fragment against the document
   * whatever tree the anchor is in. A skip link inside an app shell's shadow
   * root pointing at the page's `#main` is the arrangement that needs it.
   *
   * The fragment is decoded first because this is an `href` and not an id.
   */
  private get target(): HTMLElement | null {
    if (!this.href.startsWith('#') || this.href.length < 2) {
      return null
    }
    return elementById(this, decodeURIComponent(this.href.slice(1)), { orDocument: true })
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
