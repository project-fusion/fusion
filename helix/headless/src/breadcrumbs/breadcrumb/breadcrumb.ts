import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { caretRight } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One step in a breadcrumb trail.
 *
 * @description
 * Each crumb renders its separator and sets its list-item role. It hides its
 * own separator with `:host(:first-child)`, so the trail needs no index from
 * the parent.
 *
 * Set `href` to make the whole crumb an anchor, which works with Enter, middle
 * click, and the status bar, and before any JavaScript runs. A router cannot
 * reach an anchor inside a shadow root, so intercept the click for client-side
 * navigation, as with `Tree.Item` and `List.Item`. A trail that collapses also
 * reads `href` to rebuild its hidden crumbs elsewhere.
 *
 * Without `href`, the crumb renders a plain `<span>` around what you slot,
 * including your own anchor.
 *
 * The current page is plain text, and `aria-current="page"` on the host conveys
 * the position.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Crumb
 * @documentation https://fusion.dev/helix/components/breadcrumbs
 *
 * @slot - The step's label. Without an `href`, you can slot your own anchor
 * here. Give it `data-link="quiet"`, because a slotted anchor belongs to the
 * outer tree and the crumb's styles cannot reach it.
 * @slot end - Content after the label and outside the link, such as a switcher's
 * menu trigger, a count, or a mark. It can hold a control, and it is not read as
 * part of the link's accessible name.
 * @slot separator - Replaces the chevron shown before this item.
 * @slot start - Content before the label, such as an icon.
 *
 * @csspart link - The crumb itself, which is an `<a>` where `href` is set.
 * @csspart separator - The separator preceding the item.
 * @csspart separator-mark - The chevron between crumbs, shown when no separator is slotted.
 */
@customElement('helix-headless-breadcrumb')
export class HelixHeadlessBreadcrumb extends HelixElement {
  /**
   * Marks this item as the page you are on.
   */
  @property({ reflect: true, type: Boolean })
  current = false

  /**
   * The URL the crumb links to. The current page has none.
   *
   * **Optional and reflected, because a stylesheet does select on it.** A sheet
   * writes `:host(:not([href])) [part="link"]` to take the block padding off a
   * crumb that is not a link, so the attribute is what decides how tall a crumb
   * is. Unreflected, an `href` set from script reached the property, rendered
   * the anchor, and left the host looking unlinked: the crumb drew at 20px
   * where a markup twin drew at 28.
   *
   * Optional rather than defaulted, which is the general rule that a reflected
   * property takes no default: an `href` written onto every host would be a link
   * to the current page on every crumb nobody asked to be one.
   *
   * Reading cannot catch this and the picture comparison can. React assigns a
   * matching property instead of an attribute, so every crumb in the React twin
   * of `breadcrumbs/links` lost its padding at once.
   */
  @property({ reflect: true })
  href?: string

  /**
   * The link's `rel` value, which describes how the linked page relates to this
   * one.
   *
   * The consumer's decision.
   */
  @property()
  rel = ''

  /**
   * Where the link opens. Use it for a crumb that leaves the site.
   */
  @property()
  target = ''

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, because the item is an `<ol>` child in the flat tree and the
    // role has to be there for the list to have items. In `willUpdate` rather
    // than `connectedCallback`, which the server never calls.
    hostAria(this.internals, { role: 'listitem' })
    this.internals.ariaCurrent = this.current ? 'page' : null
  }

  /**
   * The mark between one crumb and the next.
   *
   * The chevron is the slot's own fallback, so replacing it is a matter of
   * filling the slot and costs the consumer no way to opt out of the default.
   * The seam answers the other half: a tier drawing its own separator gets it
   * without reimplementing the crumb, its link and its current-page branch.
   */
  protected renderSeparator(): TemplateResult {
    return html`<slot name="separator"
      ><svg part="separator-mark" data-mirror fill="currentColor" viewBox=${caretRight.viewBox}>
        ${unsafeSVG(caretRight.content)}
      </svg></slot
    >`
  }

  protected override render(): TemplateResult {
    /* The label and what belongs to it, which is the same content whether or not
       it is a link. Built once so the two branches below cannot drift.

       **`end` is not in here, and that is the whole of what makes a switcher
       possible.** It used to be, so anything slotted after the label rendered
       inside the `<a>`. A count or a mark survives that; a control does not.
       Nesting a button in an anchor is invalid markup, the browser hands the
       press to the link, and the reader gets a target that navigates whichever
       half of it they aimed at.

       Outside, the two halves are two targets: the word goes to its own page and
       whatever sits after it does its own job. It also stops `end` being read
       into the link's accessible name, so a crumb with a count beside it is
       announced as its own name rather than as the name and the number. */
    const label = html`<slot name="start"></slot><slot></slot>`

    /* The current page is text, not a link, whatever it was given, so `current`
       wins over `href` rather than the two contradicting each other in the
       markup. */
    const linked = (this.href ?? '') !== '' && !this.current

    return html`<span part="separator" aria-hidden="true"
        >${this.renderSeparator()}</span
      >${
        linked
          ? html`<a
              part="link"
              href=${this.href ?? ''}
              target=${this.target || nothing}
              rel=${this.rel || nothing}
              >${label}</a
            >`
          : html`<span part="link">${label}</span>`
      }<slot name="end"></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-breadcrumb': HelixHeadlessBreadcrumb
  }
}
