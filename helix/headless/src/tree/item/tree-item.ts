import { customElement, HelixElement, HelixSelectionChangeEvent } from '@helix-io/core'
import { caretDown } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One node in a tree.
 *
 * @description
 * An element rather than a slot because it owns state: whether it is expanded,
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
 *
 * @csspart item - The node, and the focus target.
 * @csspart row - The clickable label row.
 * @csspart toggle - The expand and collapse control.
 * @csspart label - The label text.
 * @csspart group - The container for nested items.
 *
 * @event {HelixSelectionChangeEvent} SelectionChange - Fired when the item is chosen.
 */
@customElement('helix-base-tree-item')
export class HelixBaseTreeItem extends HelixElement {
  /** Identifies the item to the consumer, carried in `SelectionChange`. */
  @property()
  value = ''

  /** Whether this item is the current one. */
  @property({ reflect: true, type: Boolean })
  selected = false

  /** Whether a branch is showing its children. */
  @property({ reflect: true, type: Boolean })
  expanded = false

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
    this.dispatchEvent(new HelixSelectionChangeEvent({ value: this.value }))
  }

  private readonly handleRowClick = (): void => {
    if (this.branch) {
      this.expanded = !this.expanded
      return
    }
    this.select()
  }

  protected override render(): TemplateResult {
    return html`<div
        part="item"
        role="treeitem"
        aria-expanded=${this.branch ? (this.expanded ? 'true' : 'false') : nothing}
        aria-selected=${this.selected ? 'true' : 'false'}
        aria-level=${this.level ?? 1}
        tabindex=${this.focusable ? '0' : '-1'}
      >
        <div
          part="row"
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
          <span part="label"><slot></slot></span>
        </div>
      </div>
      <div part="group" role="group" ?hidden=${!this.expanded}>
        <slot name="children"></slot>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-tree-item': HelixBaseTreeItem
  }
}
