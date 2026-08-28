import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { caretRight } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One step in a breadcrumb trail.
 *
 * @description
 * Contributes the separator, the list-item role, and the link itself where one
 * is wanted.
 *
 * **`href` makes the crumb the link.** *Added 19 Aug 2026, reversing the note
 * that said an anchor could not be rendered here.* That note was right that a
 * router cannot reach an anchor inside a shadow root, and wrong that this
 * settles it: the consumer restores the soft navigation by intercepting the
 * click on the way out, which is what `Tree.Item` and `List.Item` both do.
 * What the anchor buys is the whole crumb as a target, Enter, middle click, the
 * status bar, and a trail that works before any JavaScript runs.
 *
 * **And the parent needs it.** A trail that collapses has to rebuild its hidden
 * crumbs somewhere else, which means reading each one's destination. From a
 * property that is a read; from a consumer's slotted markup it is a hunt for an
 * anchor and a guess about which element is the link.
 *
 * A crumb with no `href` is unchanged: the consumer slots whatever they like,
 * including their own anchor, and this renders a plain `<span>` around it.
 *
 * Each item renders its own separator and hides it with `:host(:first-child)`,
 * so the trail needs no index and no coordination from the parent. `:host()`
 * takes a structural pseudo-class, unlike `:has()`, which it rejects.
 *
 * The current page is text, not a link. Linking a page to itself is a known
 * screen-reader annoyance, and `aria-current="page"` on the host is what
 * conveys position.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Crumb
 * @documentation https://helix.fusion.dev/components/breadcrumbs
 *
 * @slot - The step's label. Without an `href` this may be the consumer's own
 * anchor, styled with `data-link="quiet"`, since a slotted anchor belongs to the
 * outer tree and cannot be reached from this component's styles.
 * @slot end - After it, for a count or a mark.
 * @slot separator - Replaces the chevron shown before this item.
 * @slot start - Before the label, for an icon.
 *
 * @csspart link - The crumb itself, which is an `<a>` where `href` is set.
 * @csspart separator - The separator preceding the item.
 * @csspart separator-mark - The glyph between this crumb and the next, where none is slotted.
 */
@customElement('helix-headless-breadcrumb')
export class HelixHeadlessBreadcrumb extends HelixElement {
  /**
   * Whether this item is the page the reader is on.
   */
  @property({ reflect: true, type: Boolean })
  current = false

  /**
   * Where the crumb goes, and nothing where it is the current page.
   *
   * **Optional and reflected, because a stylesheet does select on it.**
   * `breadcrumb.css` writes `:host(:not([href])) [part="link"]` to take the
   * block padding off a crumb that is not a link, so the attribute is what
   * decides how tall a crumb is. Unreflected, an `href` set from script reached
   * the property, rendered the anchor, and left the host looking unlinked: the
   * crumb drew at 20px where a markup twin drew at 28.
   *
   * *This said the opposite until 27 Aug 2026*, and named the reason as
   * "nothing selects on it", which was not true when it was written. The
   * paragraph is worth keeping because the rest of it is right and is what makes
   * this optional rather than defaulted: an `href` written onto every host would
   * be a link to the current page on every crumb nobody asked to be one. That is
   * the general rule as well, that a reflected property takes no default, so the
   * two agree.
   *
   * Found by the picture comparison rather than by reading: React assigns a
   * matching property instead of an attribute, so every crumb in the React twin
   * of `breadcrumbs/links` lost its padding at once.
   */
  @property({ reflect: true })
  href?: string

  /**
   * Where the link opens, for the rare crumb that leaves the site.
   */
  @property()
  target = ''

  /**
   * What the link declares about where it goes.
   *
   * The consumer's decision.
   */
  @property()
  rel = ''

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
      ><svg part="separator-mark" fill="currentColor" viewBox=${caretRight.viewBox}>
        ${unsafeSVG(caretRight.content)}
      </svg></slot
    >`
  }

  protected override render(): TemplateResult {
    /* The label and whatever flanks it, which is the same content whether or
       not it is a link. Built once so the two branches below cannot drift. */
    const label = html`<slot name="start"></slot><slot></slot><slot name="end"></slot>`

    /* The current page is text, not a link, whatever it was given: linking a
       page to itself is a known screen-reader annoyance and `aria-current` is
       what conveys position. So `current` wins over `href` rather than the two
       contradicting each other in the markup. */
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
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-breadcrumb': HelixHeadlessBreadcrumb
  }
}
