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

  private readonly handleRowClick = (): void => {
    if (this.branch) {
      this.toggleOpen()
      return
    }
    this.select()
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
