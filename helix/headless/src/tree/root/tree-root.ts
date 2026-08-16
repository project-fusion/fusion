import {
  customElement,
  HelixElement,
  MixinControllerActive,
  scrollItemIntoView,
} from '@helix-io/core'
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
 * @event {HelixSelectEvent} helix-select - Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to.
 */
@customElement('helix-base-tree')
export class HelixBaseTree extends MixinControllerActive(HelixElement) {
  /**
   * Which end of a row the chevron sits at.
   *
   * Unset is the start, which is what a tree of folders looks like. `end` puts
   * it at the far side, where it reads as a control belonging to the row rather
   * than as part of the name, and it lets every label start at one place
   * without a row that has no chevron reserving space for one.
   *
   * On the tree rather than on each item, because a row whose chevron sat
   * somewhere different from its siblings' would be a mistake, not a choice.
   */
  @property({ reflect: true })
  chevron?: 'end'

  /** Accessible name for the tree. */
  @property()
  label = 'Tree'

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

  /* Through the mixin, so a consumer can refuse the change. It was written
     straight from the event, the same way Tabs did, which made `helix-change`
     an announcement nobody could answer. */
  private readonly handleSelection = (event: Event): void => {
    this.requestActive((event as CustomEvent<{ value: string }>).detail.value)
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
    /* Through the mixin, which skips a disabled item in the fallback. The
       hand-written version took the first whatever it was, so a tree opening on
       a disabled item made it the tab stop. */
    const active = this.resolveActive(visible)

    for (const item of this.items) {
      item.selected = item.value !== '' && item.value === this.active
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
    /* And bring it into view, which arrow keys through a long tree did not do
       at all: focus moved to an item below the fold and the tree stayed where
       it was, so a reader navigating a sidebar of forty items was moving
       something they could not see.
 
       Not `scrollIntoView`, which scrolls every scrollable ancestor including
       the page. A reader who pressed Down in a sidebar did not ask the document
       to move. */
    scrollItemIntoView(item, { padding: 4 })
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
    this.addEventListener('helix-select', this.handleSelection)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection)
    this.removeEventListener('keydown', this.handleKeydown)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.syncItems()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('active')) {
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
