import { customElement, HelixElement, hostAria, slottedWords } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** What a control in the `end` slot can be, which Left and Right move between. */
const CONTROL = 'a[href], button, input, select, textarea, [tabindex]'

/** The values `current` takes, which are `aria-current`'s. */
export type ListItemCurrent = 'date' | 'location' | 'page' | 'step' | 'time' | 'true'

/**
 * @summary One row of a list.
 *
 * @description
 * Provides layout and semantics. The row is a target only when you set `href`.
 *
 * **`href` makes the row a link.** The component wraps the leading content,
 * the label, and the description in an `<a part="link">` inside the row, as
 * `Tree.Item` does. An anchor of your own cannot wrap slots it does not own.
 * With the anchor, the row is a target, Enter follows it, middle click opens a
 * new tab, the status bar shows the destination, and all of it works before
 * JavaScript runs.
 *
 * **The `end` slot sits beside the link, outside it**, so a button or a menu
 * there is a control of its own: a click on it does not follow the link, and
 * its name is not part of the link's.
 *
 * Client-side routing needs your own handling. A router cannot render its
 * anchor inside the shadow root, so to navigate without a page load, intercept
 * the click: the anchor is in `composedPath()`. Handle only a plain primary
 * click, so native gestures keep working.
 *
 * **For a row that holds controls and is not a destination, use
 * `data-list-item`.** With `href` unset, the row is not a link.
 *
 * `current` marks the row a reader is on, such as the page in a list of
 * pages, with `aria-current` on its link, or on the row where it has none.
 *
 * **In a list with `selection-mode`, the row is a row of a grid.** The list
 * gives it its role, its place in the one tab stop and, where the list
 * selects, whether it is selected. Its link leaves the tab order there, and
 * Enter follows it from the row.
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
 * @event {Event} helix-action - The reader pressed Enter on the row, or pressed the row in a list that selects nothing, in a list with `selection-mode`. Read the row from `target`. A row with `href` follows its link instead.
 *
 * @csspart link - The link, when the row has `href`. It holds every region except `end`.
 * @csspart row - The row's layout. It sits inside the host so the host can carry a list marker. In a list with `selection-mode` it is the grid cell that takes focus.
 * @csspart row-current - Added to `row` while the row is `current`.
 *
 * @cssstate selected - The row is selected, in a list that selects.
 */
@customElement('helix-headless-list-item')
export class HelixHeadlessListItem extends HelixElement {
  /**
   * Marks the row a reader is on: `page` for the page they are reading, `step`,
   * `location`, `date` or `time` for those, and written bare for the current
   * one of a set. It is `aria-current` on the row's link, or on the row where
   * it has none.
   *
   * Not reflected, as a state never is. `row-current` is the part a
   * stylesheet draws it from.
   */
  @property({
    converter: {
      fromAttribute: (value: string | null): ListItemCurrent | undefined =>
        value === null || value === 'false' ? undefined : ((value || 'true') as ListItemCurrent),
    },
  })
  current?: ListItemCurrent

  /**
   * Takes the row out of reach in a list with `selection-mode`: the arrow keys
   * pass over it and it cannot be selected or acted on.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether the row holds its list's tab stop.
   *
   * Written by a list with `selection-mode` on every row it holds, and unset
   * otherwise, which is how a row knows it is a row of a grid. No attribute:
   * it is coordination between elements, as `Tag.focusable` is.
   */
  @property({ attribute: false })
  focusable?: boolean | undefined

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
   * Whether the row is selected, in a list that selects.
   *
   * Written by the list from its own `value`, and unset where nothing can be
   * selected, which keeps `aria-selected` off a list that does not select.
   */
  @property({ attribute: false })
  selected?: boolean | undefined

  /**
   * Where the link opens. Use it for a row that leaves the site.
   */
  @property()
  target = ''

  /**
   * What the row stands for in its list's `value`.
   *
   * Absent is the row's own words.
   */
  @property()
  value = ''

  /** The row's words, or none where the children are not known yet. */
  get words(): string {
    return this.childrenKnown ? slottedWords(this, ['']) : ''
  }

  /** Whether a list with `selection-mode` holds this row, which makes it a row of a grid. */
  private get grouped(): boolean {
    return this.focusable !== undefined
  }

  /** @internal The cell a list with `selection-mode` moves focus to. */
  get cell(): HTMLElement | null {
    return this.renderRoot?.querySelector?.<HTMLElement>('[part~="row"]') ?? null
  }

  /**
   * @internal The controls in the `end` slot, in order, which Left and Right
   * move between in a list with `selection-mode`. Disabled ones are passed
   * over.
   */
  get controls(): HTMLElement[] {
    const slot = this.renderRoot?.querySelector?.<HTMLSlotElement>('slot[name="end"]')
    return (slot?.assignedElements({ flatten: true }) ?? [])
      .flatMap((element) => [element, ...element.querySelectorAll('*')])
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement &&
          element.matches(CONTROL) &&
          !element.matches(':disabled'),
      )
  }

  /** Moves focus to the row's cell, in a list with `selection-mode`. */
  focusItem(): void {
    this.cell?.focus()
  }

  /** @internal Follows the row's link, as a press on it would. Called by the list on Enter. */
  follow(): void {
    this.renderRoot?.querySelector<HTMLElement>('[part~="link"]')?.click()
  }

  /* What the list gives the row, said through `ElementInternals` so nothing is
     written onto a host the consumer rendered. In `willUpdate`, which a server
     calls too. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { role: this.grouped ? 'row' : 'listitem' })
    this.internals.ariaSelected = this.selected === undefined ? null : String(this.selected)
    this.internals.ariaDisabled = this.grouped && this.disabled ? 'true' : null
    /* On the link where there is one, which is what a reader lands on, and on
       the row otherwise. */
    this.internals.ariaCurrent =
      this.current !== undefined && this.href === '' ? this.current : null
    this.toggleState('selected', this.selected === true)
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
      <slot name="description"></slot>`
    /* A grid cell only in a list with `selection-mode`, so a row in a plain
       list renders exactly what it did. */
    const role = this.grouped ? 'gridcell' : nothing
    const tabindex = this.grouped ? (this.focusable ? '0' : '-1') : nothing

    /* An anchor where there is somewhere to go, inside the same box either
       way. The host keeps `role="listitem"`, so the link is inside the item:
       an `<a>` carrying `listitem` would be a link that claims to be a list
       entry, and the list would have one fewer entry than it has.

       **`end` is outside the anchor.** It is where a row's own action goes, a
       delete button or a menu, and inside the link it was interactive content
       inside interactive content: the link's name took the button's words and a
       click on the button followed the link. */
    return this.href === ''
      ? html`<div
          part="row${this.current === undefined ? '' : ' row-current'}"
          role=${role}
          tabindex=${tabindex}
        >${content}<slot name="end"></slot></div>`
      : html`<div
          part="row${this.current === undefined ? '' : ' row-current'}"
          role=${role}
          tabindex=${tabindex}
        ><a
          part="link"
          href=${this.href}
          target=${this.target || nothing}
          rel=${this.rel || nothing}
          aria-current=${this.current ?? nothing}
          tabindex=${this.grouped ? '-1' : nothing}
          >${content}</a
        ><slot name="end"></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-list-item': HelixHeadlessListItem
  }
}
