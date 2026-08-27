import {
  closestInstance,
  customElement,
  HelixElement,
  MixinCollection,
  MixinControllerActive,
  scrollItemIntoView,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessTreeItem } from '../item/tree-item.js'

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
 * @category navigation
 * @aliases FileTree, Navigation tree
 * @documentation https://helix.fusion.dev/components/tree
 *
 * @slot - The tree's items.

 *
 * @csspart tree - The tree container.
 * @csspart empty - Shown when there are no rows to show.
 * @csspart loading - Shown while the rows are still on their way.
 *
 * @event {HelixChangeEvent} helix-change - Fired before the current node moves, and cancelable. The only way to refuse one.
 * @event {HelixSelectEvent} helix-select - Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to.
 */
@customElement('helix-headless-tree')
export class HelixHeadlessTree extends MixinCollection(MixinControllerActive(HelixElement)) {
  /** Accessible name for the tree. */
  @property()
  label = 'Tree'

  private watcher: MutationObserver | undefined

  /**
   * Every item, in the order a reader moving down would meet them.
   *
   * Selected by tag rather than by walking everything and filtering. `'*'` built
   * an array of every descendant element in the tree, labels and icons and
   * whatever a consumer slotted into a row included, and threw most of it away;
   * on a tree of any size that is the array a single arrow press rebuilds.
   *
   * The two tag names rather than `instanceof` on everything: a styled
   * `helix-tree-item` extends the base, so both names are needed, and the
   * `instanceof` stays as the type guard because a consumer can write either
   * tag and neither selector proves what the element is.
   */
  private get items(): HelixHeadlessTreeItem[] {
    return [...this.querySelectorAll('helix-tree-item, helix-headless-tree-item')].filter(
      (node): node is HelixHeadlessTreeItem => node instanceof HelixHeadlessTreeItem,
    )
  }

  /** Items a reader can actually reach: not inside a collapsed branch. */
  private get visibleItems(): HelixHeadlessTreeItem[] {
    return this.items.filter((item) => {
      let parent = item.parentElement
      while (parent && parent !== this) {
        if (parent instanceof HelixHeadlessTreeItem && !parent.open) {
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
    /* Through the mixin, which resolves an exact match and otherwise falls back
       to the first item. The comment here used to add "which skips a disabled
       one", and a tree item has no `disabled` property at all, so the claim was
       about a check that could not be running. `Tree.Item` is the only
       selectable row in the library without one, which is worth knowing and is
       not this line's business to fix. */
    const chosen = this.resolveActive(visible)
    /* The keyboard keeps its place. The stop was bound to the selection on
       every sync, so a branch opening or a child arriving threw the reader back
       to the selected row from wherever they had arrowed to. It only moves when
       the row holding it is no longer reachable. */
    const held = visible.find((item) => item.focusable)
    const stop = held ?? chosen

    for (const item of this.items) {
      item.selected = item.value !== '' && item.value === this.active
      item.focusable = item === stop
      let level = 1
      let parent = item.parentElement
      while (parent && parent !== this) {
        if (parent instanceof HelixHeadlessTreeItem) {
          level += 1
        }
        parent = parent.parentElement
      }
      item.level = level
    }
  }

  private move(from: HelixHeadlessTreeItem, delta: number): void {
    const visible = this.visibleItems
    const index = visible.indexOf(from)
    const next = visible[Math.min(visible.length - 1, Math.max(0, index + delta))]
    this.focusOn(next)
  }

  private focusOn(item: HelixHeadlessTreeItem | undefined): void {
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
    /* The innermost item the press came from, which `find` could not give.
     *
     * `items` is every tree item in document order and a nested one is inside
     * all of its ancestors, so `entry.contains(target)` matched the outermost
     * ancestor first: every key pressed on a nested node moved the root of its
     * branch instead. The deeper the node, the further the answer was wrong,
     * and the shallow cases it was written against all looked right.
     *
     * `closestInstance` walks up by identity and crosses shadow roots on the
     * way, which is the util that exists for exactly this. `closest('*')` was
     * also a no-op: it returns the element it was called on. */
    const current = closestInstance(event.target as Element | null, HelixHeadlessTreeItem)
    if (!current || !this.items.includes(current) || !KEYS.has(event.key)) {
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
      if (current.isBranch && !current.open) {
        current.requestOpen(true)
        this.syncItems()
      } else if (current.isBranch) {
        this.move(current, 1)
      }
    } else if (event.key === 'ArrowLeft') {
      if (current.isBranch && current.open) {
        current.requestOpen(false)
        this.syncItems()
      } else {
        const parent = closestInstance(current.parentElement, HelixHeadlessTreeItem)
        this.focusOn(parent instanceof HelixHeadlessTreeItem ? parent : undefined)
      }
    } else {
      if (current.isBranch) {
        current.toggleOpen()
        this.syncItems()
      } else {
        /* `activate`, not `select`. Enter announced the choice and stopped
           there, so a tree used as navigation could be walked with the arrows
           and never entered: the pointer had a link under it to press and the
           keyboard had nothing. */
        current.activate()
      }
    }

    event.preventDefault()
  }

  /**
   * A branch opened or closed, whoever did it.
   *
   * The keyboard paths called `syncItems` by hand and the pointer path did not,
   * so collapsing a branch by clicking its chevron left the tab stop on a row
   * inside the subtree that had just been hidden: the tree kept its one stop
   * and the stop was on something nobody could see or reach. Listening for the
   * item's own open events covers every way a branch can move, including a
   * consumer setting `open` directly.
   */
  private readonly handleBranch = (): void => {
    this.syncItems()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelection)
    this.addEventListener('helix-before-open', this.handleBranch)
    this.addEventListener('helix-before-close', this.handleBranch)
    this.addEventListener('keydown', this.handleKeydown)
    /* Nested items arrive on a *branch's* slot, not on this element's, so the
       root's `slotchange` never fires for them: a subtree rendered after first
       paint got no `level`, no `selected` and no `focusable`, and sat at the
       wrong indent with no way into it. A framework filling a branch on demand,
       which is what a lazy tree is, hit this every time. */
    this.watcher = new MutationObserver(() => this.syncItems())
    this.watcher.observe(this, { childList: true, subtree: true })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection)
    this.removeEventListener('helix-before-open', this.handleBranch)
    this.removeEventListener('helix-before-close', this.handleBranch)
    this.removeEventListener('keydown', this.handleKeydown)
    this.watcher?.disconnect()
    this.watcher = undefined
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
    return html`<div
      part="tree"
      role="tree"
      aria-busy=${this.loading ? 'true' : nothing}
      aria-label=${this.label}
    >
      <slot
        @slotchange=${(event: Event) => {
          this.countRows(event)
          this.syncItems()
        }}
      ></slot>
      ${this.renderStatus(this.hasRows)}
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tree': HelixHeadlessTree
  }
}
