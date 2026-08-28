import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One row of a list.
 *
 * @description
 * Layout and semantics, and deliberately not a target.
 *
 * **`href` makes the row itself the link.** *Corrected 19 Aug 2026.* This said a
 * row could not become one, on the grounds that "a whole-row target needs the
 * anchor to wrap the layout, and the layout is what this component is." That is
 * true of the *consumer's* anchor, which cannot wrap slots it does not own, and
 * it is not true of the component's: an `<a part="row">` wraps this component's
 * own layout perfectly well. `Tree.Item` does exactly that, and the two were
 * refusing and accepting `href` on the same argument.
 *
 * What the anchor buys is what the row could not fake: the whole row is a
 * target, Enter follows it, middle click opens a tab, the status bar shows the
 * destination, and it all works before any JavaScript runs.
 *
 * What it costs is client-side routing, and that is the consumer's to restore.
 * A router renders its own anchor and cannot render one inside this shadow
 * root, so a framework wanting a soft navigation intercepts the click on the
 * way out: the anchor is in `composedPath()`, and taking only a plain primary
 * press leaves every native gesture alone.
 *
 * **`data-list-item` is still the answer for a row that is not a destination.**
 * A list row is often a container of controls rather than a place to go, and a
 * row with `href` unset behaves exactly as it always did.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Row, Entry
 * @documentation https://helix.fusion.dev/components/list
 *
 * @slot - The label.
 * @slot end - Trailing content.
 * @slot start - Leading content, usually an icon or an avatar.
 * @slot supporting - Secondary text under the label.
 *
 * @csspart row - The layout, held off the host so the host can carry a marker.
 */
@customElement('helix-headless-list-item')
export class HelixHeadlessListItem extends HelixElement {
  /**
   * Where the row goes, and nothing when it goes nowhere.
   *
   * Empty rather than optional, and unset by default: a list is not always a
   * list of links, and an empty `href` written onto every row would be a link
   * to the current page on every row a consumer never asked to be one.
   */
  @property()
  href = ''

  /**
   * Where the link opens, for the rare row that leaves the site.
   */
  @property()
  target = ''

  /**
   * What the link declares about where it goes. The consumer's decision rather
   * than one derived from `target`, for the reason `Tree.Item` gives.
   */
  @property()
  rel = ''

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { role: 'listitem' })
  }

  /**
   * The cell before the row's content, which this tier leaves empty.
   *
   * A railed list puts its number at the block's own start edge, in a track of
   * its own ahead of the words, and the native `::marker` cannot reach there:
   * `outside` hangs the marker just clear of the row's content box, which is
   * beside the words rather than at the edge of the block. A number that has to
   * sit in a track has to be a box in that track.
   *
   * **The box belongs to the styled tier, which is why this returns `nothing`.**
   * It was rendered here, on the argument that the template lives here, and that
   * put an unstyled empty box in front of every headless row. A row styled with
   * `display: flex` and a `gap` draws that gap beside the empty child: measured
   * on this tier's own example, which is exactly such a row, 1384 pixels moved
   * and every label sat half a rem further in. It is the fault the styled row's
   * own comment already records about a column gap beside a zero-width column,
   * and the one the toast had before it.
   *
   * A tier that ships no CSS cannot make a box it renders cost nothing, so it
   * does not render one. `marker="rail"` is a styled-tier attribute for the same
   * reason: *that* a list is numbered is a fact about the content and *where the
   * numbers are drawn* is not. A headless consumer wanting a rail writes the
   * cell they were going to style anyway.
   *
   * `protected` rather than `private`, so the tier above can reach it.
   */
  protected renderRail(): TemplateResult | typeof nothing {
    return nothing
  }

  protected override render(): TemplateResult {
    /* One wrapper, and it earns its place rather than breaking the bare-slot
       rule. That rule is about optional *regions*, which generate an empty box
       when nothing fills them; this is a single always-present container whose
       job is to hold the layout somewhere other than the host.
     *
     * The host has to be free for `display: list-item`, which is how an ordered
       or unordered list gets its marker: native numbering, native counters,
       native RTL, and nothing written by script or counted on the server. But
       `list-item` cannot combine with `grid`, so a row whose host carried the
       grid lost it the moment the list asked for a marker. Measured before this
       wrapper: a row with a leading icon put the icon 32px in instead of 16 and
       its supporting text beside the label instead of under it. */
    const content = html`${this.renderRail()}<slot name="start"></slot>
      <slot></slot>
      <slot name="supporting"></slot>
      <slot name="end"></slot>`

    /* An anchor where there is somewhere to go, and the same box either way.
       The host keeps `role="listitem"`, so the row inside it is the link and
       not the item: an `<a>` carrying `listitem` would be a link that claims to
       be a list entry, and the list would have one fewer entry than it has. */
    return this.href === ''
      ? html`<div part="row">${content}</div>`
      : html`<a
          part="row"
          href=${this.href}
          target=${this.target || nothing}
          rel=${this.rel || nothing}
          >${content}</a
        >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-list-item': HelixHeadlessListItem
  }
}
