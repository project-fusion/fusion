import { customElement, HelixElement, HelixSelectEvent, plainClick } from '@fusion.dev/helix-core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** The values `current` takes, which are `aria-current`'s. */
export type NavigationItemCurrent = 'date' | 'location' | 'page' | 'step' | 'time' | 'true'

/**
 * @summary One destination of a navigation, a link that can be marked current.
 *
 * @description
 * Draws a link to `href` in its shadow root, so a page that shares its code
 * with a phone app writes no anchor of its own. A `Navigation` reads it as a
 * destination, as it reads a link you slot yourself: its marker moves to the
 * item marked `current`, and its arrow keys move to the link.
 *
 * `current` is `aria-current` on the link, with its values: `page` for the
 * page the reader is on, and `location` for the section in view on a page of
 * sections. A bare `current` is `true`. Write it on the item the page is on,
 * and move it as the page changes: the marker follows it.
 *
 * A router cannot reach an anchor inside a shadow root, so a plain press on
 * the link sends `helix-select` with the `href` as its value first, and
 * canceling it keeps the browser from following, so a client-side router
 * follows it instead, as a `Breadcrumb` does. A press with a modifier opens
 * the link where the browser opens it and sends nothing.
 *
 * Without `href`, the item draws its words in a `<span>`, with no link.
 *
 * @since 0.224.0
 * @status experimental
 * @category navigation
 * @aliases NavItem, NavLink
 * @documentation https://fusion.dev/helix/components/navigation
 *
 * @slot - The destination's name.
 *
 * @event {HelixSelectEvent} helix-select - A plain press on the link, with its `href` as the value, before the browser follows it. Cancelable: cancel it to keep the browser from following, as a client-side router does.
 *
 * @csspart link - The destination, an `<a>` where `href` is set and a `<span>` where it is not.
 */
@customElement('helix-headless-navigation-item')
export class HelixHeadlessNavigationItem extends HelixElement {
  /** Focus goes to the link inside, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    delegatesFocus: true,
  }

  /**
   * Marks the destination the reader is on: `page` for the page they are
   * reading, and `location`, `step`, `date` or `time` for those. A bare
   * `current` is `true`, and `false` is not current. It is `aria-current` on
   * the link.
   *
   * Reflected, so a `Navigation` around the item hears the page move it, as
   * it hears `aria-current` move on a link of your own.
   */
  @property({
    converter: {
      fromAttribute: (value: string | null): NavigationItemCurrent | undefined =>
        value === null || value === 'false'
          ? undefined
          : ((value || 'true') as NavigationItemCurrent),
    },
    reflect: true,
  })
  current?: NavigationItemCurrent

  /**
   * The URL the destination links to. Leave it empty for an item that is no
   * link.
   *
   * Empty rather than optional, as a list row's is: an empty `href` written
   * onto every item would be a link to the current page on each.
   */
  @property()
  href = ''

  /**
   * The link's `rel` value, which describes how the linked page relates to
   * this one.
   */
  @property()
  rel = ''

  /**
   * Where the link opens. Use it for a destination that leaves the site.
   */
  @property()
  target = ''

  /**
   * @internal The control a `Navigation`'s arrow keys move to: the link, or
   * the words where the item is no link.
   */
  get navigationControl(): HTMLElement | undefined {
    return this.partNamed('link') ?? undefined
  }

  /**
   * Sends `helix-select` for a plain press on the link, and keeps the browser
   * from following where it was canceled.
   */
  private readonly handleClick = (event: MouseEvent): void => {
    if (!plainClick(event)) {
      return
    }
    if (!this.dispatchEvent(new HelixSelectEvent({ value: this.href }))) {
      event.preventDefault()
    }
  }

  protected override render(): TemplateResult {
    if (this.href === '') {
      return html`<span part="link" aria-current=${this.current ?? nothing}><slot></slot></span>`
    }
    return html`<a
      part="link"
      href=${this.href}
      aria-current=${this.current ?? nothing}
      rel=${this.rel || nothing}
      target=${this.target || nothing}
      @click=${this.handleClick}
      ><slot></slot
    ></a>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-navigation-item': HelixHeadlessNavigationItem
  }
}
