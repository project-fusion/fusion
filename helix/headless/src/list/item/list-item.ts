import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One row of a list.
 *
 * @description
 * Provides layout and semantics. The row is a target only when you set `href`.
 *
 * **`href` makes the whole row a link.** The component wraps its own layout in
 * an `<a part="row">`, as `Tree.Item` does. An anchor of your own cannot wrap
 * slots it does not own. With the anchor, the whole row is a target, Enter
 * follows it, middle click opens a new tab, the status bar shows the
 * destination, and all of it works before JavaScript runs.
 *
 * Client-side routing needs your own handling. A router cannot render its
 * anchor inside the shadow root, so to navigate without a page load, intercept
 * the click: the anchor is in `composedPath()`. Handle only a plain primary
 * click, so native gestures keep working.
 *
 * **For a row that holds controls and is not a destination, use
 * `data-list-item`.** With `href` unset, the row is not a link.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Row, Entry
 * @documentation https://fusion.dev/helix/components/list
 *
 * @slot - The label.
 * @slot description - Secondary text under the label.
 * @slot end - Trailing content.
 * @slot start - Leading content, usually an icon or an avatar.
 *
 * @csspart row - The row's layout. It sits inside the host so the host can carry a list marker.
 */
@customElement('helix-headless-list-item')
export class HelixHeadlessListItem extends HelixElement {
  /**
   * The URL the row links to. Leave it empty for a row that is not a link.
   *
   * Empty rather than optional, and unset by default: a list is not always a
   * list of links, and an empty `href` written onto every row would be a link
   * to the current page on every row a consumer never asked to be one.
   */
  @property()
  href = ''

  /**
   * The link's `rel` value. You set it yourself. It is not derived from
   * `target`, for the reason `Tree.Item` gives.
   */
  @property()
  rel = ''

  /**
   * Where the link opens. Use it for a row that leaves the site.
   */
  @property()
  target = ''

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
   * **The box belongs to the styled tier, which is why this returns
   * `nothing`.** Rendering it here puts an unstyled empty box in front of every
   * headless row, and a row styled with `display: flex` and a `gap` draws that
   * gap beside the empty child: measured on this tier's own example, which is
   * exactly such a row, 1384 pixels moved and every label sat half a rem
   * further in.
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

       The host has to be free for `display: list-item`, which is how an ordered
       or unordered list gets its marker: native numbering, native counters,
       native RTL, and nothing written by script or counted on the server. But
       `list-item` cannot combine with `grid`, so a row whose host carried the
       grid lost it the moment the list asked for a marker. Measured before this
       wrapper: a row with a leading icon put the icon 32px in instead of 16 and
       its supporting text beside the label instead of under it. */
    const content = html`${this.renderRail()}<slot name="start"></slot>
      <slot></slot>
      <slot name="description"></slot>
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
