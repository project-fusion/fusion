import { customElement, HelixElement, HelixSelectEvent, MixinControllerOpen } from '@helix-io/core'
import { caretDown } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One node in a tree.
 *
 * @description
 * **`open`, on `MixinControllerOpen`, where it was a bare `expanded` boolean.**
 * A branch showing its children is the same state a disclosure holds, and
 * `AccordionItem` has been on that mixin all along. Written here by hand it had
 * neither half of what the mixin gives: `this.expanded = !this.expanded`
 * announced nothing, so a consumer could not know a branch had opened, and
 * could not own the state either. `aria-expanded` is still what the row
 * renders, because that is the attribute a tree uses; the property is what
 * changed, not the semantics.
 *
 * An element rather than a slot because it owns state: whether it is open,
 * whether it is selected, and whether it is the one holding focus.
 *
 * A branch is any item with something slotted into `children`, detected in
 * `firstUpdated` rather than declared by the consumer. That is a client-side
 * enhancement by necessity, since the server cannot inspect children, so the
 * server renders the node as a leaf and the twisty appears on hydration. It
 * appears rather than disappearing, which is the harmless direction.
 *
 * **`href` makes the row itself the link.** A tree used as navigation is a list
 * of links, and the row is what a reader presses: with the anchor slotted into
 * the name instead, everything outside the words is dead, Enter does nothing,
 * and there is no middle-click, no status bar and no open-in-new-tab. Given an
 * `href` the row *is* an `<a>`, so the platform provides all of that and the
 * keyboard needs no handler at all.
 *
 * It changes the shape of the ARIA, which is why it is a property and not the
 * default. An anchor cannot contain the group, since the group holds more
 * anchors and nesting them is invalid, so the row carries `treeitem` and the
 * group becomes its sibling under a presentational wrapper. That is exactly the
 * navigation flavor of the tree pattern, and the arrangement without an `href`
 * stays as it was: `treeitem` containing `group`, which is what an `<li>`
 * holding a `<ul>` is.
 *
 * A consumer whose framework owns routing slots its own link instead and leaves
 * `href` unset. The row follows that one too, so the whole row works either
 * way; what the anchor adds is what only a real anchor can give.
 *
 * The properties below are written by this component and read by whoever draws
 * it. A consumer sets none of them: they carry a number this element computed
 * and CSS cannot, which is what lets a stylesheet on this tier draw the thing
 * without measuring anything itself.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases TreeNode, Branch, Leaf
 * @documentation https://helix.fusion.dev/components/tree
 *
 * @slot - The item's label.
 * @slot children - Nested items, which make this a branch.
 * @slot start - Before the label, after the chevron. A mark about the item.
 * @slot end - After the label, at the row's far side. A count, or a state.
 *
 * @csspart item - The node, and the focus target unless `href` moves it to the row.
 * @csspart row - The clickable label row, which is an `<a>` where `href` is set.
 * @csspart toggle - The expand and collapse control.
 * @csspart label - The label text.
 * @csspart group - The container for nested items.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the item is chosen.
 * @event {HelixOpenEvent} helix-open - Fired before a branch opens, and cancelable.
 * @event {HelixCloseEvent} helix-close - Fired before a branch closes, and cancelable.
 *
 * @cssproperty --tree-level - How deep this row sits, counting from zero, for the indent.
 */
@customElement('helix-headless-tree-item')
export class HelixHeadlessTreeItem extends MixinControllerOpen(HelixElement) {
  /** Identifies the item to the consumer, carried in `helix-select`. */
  @property()
  value = ''

  /**
   * Where this node goes, which makes its row a real link.
   *
   * Unset by default, and unreflected: a tree of choosable nodes is not a tree
   * of links, and an empty `href` written onto every row would be a link to the
   * current page on every item a consumer never asked to be one.
   */
  @property()
  href = ''

  /** Where the link opens, for the rare row that leaves the site. */
  @property()
  target = ''

  /**
   * What the link declares about where it goes.
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
   * Not reflected, for the reason `level` below gives in full: the tree assigns
   * this after it upgrades, so the attribute would be a change to markup the
   * consumer rendered and hydration would report it. It reflected, one line
   * from the paragraph saying why it must not.
   *
   * The stylesheet reads it from the row inside this shadow root, which is the
   * answer `level` gives one paragraph down: the indent it drives is written
   * onto the row rather than onto the host, because the row is not part of the
   * tree React hydrates. Mirroring to `data-selected` on the host instead was
   * the same fault with a different name, and React said so.
   */
  @property({ type: Boolean })
  selected = false

  /**
   * Depth from the root, set by the tree so indentation needs no CSS nesting.
   *
   * Not reflected. The tree assigns this after it upgrades, so an attribute
   * here would be a change to markup the consumer rendered and hydration would
   * report it. The indent it drives is written onto the row instead, inside the
   * shadow root, which is not part of the tree React hydrates.
   */
  @property({ attribute: 'level', type: Number })
  level?: number

  /** Whether this item holds the tree's single tab stop. */
  @state()
  focusable = false

  /** Whether anything is slotted into `children`. Read after first render. */
  @state()
  private branch = false

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="children"]')
    this.branch = (slot?.assignedElements().length ?? 0) > 0
    slot?.addEventListener('slotchange', () => {
      this.branch = slot.assignedElements().length > 0
    })
  }

  /**
   * @internal Read by the tree to identify a branch across the light DOM,
   * which is cheaper than `instanceof` and is why this is public rather than
   * protected. A consumer asks `branch`, which is the property they set.
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
       without this the careful call was arriving after the thing it exists to
       prevent had already happened. It was also hiding whether that util worked
       at all: measured in Chrome, a tree in a scroller scrolled either way, so
       the util could have been scrolling nothing and nobody would have seen. */
    this.renderRoot
      .querySelector<HTMLElement>(this.href === '' ? '[part="item"]' : '[part="row"]')
      ?.focus({ preventScroll: true })
  }

  /** Selects this node and announces it. */
  select(): void {
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  /**
   * Chooses this node the way a reader does, from a press or from Enter.
   *
   * Selecting and following are two things and this is where they meet, so the
   * pointer and the keyboard take one path to the same end. The tree calls this
   * rather than `select` for the keyboard, which is what fixes Enter: a nav
   * tree whose rows are links could be walked with the arrows and not entered,
   * because choosing announced a value and nothing listened for it.
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
       runs. It was asked on one side and not the other, and the missing half
       cost a feature: a row can hold a link in its `end` slot, which is what
       the documentation sidebar puts there to get back to the index, and
       pressing it collapsed the branch on the way out. Measured in Chrome,
       `open` false and the route changed from the one press.

       "There is nowhere else for the press to mean" was true of a row holding
       a label, and a slot is somewhere else. */
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
     * group, which is what an `<li>` holding a `<ul>` is, and what this was
     * fixed to be when the group rendered outside the node it belonged to. */
    const linked = this.href !== ''
    const level = this.level ?? 1
    const expanded = this.branch ? (this.open ? 'true' : 'false') : nothing
    const tabIndex = this.focusable ? '0' : '-1'

    return html`<div
        part="item"
        role=${linked ? 'none' : 'treeitem'}
        aria-expanded=${linked ? nothing : expanded}
        aria-selected=${linked ? nothing : this.selected ? 'true' : 'false'}
        aria-level=${linked ? nothing : level}
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
                aria-level=${level}
                tabindex=${tabIndex}
                data-selected=${this.selected ? '' : nothing}
                style="--tree-level: ${level}"
                @click=${this.handleRowClick}
              >${this.renderRow()}</a>`
            : html`<div
                part="row"
                data-selected=${this.selected ? '' : nothing}
                style="--tree-level: ${level}"
                @click=${this.handleRowClick}
              >${this.renderRow()}</div>`
        }
        <!-- Inside the treeitem, not beside it. It rendered as a sibling, so
             the row's \`aria-expanded\` described a group the row did not own and
             the branch reported children it had no relationship to. The pattern
             is \`treeitem\` containing \`group\`, which is also what an \`<li>\`
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
