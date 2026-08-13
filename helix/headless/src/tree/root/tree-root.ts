import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixBaseTreeItem } from '../item/tree-item.js'

/** Keys the tree handles, per the APG tree pattern. */
const KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'ArrowRight',
  'ArrowLeft',
  'Home',
  'End',
  'Enter',
  ' ',
])

/**
 * @summary A tree of items, navigable entirely from the keyboard.
 *
 * @description
 * Focus is a single tab stop, moved with the arrow keys, which is what the tree
 * pattern requires: a sidebar of forty items should not be forty presses of Tab
 * to get past. The tree owns which item is the tab stop and moves it as focus
 * moves, so the browser's own focus order is never fought with.
 *
 * Items are found with `instanceof`, never by tag name, so the headless tier
 * does not learn about the styled one.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases FileTree, Navigation tree
 * @documentation https://helix.fusion.dev/components/tree
 *
 * @slot - The tree's items.
 *
 * @csspart tree - The tree container.
 *
 * @event {HelixSelectionChangeEvent} SelectionChange - Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to.
 */
@customElement('helix-base-tree')
export class HelixBaseTree extends HelixElement {
  /** Accessible name for the tree. */
  @property()
  label = 'Tree'

  /** Value of the selected item, kept in step with the items themselves. */
  @property()
  value = ''

  /** Every item, in the order a reader moving down would meet them. */
  private get items(): HelixBaseTreeItem[] {
    return [...this.querySelectorAll('*')].filter(
      (node): node is HelixBaseTreeItem => node instanceof HelixBaseTreeItem,
    )
  }

  /** Items a reader can actually reach: not inside a collapsed branch. */
  private get visibleItems(): HelixBaseTreeItem[] {
    return this.items.filter((item) => {
      let parent = item.parentElement
      while (parent && parent !== this) {
        if (parent instanceof HelixBaseTreeItem && !parent.expanded) {
          return false
        }
        parent = parent.parentElement
      }
      return true
    })
  }

  private readonly handleSelection = (event: Event): void => {
    this.value = (event as CustomEvent<{ value: string }>).detail.value
    this.syncItems()
  }

  /**
   * Pushes tree-owned state down: which item is selected, which holds the tab
   * stop, and how deep each one sits.
   *
   * Depth is computed here rather than by each item counting its own ancestors,
   * so an item moved in the tree gets the right indent without knowing it moved.
   */
  private syncItems(): void {
    const visible = this.visibleItems
    const active = visible.find((item) => item.value === this.value) ?? visible[0]

    for (const item of this.items) {
      item.selected = item.value !== '' && item.value === this.value
      item.focusable = item === active
      let level = 1
      let parent = item.parentElement
      while (parent && parent !== this) {
        if (parent instanceof HelixBaseTreeItem) {
          level += 1
        }
        parent = parent.parentElement
      }
      item.level = level
    }
  }

  private move(from: HelixBaseTreeItem, delta: number): void {
    const visible = this.visibleItems
    const index = visible.indexOf(from)
    const next = visible[Math.min(visible.length - 1, Math.max(0, index + delta))]
    this.focusOn(next)
  }

  private focusOn(item: HelixBaseTreeItem | undefined): void {
    if (!item) {
      return
    }
    for (const entry of this.items) {
      entry.focusable = entry === item
    }
    item.focusItem()
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const item = (event.target as Element | null)?.closest('*')
    const current = this.items.find((entry) => entry === item || entry.contains(item as Node))
    if (!current || !KEYS.has(event.key)) {
      return
    }

    if (event.key === 'ArrowDown') {
      this.move(current, 1)
    } else if (event.key === 'ArrowUp') {
      this.move(current, -1)
    } else if (event.key === 'Home') {
      this.focusOn(this.visibleItems[0])
    } else if (event.key === 'End') {
      this.focusOn(this.visibleItems.at(-1))
    } else if (event.key === 'ArrowRight') {
      // Open a closed branch, then step into it. Two presses rather than one
      // that does both, which is what the pattern specifies.
      if (current.isBranch && !current.expanded) {
        current.expanded = true
        this.syncItems()
      } else if (current.isBranch) {
        this.move(current, 1)
      }
    } else if (event.key === 'ArrowLeft') {
      if (current.isBranch && current.expanded) {
        current.expanded = false
        this.syncItems()
      } else {
        const parent = current.parentElement?.closest('helix-base-tree-item, helix-tree-item')
        this.focusOn(parent instanceof HelixBaseTreeItem ? parent : undefined)
      }
    } else {
      if (current.isBranch) {
        current.expanded = !current.expanded
        this.syncItems()
      } else {
        current.select()
      }
    }

    event.preventDefault()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('SelectionChange', this.handleSelection)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('SelectionChange', this.handleSelection)
    this.removeEventListener('keydown', this.handleKeydown)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.syncItems()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('value')) {
      this.syncItems()
    }
  }

  protected override render(): TemplateResult {
    return html`<div part="tree" role="tree" aria-label=${this.label}>
      <slot @slotchange=${() => this.syncItems()}></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-tree': HelixBaseTree
  }
}
