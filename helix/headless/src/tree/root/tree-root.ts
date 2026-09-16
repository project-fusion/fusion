import {
  closestInstance,
  customElement,
  HelixElement,
  inlineStep,
  MixinCollection,
  MixinControllerActive,
  scrollItemIntoView,
} from '@fusion.dev/helix-core'
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
 * @event {HelixActivateEvent} helix-activate - Fired once the current one has moved, so the element already holds it.
 * @event {HelixBeforeActivateEvent} helix-before-activate - Fired before the current node moves, and cancelable. The only way to refuse one.
 * @event {HelixSelectEvent} helix-select - Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart empty - Shown when there are no rows to show.
 * @csspart loading - Shown while the rows are still on their way.
 * @csspart tree - The tree container.
 */
@customElement('helix-headless-tree')
export class HelixHeadlessTree extends MixinCollection(MixinControllerActive(HelixElement)) {
  /**
   * Accessible name for the tree.
   */
  @property()
  label = 'Tree'

  /**
   * Whether a nested row is a peer of the row above it or subordinate to it.
   *
   * Both answers are right, for different trees, which is why this is asked
   * rather than decided. `peer` is a file explorer: every row is the same kind
   * of thing, a name that may hold more names, and the indent alone says where
   * one sits. `subordinate` is side navigation or a categorization: a section
   * holds pages and a facet holds values, so a step inward is a change of kind
   * and the rows say so.
   *
   * On the root rather than the item, because it is a fact about the tree. Set
   * per row it would make a tree writable in which one branch ranks its
   * children and the next does not, and it would have to be repeated on every
   * row to say one thing.
   *
   * Here rather than on the styled tier, because it is not about paint: with
   * every stylesheet deleted it is still true that this tree ranks its depths
   * and a file explorer does not. The styled tier steps a subordinate row once
   * down the type scale; a headless consumer reads the attribute and the
   * `--tree-level` each row carries, and draws the rank however they like.
   *
   * **Optional, with no default**, per the reflected-property rule: a value
   * written here appears in the served markup of every tree anybody renders.
   * The resting state is the absence of the attribute, which is `peer`.
   */
  @property({ reflect: true })
  nesting?: 'peer' | 'subordinate'

  private watcher: MutationObserver | undefined

  /**
   * Every item, in the order a reader moving down would meet them.
   *
   * Selected by tag, never by `'*'` and a filter: this is the array a single
   * arrow press rebuilds, and `'*'` makes it every descendant element in the
   * tree, labels and icons and whatever a consumer slotted into a row included.
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

  /* Through the mixin, so a consumer can refuse the change. Writing the value
     straight from the event makes `helix-before-activate` an announcement
     nobody can answer. */
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
       to the first item. No disabled rows are skipped, because `Tree.Item` is
       the only selectable row in the library with no `disabled` property. */
    const chosen = this.resolveActive(visible)
    /* The keyboard keeps its place: the stop moves only when the row holding it
       is no longer reachable. Bound to the selection instead, a branch opening
       or a child arriving throws the reader back to the selected row from
       wherever they had arrowed to. */
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
    /* And bring it into view, or focus lands below the fold and the tree stays
       where it is.

       Not `scrollIntoView`, which scrolls every scrollable ancestor including
       the page. A reader who pressed Down in a sidebar did not ask the document
       to move. */
    scrollItemIntoView(item, { padding: 4 })
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    /* The innermost item the press came from, which `find` cannot give.
     *
     * `items` is every tree item in document order and a nested one is inside
     * all of its ancestors, so `entry.contains(target)` matches the outermost
     * ancestor first and every key pressed on a nested node moves the root of
     * its branch instead. The shallow cases all look right.
     *
     * `closestInstance` walks up by identity and crosses shadow roots on the
     * way, which is the util that exists for exactly this. `closest('*')` is a
     * no-op: it returns the element it was called on. */
    const current = closestInstance(event.target as Element | null, HelixHeadlessTreeItem)
    if (!current || !this.items.includes(current) || !KEYS.has(event.key)) {
      return
    }

    /* In and out are along the line, which is where a shut branch's chevron
       points: right on a left-to-right page and left on a right-to-left one,
       so the key that opens a branch is the one its chevron points along. */
    const along = inlineStep(this, event.key)

    if (event.key === 'ArrowDown') {
      this.move(current, 1)
    } else if (event.key === 'ArrowUp') {
      this.move(current, -1)
    } else if (event.key === 'Home') {
      this.focusOn(this.visibleItems[0])
    } else if (event.key === 'End') {
      this.focusOn(this.visibleItems.at(-1))
    } else if (along === 1) {
      // Open a closed branch, then step into it. Two presses rather than one
      // that does both, which is what the pattern specifies.
      if (current.isBranch && !current.open) {
        current.requestOpen(true)
        this.syncItems()
      } else if (current.isBranch) {
        this.move(current, 1)
      }
    } else if (along === -1) {
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
        /* `activate`, not `select`. Announcing the choice and stopping there
           leaves a tree used as navigation walkable with the arrows and never
           enterable: the pointer has a link under it and the keyboard has
           nothing. */
        current.activate()
      }
    }

    event.preventDefault()
  }

  /**
   * A branch opened or closed, whoever did it.
   *
   * Listening for the item's own open events rather than calling `syncItems`
   * from each keyboard path: that misses the pointer, and collapsing a branch
   * by clicking its chevron then leaves the tree's one tab stop on a row inside
   * the subtree just hidden. It also covers a consumer setting `open` directly.
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
       root's `slotchange` never fires for them: without this, a subtree
       rendered after first paint gets no `level`, no `selected` and no
       `focusable`, and sits at the wrong indent with no way into it. A
       framework filling a branch on demand is exactly that case. */
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
