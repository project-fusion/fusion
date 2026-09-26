import {
  customElement,
  HelixElement,
  HelixSelectEvent,
  MixinControllerOpen,
} from '@fusion.dev/helix-core'
import { caretDown } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One node in a tree.
 *
 * @description
 * **`open`, on `MixinControllerOpen`, rather than a bare boolean of its own.**
 * A branch showing its children is the same state a disclosure holds. A
 * hand-written toggle announces nothing, so a consumer could neither know a
 * branch opened nor own the state. `aria-expanded` is still what the row
 * renders: the property differs, not the semantics.
 *
 * An element rather than a slot, because it owns state: whether it is open,
 * selected, and whether it holds focus.
 *
 * A branch is any item with something slotted into `children`, detected on the
 * client because the server cannot inspect children. The server renders the
 * node as a leaf and the twisty appears on hydration, which is the harmless
 * direction.
 *
 * **`href` makes the row itself the link.** With the anchor slotted into the
 * name instead, everything outside the words is dead: no Enter, no middle
 * click, no status bar. Given an `href` the row *is* an `<a>`.
 *
 * @since 0.1.0
 * @status stable
 * @aliases TreeNode, Branch, Leaf
 * @documentation https://fusion.dev/helix/components/tree
 *
 * @slot - The item's label.
 * @slot children - Nested items, which make this a branch.
 * @slot end - Content after the label, at the far side of the row, such as a count or a state.
 * @slot start - Content before the label and after the chevron, such as a mark for the item.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before a branch closes, and cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before a branch opens, and cancelable.
 * @event {HelixSelectEvent} helix-select - Fired when the item is chosen, and cancelable. Canceling it changes nothing.
 * @event {Event} toggle - Sent when the branch opens or closes, with `newState` and `oldState`.
 *
 * @csspart group - The container for nested items.
 * @csspart item - The node, and the focus target unless `href` moves it to the row.
 * @csspart label - The label text.
 * @csspart row - The clickable label row, which is an `<a>` where `href` is set.
 * @csspart toggle - The expand and collapse control.
 *
 * @cssproperty --tree-level - How deep this row sits, counting from one as `aria-level` does, for the indent.
 *
 * @cssstate open - While its children are shown.
 * @cssstate selected - While it is selected.
 */
@customElement('helix-headless-tree-item')
export class HelixHeadlessTreeItem extends MixinControllerOpen(HelixElement) {
  /**
   * The URL this node links to. Setting it makes the row a link.
   *
   * Unset by default, and unreflected: a tree of choosable nodes is not a tree
   * of links, and an empty `href` written onto every row would be a link to the
   * current page on every item a consumer never asked to be one.
   */
  @property()
  href = ''

  /**
   * The node's depth from the root. The tree counts it, so indentation needs no
   * nested CSS.
   *
   * **Read rather than written, and no attribute at all.** The tree counts the
   * items a row sits inside and assigns this on every sync, so a value declared
   * here is overwritten before the first paint: measured at `level="2"` on three
   * rows of a flat list, all three back to 1 with `--tree-level: 1` on every
   * row. It carried an attribute and a shipped example setting it for as long as
   * both existed, which is a depth a consumer could state and nothing would
   * honor. Depth in this tree is where a row is, not what it claims: a branch's
   * children go in its `children` slot, and that nesting is also what decides
   * which rows a shut branch hides and which row the outward arrow moves to.
   *
   * Not reflected either. The tree assigns this after it upgrades, so an
   * attribute here would be a change to markup the consumer rendered and
   * hydration would report it. The indent it drives is written onto the row
   * instead, inside the shadow root, which is not part of the tree React
   * hydrates.
   */
  @property({ attribute: false, type: Number })
  level?: number

  /**
   * The link's `rel` value, which describes how the linked page relates to this
   * one.
   *
   * Set by the consumer rather than derived from `target`: `noreferrer` is a
   * decision about their own analytics and a component should not make it for
   * them. `noopener` is not needed as a default either, since every browser
   * this library supports implies it for `target="_blank"` already.
   */
  @property()
  rel = ''

  /**
   * Whether this item is the current one.
   *
   * Not reflected, for the reason `level` above gives in full: the tree assigns
   * this after it upgrades, so the attribute would be a change to markup the
   * consumer rendered and hydration would report it. Mirroring to
   * `data-selected` on the host instead is the same fault under another name.
   *
   * The stylesheet reads it from the row inside this shadow root, because the
   * row is not part of the tree React hydrates.
   */
  @property({ type: Boolean })
  selected = false

  /**
   * Where the link opens. Use it for a row that leaves the site.
   */
  @property()
  target = ''

  /**
   * Identifies the item to your code. It is sent in `helix-select`.
   */
  @property()
  value = ''

  /**
   * Whether this item holds the tree's single tab stop.
   */
  @state()
  focusable = false

  /**
   * Whether anything is slotted into `children`.
   *
   * Read from the children before each render, so the first one draws the
   * twisty, and from the slot, which is what hears a child arrive later. Not on
   * the server, where `children` is undefined, nor while hydrating what one
   * sent.
   */
  @state()
  private branch = false

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="children"]')
    slot?.addEventListener('slotchange', () => {
      this.branch = slot.assignedElements().length > 0
    })
  }

  /**
   * @internal Whether this row holds children, read by the tree, which moves
   * and opens differently for a branch. Public rather than protected because
   * the tree is another element and there is no other way across; not a
   * consumer's to read, and there is nothing to set: it is what the `children`
   * slot was given, which is the markup they already wrote.
   */
  get isBranch(): boolean {
    return this.branch
  }

  /**
   * Moves focus to this node.
   *
   * Which element that is moves with `href`: the thing carrying `treeitem` is
   * the thing the tree's roving tab stop lives on, and with a link that is the
   * row rather than the wrapper around it.
   */
  focusItem(): void {
    /* `preventScroll`, because the browser's own answer to a focus is to walk
       every scrollable ancestor and reveal the element, which is
       `scrollIntoView` by another route and takes the page with it. The root
       calls `scrollItemIntoView` on the next line precisely to avoid that, and
       without this the careful call arrives after the thing it exists to
       prevent has already happened. */
    this.renderRoot
      .querySelector<HTMLElement>(this.href === '' ? '[part="item"]' : '[part="row"]')
      ?.focus({ preventScroll: true })
  }

  /** Selects this node and sends `helix-select`. */
  select(): void {
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  /**
   * Chooses this node, as a press or Enter does.
   *
   * Selecting and following are two things and this is where they meet, so the
   * pointer and the keyboard take one path to the same end. The tree calls this
   * rather than `select` for the keyboard, or a nav tree whose rows are links
   * could be walked with the arrows and never entered: choosing announces a
   * value and nothing listens for it.
   */
  activate(): void {
    this.select()
    this.follow()
  }

  /**
   * Follows a link slotted into the name, if there is one.
   *
   * A row is wider than the words in it: the indent, the padding, and with the
   * chevron at the far end most of the row's width are all outside the anchor,
   * so a reader who pressed the row anywhere but on the text got nothing. The
   * words are the consumer's own content and this does not rewrite them, so
   * what it does instead is press the link they put there.
   *
   * The consumer's anchor rather than an `href` of this element's own,
   * deliberately: a framework's link component is what carries prefetching and
   * client-side routing, and a plain `<a href>` rendered in here would be a
   * full page load on a site that had neither. A synthetic click is what those
   * components listen for, so both keep working.
   *
   * `querySelector` on the light DOM, not the render root: the link is the
   * consumer's, and it is scoped to this item's own name rather than to the
   * whole subtree, or a branch would follow the first link belonging to one of
   * its children.
   */
  private follow(): void {
    /* Its own row first, where `href` made one. Pressed with a pointer the
       anchor has already navigated and this never runs; from the keyboard it
       has not, because the tree calls `preventDefault` on every key it handles
       and that is what would otherwise swallow Enter on a link. */
    const own = this.renderRoot?.querySelector<HTMLAnchorElement>('a[part="row"]')
    if (own) {
      own.click()
      return
    }
    for (const node of this.children) {
      if (node.slot !== '') {
        continue
      }
      const link =
        node instanceof HTMLAnchorElement ? node : node.querySelector<HTMLAnchorElement>('a[href]')
      if (link) {
        link.click()
        return
      }
    }
  }

  private readonly handleToggleClick = (event: MouseEvent): void => {
    /* Only where the row is a link, and then it has to stop: the row would
       navigate away from the branch the reader was trying to open. Without an
       `href` the whole row toggles, which is what a tree of folders wants, so
       there is nothing here to intercept. */
    event.preventDefault()
    event.stopPropagation()
    this.toggleOpen()
  }

  private readonly handleRowClick = (event: MouseEvent): void => {
    /* A press that landed on a link is that link's, whichever branch of this
       runs, and the test has to be made on both sides. A row can hold a link in
       its `end` slot, and asked on one side only, pressing that link collapses
       the branch on the way out: one press, `open` false and the route
       changed. */
    const onLink = event.composedPath().some((node) => node instanceof HTMLAnchorElement)

    /* A branch that is also a link goes where it points, and its chevron is
       what opens it. A branch that is not toggles from anywhere in the row. */
    if (this.branch && this.href === '') {
      if (!onLink) {
        this.toggleOpen()
      }
      return
    }
    this.select()
    /* Following it here as well would follow it twice and, where a consumer's
       router is listening, route twice. */
    if (!onLink) {
      this.follow()
    }
  }

  /** Everything inside the row, which is the same whichever element it is. */
  private renderRow(): TemplateResult {
    return html`${
      this.branch
        ? html`<svg
            part="toggle"
            fill="currentColor"
            viewBox=${caretDown.viewBox}
            aria-hidden="true"
            @click=${this.href === '' ? nothing : this.handleToggleClick}
          >
          ${unsafeSVG(caretDown.content)}
        </svg>`
        : nothing
    }
      <slot name="start"></slot>
      <span part="label"><slot></slot></span>
      <slot name="end"></slot>`
  }

  /**
   * Mirrors the chosen state where a stylesheet can select on it.
   *
   * **A custom state, never a reflected `selected` attribute.** The parent
   * writes this: a listbox choosing a row, a tab strip moving the tab, a radio
   * group answering for its set. Reflected, that puts the element's own
   * bookkeeping onto markup a consumer wrote and a consumer's server never sent,
   * which React reconciles and reports as a mismatch, and which a serialized
   * element pasted back declares as a choice nobody made. `ElementInternals`
   * holds it instead, where it is not in the DOM at all.
   *
   * Reading `selected` is unaffected and so is writing it: the attribute still
   * seeds the property, which is what `<helix-headless-tree-item selected>` in
   * a consumer's markup means. What stops is the write back.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('selected', this.selected)
    if (this.childrenKnown) {
      this.branch = this.knownChildren.some((child) => child.slot === 'children')
    }
  }

  protected override render(): TemplateResult {
    /* Where the semantics sit, which `href` decides.
     *
     * A link row carries them itself and the wrapper drops to `none`, because
     * an anchor cannot contain the group: the group holds more anchors and
     * nesting them is invalid markup that no assistive technology reads the way
     * it looks. So the row becomes the `treeitem` and the group becomes its
     * sibling, which is the navigation flavor of the pattern.
     *
     * Without one, nothing changes: the wrapper is the `treeitem` and holds the
     * group, which is what an `<li>` holding a `<ul>` is. */
    const linked = this.href !== ''
    /* The indent falls back to one, because a row has to be drawn somewhere and
       the outermost column is where an uncounted row belongs. */
    const level = this.level ?? 1
    /* **`aria-level` does not, because a depth is a claim and `1` is the wrong
       one.** The tree counts a row's ancestors to assign `level`, and a server
       has no tree to walk: it served `aria-level="1"` on all fourteen rows of a
       three-deep example, so a screen reader was told a flat list where the
       markup holds a nested one. Absent is "unknown", which is the answer this
       library reaches for everywhere else and the one `Data Table`'s own server
       spec argues for `aria-colcount` in the same words: a reader told nothing
       falls back to the structure, and the structure is right here, each nested
       row sitting inside its parent's `group` in the flattened tree. A reader
       told `1` has been overruled with something false.

       `TreeRoot.syncItems` writes the depth through `whenHydrated`, so the
       render after hydration is what fills this in. */
    const depth = this.level ?? nothing
    const expanded = this.branch ? (this.open ? 'true' : 'false') : nothing
    /* **A render the tree has not reached holds the stop open.** `focusable` is
       the tree's word and the tree reads its rows to say it, so on a server no
       row has it and a bare `'-1'` served a tree the keyboard could not enter
       at all. Untold, every row is a stop, which is what a document with no
       script does anyway, there being no arrow keys to move a single stop with
       until one arrives. `childrenKnown` is the test `FilterInput.Chip` uses in
       the same words, a server and the render that has to be its, so a browser
       draws what it drew before. */
    const tabIndex = this.focusable || !this.childrenKnown ? '0' : '-1'

    return html`<div
        part="item"
        role=${linked ? 'none' : 'treeitem'}
        aria-expanded=${linked ? nothing : expanded}
        aria-selected=${linked ? nothing : this.selected ? 'true' : 'false'}
        aria-level=${linked ? nothing : depth}
        tabindex=${linked ? nothing : tabIndex}
      >
        ${
          linked
            ? html`<a
                part="row"
                role="treeitem"
                href=${this.href}
                target=${this.target || nothing}
                rel=${this.rel || nothing}
                aria-expanded=${expanded}
                aria-selected=${this.selected ? 'true' : 'false'}
                aria-level=${depth}
                tabindex=${tabIndex}
                style="--tree-level: ${level}"
                @click=${this.handleRowClick}
              >${this.renderRow()}</a>`
            : html`<div
                part="row"
                style="--tree-level: ${level}"
                @click=${this.handleRowClick}
              >${this.renderRow()}</div>`
        }
        <!-- Inside the treeitem, not beside it. As a sibling, the row's
             \`aria-expanded\` describes a group the row does not own and the
             branch reports children it has no relationship to. The pattern is
             \`treeitem\` containing \`group\`, which is also what an \`<li>\`
             holding a \`<ul>\` is. -->
        <div part="group" role="group" ?hidden=${!this.open}>
          <slot name="children"></slot>
        </div>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tree-item': HelixHeadlessTreeItem
  }
}
