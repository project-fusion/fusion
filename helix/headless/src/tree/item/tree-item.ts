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
 * @csspart item - The node, and the focus target.
 * @csspart row - The clickable label row.
 * @csspart toggle - The expand and collapse control.
 * @csspart label - The label text.
 * @csspart group - The container for nested items.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the item is chosen.
 * @event {HelixOpenEvent} helix-open - Fired before a branch opens, and cancelable.
 * @event {HelixCloseEvent} helix-close - Fired before a branch closes, and cancelable.
 */
@customElement('helix-base-tree-item')
export class HelixBaseTreeItem extends MixinControllerOpen(HelixElement) {
  /** Identifies the item to the consumer, carried in `helix-select`. */
  @property()
  value = ''

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

  /** Whether this node has children. */
  get isBranch(): boolean {
    return this.branch
  }

  /** Moves focus to this node. */
  focusItem(): void {
    this.renderRoot.querySelector<HTMLElement>('[part="item"]')?.focus()
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

  private readonly handleRowClick = (event: MouseEvent): void => {
    if (this.branch) {
      this.toggleOpen()
      return
    }
    this.select()
    /* Unless the press already landed on the link, which would follow it twice
       and, where a consumer's router is listening, route twice. */
    if (!event.composedPath().some((node) => node instanceof HTMLAnchorElement)) {
      this.follow()
    }
  }

  protected override render(): TemplateResult {
    return html`<div
        part="item"
        role="treeitem"
        aria-expanded=${this.branch ? (this.open ? 'true' : 'false') : nothing}
        aria-selected=${this.selected ? 'true' : 'false'}
        aria-level=${this.level ?? 1}
        tabindex=${this.focusable ? '0' : '-1'}
      >
        <div
          part="row"
          data-selected=${this.selected ? '' : nothing}
          style="--_tree-level: ${this.level ?? 1}"
          @click=${this.handleRowClick}
        >
          ${
            this.branch
              ? html`<svg part="toggle" fill="currentColor" viewBox=${caretDown.viewBox} aria-hidden="true">
                ${unsafeSVG(caretDown.content)}
              </svg>`
              : nothing
          }
          <slot name="start"></slot>
          <span part="label"><slot></slot></span>
          <slot name="end"></slot>
        </div>
        <!-- Inside the treeitem, not beside it. It rendered as a sibling, so
             the row's \`aria-expanded\` described a group the row did not own and
             the branch reported children it had no relationship to. The pattern
             is \`treeitem\` containing \`group\`, which is also what an \`<li>\`
             holding a \`<ul>\` is. -->
        <div part="group" role="group" ?hidden=${!this.open}>
          <slot name="children"></slot>
        </div>
      </div>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-tree-item': HelixBaseTreeItem
  }
}
